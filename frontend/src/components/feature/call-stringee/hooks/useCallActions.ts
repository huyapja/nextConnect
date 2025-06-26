import { useCallback } from 'react'
import { toast } from 'sonner'
import { CallStatus, CallType, CallHistoryStatus } from '../types'
import { checkDeviceAvailability } from '../utils/callLogic'
import { initAudioContext } from '../utils/stringeeAudio'

interface UseCallActionsProps {
  // State setters
  setGlobalIsInCall: (inCall: boolean) => void
  setCallHistorySaved: (saved: boolean) => void
  setIsEndingCall: (ending: boolean) => void
  setCall: (call: any) => void
  setIncoming: (incoming: any) => void
  setCallStatus: (status: CallStatus) => void
  setCurrentSessionId: (id: string | null) => void
  setIsCallConnected: (connected: boolean) => void
  setHasRemoteVideo: (hasVideo: boolean) => void
  setHasRemoteAudio: (hasAudio: boolean) => void
  setVideoUpgradeRequest: (request: any) => void
  setCallerUserName: (name: string) => void
  setIsVideoCall: (isVideo: boolean) => void
  setIsLocalVideoEnabled: (enabled: boolean) => void
  setShowDetailedStats: (show: boolean) => void
  setProgressKey: (key: number | ((prev: number) => number)) => void
  
  // Current state
  call: any
  incoming: any
  isVideoCall: boolean
  isCallConnected: boolean
  callStatus: CallStatus
  callHistorySaved: boolean
  isEndingCall: boolean
  callDuration: number
  currentSessionId: string | null
  data: any
  toUserId: string
  client: any
  isGlobalCall: boolean
  isLocalVideoEnabled: boolean
  onClose?: () => void
  
  // Refs
  callTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
  localStreamRef: React.MutableRefObject<MediaStream | null>
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  remoteAudioRef: React.RefObject<HTMLAudioElement>
  ringbackAudioRef: React.RefObject<HTMLAudioElement>
  phoneRingRef: React.RefObject<HTMLAudioElement>
  
  // Functions
  saveCallHistoryToChat: (callType: CallType, callStatus: CallHistoryStatus, duration?: number) => Promise<void>
  setupCallEvents: (callObj: any) => void
  stopAllAudio: () => void
  stopAllAudioWithRefs: () => void
  stopNetworkMonitoring: () => void
  performAudioCleanup: () => void
  forceStopAllMediaStreams: () => void
  
  // API calls
  updateCallStatus: (params: any) => Promise<any>
  createCallSession: (params: any) => Promise<any>
  checkUserBusyStatus: (params: any) => Promise<any>
  sendVideoUpgradeRequest: (params: any) => Promise<any>
  respondVideoUpgrade: (params: any) => Promise<any>
  sendVideoStatus: (params: any) => Promise<any>
}

export function useCallActions(props: UseCallActionsProps) {
  const makeCall = useCallback(async (isVideoCall: boolean = true) => {
    // Kiểm tra điều kiện trước khi thay đổi state
    if (!props.client || !props.data?.message.user_id || !props.toUserId || !(window as any).StringeeCall2) {
      console.error('❌ Cannot make call - missing requirements')
      return
    }

    if (props.data.message.user_id === props.toUserId) {
      toast.error('Bạn không thể gọi cho chính mình')
      return // Return sớm mà không thay đổi state
    }

    // Chỉ set state khi đã pass validation
    props.setGlobalIsInCall(true)
    initAudioContext()

    try {
      const busyResult = await props.checkUserBusyStatus({ user_id: props.toUserId })
      if (busyResult?.is_busy) {
        toast.error('Người dùng đang trong cuộc gọi khác')
        props.setGlobalIsInCall(false) // Reset state
        return
      }
    } catch (error) {
      console.warn('⚠️ Could not check busy status, proceeding with call:', error)
    }

    const deviceAvailable = await checkDeviceAvailability(isVideoCall)
    if (!deviceAvailable) {
      console.log('❌ Device check failed - canceling call')
      props.setGlobalIsInCall(false) // Reset state
      return
    }

    try {
      const sessionResult = await props.createCallSession({
        from_user: props.data.message.user_id,
        to_user: props.toUserId,
        call_type: isVideoCall ? 'video' : 'audio'
      })
      
      const sessionId = sessionResult?.session_id || `outgoing_${props.data.message.user_id}_${props.toUserId}_${Date.now()}`
      props.setCurrentSessionId(sessionId)
      
      console.log('📞 Created call session:', sessionId)
    } catch (error) {
      console.error('❌ Failed to create call session:', error)
      const fallbackSessionId = `fallback_${props.data.message.user_id}_${props.toUserId}_${Date.now()}`
      props.setCurrentSessionId(fallbackSessionId)
    }

    props.setCallStatus('connecting')
    props.setIsVideoCall(isVideoCall)
    props.setProgressKey(prev => prev + 1)

    const newCall = new (window as any).StringeeCall2(
      props.client,
      props.data.message.user_id,
      props.toUserId,
      isVideoCall
    )
    
    props.setCall(newCall)
    props.setupCallEvents(newCall)

    // Start ringback audio and make call
    if (props.ringbackAudioRef.current) {
      props.ringbackAudioRef.current.loop = true
      props.ringbackAudioRef.current.volume = 0.7
      props.ringbackAudioRef.current.play().catch(() => {})
    }

    newCall.makeCall(async (res: any) => {
      console.log('📞 Call initiated, result:', res)
      
      if (isVideoCall) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          props.localStreamRef.current = stream
          if (props.localVideoRef.current) {
            props.localVideoRef.current.srcObject = stream
            props.localVideoRef.current.muted = true
            props.localVideoRef.current.play().catch(() => {})
          }
        } catch (error) {
          console.log('❌ Failed to get local stream:', error)
        }
      }
      
      // 30 second timeout
      const timeoutId = setTimeout(async () => {
        if (newCall && (props.callStatus === 'connecting' || !props.isCallConnected)) {
          console.log('Call timeout after 30 seconds')
          
          if (props.localStreamRef.current) {
            props.localStreamRef.current.getTracks().forEach(track => track.stop())
            props.localStreamRef.current = null
          }
          
          await props.saveCallHistoryToChat(isVideoCall ? 'video' : 'audio', 'missed')
          
          newCall.hangup(() => {
            console.log('StringeeCall hangup completed')
          })
          
          await hangupCall()
        }
      }, 30000)
      
      props.callTimeoutRef.current = timeoutId
    })
  }, [props])

  const answerCall = useCallback(async () => {
    if (!props.incoming) return
    
    props.setGlobalIsInCall(true)
    initAudioContext()
    
    const deviceAvailable = await checkDeviceAvailability(props.isVideoCall)
    if (!deviceAvailable) {
      console.log('❌ Device check failed - cannot answer call')
      return
    }
    
    props.stopAllAudio()
    props.stopAllAudioWithRefs()
    
    props.incoming.answer((res: any) => {
      console.log('✅ Incoming call answered:', res)
      
      props.setCall(props.incoming)
      props.setIncoming(null)
      props.setCallStatus('connected') 
      props.setIsCallConnected(true)
      
      if (props.isVideoCall) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            props.localStreamRef.current = stream
            if (props.localVideoRef.current) {
              props.localVideoRef.current.srcObject = stream
              props.localVideoRef.current.muted = true
              props.localVideoRef.current.play().catch(() => {})
            }
          })
          .catch(error => {
            console.log('❌ Failed to get local stream for answered call:', error)
          })
      }
      
      if (props.currentSessionId && props.data?.message?.user_id) {
        props.updateCallStatus({
          session_id: props.currentSessionId,
          status: 'connected',
          answered_at: new Date().toISOString()
        }).catch(error => {
          console.error('❌ Failed to send call answered notification:', error)
        })
      }
      
      if (props.callTimeoutRef.current) {
        clearTimeout(props.callTimeoutRef.current)
        props.callTimeoutRef.current = null
      }
      
      // Multiple cleanup attempts
      setTimeout(() => props.stopAllAudio(), 10)
      setTimeout(() => props.stopAllAudio(), 100)
      setTimeout(() => props.stopAllAudio(), 500)
    })
  }, [props])

  const hangupCall = useCallback(async () => {
    if (props.callStatus === 'ended' || props.callStatus === 'rejected') {
      console.log('📱 Closing modal for ended/rejected call')
      performCleanup()
      return
    }
    
    if (props.isEndingCall) {
      console.log('❌ Hangup already in progress')
      return
    }
    props.setIsEndingCall(true)
    
    if (!props.call) {
      console.log('❌ No active call to hangup')
      performCleanup()
      return
    }
    
    // Save call history if not saved
    if (!props.callHistorySaved) {
      if (props.isCallConnected && props.callDuration > 0) {
        await props.saveCallHistoryToChat(
          props.isVideoCall ? 'video' : 'audio',
          'completed',
          props.callDuration
        )
      } else if (props.callStatus === 'connecting') {
        await props.saveCallHistoryToChat(
          props.isVideoCall ? 'video' : 'audio',
          'ended'
        )
      }
    }
    
    // Update call status
    if (props.currentSessionId) {
      try {
        await props.updateCallStatus({
          session_id: props.currentSessionId,
          status: 'ended',
          end_time: new Date().toISOString()
        })
      } catch (error) {
        console.error('❌ Failed to update call status:', error)
      }
    }
    
    // Clear timeout
    if (props.callTimeoutRef.current) {
      clearTimeout(props.callTimeoutRef.current)
      props.callTimeoutRef.current = null
    }
    
    // Stop audio
    if (props.ringbackAudioRef.current) {
      props.ringbackAudioRef.current.pause()
      props.ringbackAudioRef.current.currentTime = 0
    }
    if (props.phoneRingRef.current) {
      props.phoneRingRef.current.pause()
      props.phoneRingRef.current.currentTime = 0
    }
    
    // Stop media tracks
    if (props.localStreamRef.current) {
      props.localStreamRef.current.getTracks().forEach(track => {
        console.log('🔴 Stopping track:', track.kind)
        track.stop()
      })
      props.localStreamRef.current = null
    }
    
    // Clear video sources
    if (props.localVideoRef.current) {
      props.localVideoRef.current.srcObject = null
    }
    if (props.remoteVideoRef.current) {
      props.remoteVideoRef.current.srcObject = null
    }
    if (props.remoteAudioRef.current) {
      props.remoteAudioRef.current.srcObject = null
    }

    // Hangup call
    props.call.hangup((res: any) => {
      console.log('📞 Call hangup result:', res)
    })
    
    // Force cleanup
    setTimeout(() => {
      props.forceStopAllMediaStreams()
    }, 500)
    
    // Update UI state
    props.setCallStatus('ended')
    props.setIsCallConnected(false)
    props.setHasRemoteVideo(false)
    props.setHasRemoteAudio(false)
    props.setVideoUpgradeRequest(null)
  }, [props])

  const rejectCall = useCallback(async () => {
    if (!props.incoming) return
    
    await props.saveCallHistoryToChat(
      props.isVideoCall ? 'video' : 'audio',
      'rejected'
    )
    
    if (props.callTimeoutRef.current) {
      clearTimeout(props.callTimeoutRef.current)
      props.callTimeoutRef.current = null
    }
    
    if (props.currentSessionId) {
      try {
        await props.updateCallStatus({
          session_id: props.currentSessionId,
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
      } catch (error) {
        console.error('❌ Failed to update call status to rejected:', error)
      }
    }
    
    props.incoming.reject((res: any) => {
      console.log('❌ Call rejected:', res)
    })
    
    props.stopAllAudio()
    props.setCallStatus('rejected')
    props.setIsCallConnected(false)
    props.setHasRemoteVideo(false)
    props.setHasRemoteAudio(false)
    props.setVideoUpgradeRequest(null)
  }, [props])

  const upgradeToVideo = useCallback(async () => {
    if (!props.call || props.isVideoCall || !props.currentSessionId) {
      toast.error('Không thể nâng cấp lên video call')
      return
    }

    try {
      await props.sendVideoUpgradeRequest({
        session_id: props.currentSessionId,
        from_user: props.data?.message?.user_id,
        to_user: props.toUserId,
        from_user_name: props.data?.message?.full_name || props.data?.message?.user_id
      })
      
      toast.success('Đã gửi yêu cầu chuyển sang video call')
    } catch (error) {
      console.error('❌ Failed to send video upgrade request:', error)
      toast.error('Không thể gửi yêu cầu video call')
    }
  }, [props])

  const acceptVideoUpgrade = useCallback(async () => {
    if (!props.call || !props.currentSessionId) return

    try {
      await props.respondVideoUpgrade({
        session_id: props.currentSessionId,
        accepted: true,
        responder_user: props.data?.message?.user_id
      })

      props.call.upgradeToVideoCall()
      props.setIsVideoCall(true)
      props.setVideoUpgradeRequest(null)
      
      toast.success('Đã chấp nhận chuyển sang video call')
    } catch (error) {
      console.error('❌ Failed to accept video upgrade:', error)
      toast.error('Không thể chấp nhận video call')
    }
  }, [props])

  const rejectVideoUpgrade = useCallback(async () => {
    if (!props.currentSessionId) return

    try {
      await props.respondVideoUpgrade({
        session_id: props.currentSessionId,
        accepted: false,
        responder_user: props.data?.message?.user_id
      })

      props.setVideoUpgradeRequest(null)
      toast.info('Đã từ chối chuyển sang video call')
    } catch (error) {
      console.error('❌ Failed to reject video upgrade:', error)
    }
  }, [props])

  const toggleLocalVideo = useCallback(async () => {
    if (!props.isVideoCall || !props.localStreamRef.current || !props.call) {
      toast.error('Chỉ có thể tắt/bật video trong video call')
      return
    }

    const newVideoEnabled = !props.isLocalVideoEnabled
    
    try {
      if (newVideoEnabled) {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        props.localStreamRef.current = videoStream
        
        if (props.localVideoRef.current) {
          props.localVideoRef.current.srcObject = videoStream
          props.localVideoRef.current.play().catch(() => {})
        }
      } else {
        if (props.localStreamRef.current) {
          const videoTracks = props.localStreamRef.current.getVideoTracks()
          videoTracks.forEach(track => track.stop())
          
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          props.localStreamRef.current = audioStream
          
          if (props.localVideoRef.current) {
            props.localVideoRef.current.srcObject = null
          }
        }
      }

      props.setIsLocalVideoEnabled(newVideoEnabled)

      if (props.currentSessionId && props.data?.message?.user_id) {
        try {
          await props.sendVideoStatus({
            session_id: props.currentSessionId,
            from_user: props.data.message.user_id,
            to_user: props.toUserId,
            video_enabled: newVideoEnabled
          })
        } catch (error) {
          console.error('❌ Failed to send video status:', error)
        }
      }
    } catch (error) {
      console.error('❌ Error toggling video:', error)
      toast.error('Không thể tắt/bật camera')
    }
  }, [props])

  const performCleanup = useCallback(() => {
    console.log('🧹 Performing cleanup...')
    
    if (props.callTimeoutRef.current) {
      clearTimeout(props.callTimeoutRef.current)
      props.callTimeoutRef.current = null
    }
    
    if (props.localStreamRef.current) {
      props.localStreamRef.current.getTracks().forEach(track => track.stop())
      props.localStreamRef.current = null
    }
    
    if (props.localVideoRef.current) props.localVideoRef.current.srcObject = null
    if (props.remoteVideoRef.current) props.remoteVideoRef.current.srcObject = null
    if (props.remoteAudioRef.current) props.remoteAudioRef.current.srcObject = null
    
    props.stopAllAudio()
    props.stopNetworkMonitoring()
    
    // Reset states
    props.setCall(null)
    props.setIncoming(null)
    props.setCallStatus(null)
    props.setCurrentSessionId(null)
    props.setIsCallConnected(false)
    props.setHasRemoteVideo(false)
    props.setHasRemoteAudio(false)
    props.setVideoUpgradeRequest(null)
    props.setCallerUserName('')
    props.setCallHistorySaved(false)
    props.setIsEndingCall(false)
    props.setShowDetailedStats(false)
    props.setGlobalIsInCall(false)

    if (props.isGlobalCall && props.onClose) {
      props.onClose()
    }
  }, [props])

  return {
    makeCall,
    answerCall,
    hangupCall,
    rejectCall,
    upgradeToVideo,
    acceptVideoUpgrade,
    rejectVideoUpgrade,
    toggleLocalVideo,
    performCleanup
  }
} 