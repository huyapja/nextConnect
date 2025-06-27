import { useEffect, useRef, useState, useCallback } from 'react'
import { useFrappeGetCall, useFrappeEventListener, useFrappeGetDoc, useFrappePostCall } from 'frappe-react-sdk'
import { 
  FiPhone, FiPhoneCall, FiPhoneOff, 
  FiVideo, FiVideoOff, FiMic, FiMicOff, FiHeadphones, FiChevronDown 
} from 'react-icons/fi'
import { useTheme } from '@/ThemeProvider'
import { toast } from 'sonner'
import { useGlobalStringee } from './GlobalStringeeProvider'
import { DropdownMenu } from '@radix-ui/themes'

// Import utilities and hooks
import { getIconColor, getBackgroundColor } from './utils/themeUtils'
import { formatCallDuration, getDisplayName, getUserAvatar, getAvatarInitials, generateFallbackSessionId } from './utils/callHelpers'
import { getPhoneRingAudio, getRingtoneSoundAudio, stopAllAudio as stopAllAudioGlobal, initAudioContext } from './utils/stringeeAudio'
import { useNetworkMonitoring } from './hooks/useNetworkMonitoring'
import { useCallDuration } from './hooks/useCallDuration'
import { useCallAudio } from './hooks/useCallAudio'

declare global {
  interface Window {
    StringeeClient: any
    StringeeCall2: any
  }
}

interface CallStringeeProps {
  toUserId: string
  channelId?: string
  globalClient?: any // Global Stringee client
  globalIncomingCall?: any // Global incoming call
  isGlobalCall?: boolean // Flag để biết đây là global call
  onClose?: () => void // Callback để đóng global modal
}

export default function StringeeCallComponent({ 
  toUserId, 
  channelId, 
  globalClient, 
  globalIncomingCall, 
  isGlobalCall = false,
  onClose 
}: CallStringeeProps) {
  
  const { appearance } = useTheme()
  const { isInCall: globalIsInCall, setIsInCall: setGlobalIsInCall } = useGlobalStringee()
  const [client, setClient] = useState<any>(null)
  const [call, setCall] = useState<any>(null)
  const [incoming, setIncoming] = useState<any>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [isCallConnected, setIsCallConnected] = useState(false)
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false)
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false)
  const [isVideoCall, setIsVideoCall] = useState(true)
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended' | 'rejected' | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [forceRender, setForceRender] = useState(0)
  const [videoUpgradeRequest, setVideoUpgradeRequest] = useState<{fromUser: string, fromUserName?: string, sessionId: string} | null>(null)
  const [callerUserName, setCallerUserName] = useState<string>('')
  
  // Video controls states
  const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState(true)
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true)
  
  // State để track xem đã lưu lịch sử cuộc gọi chưa
  const [callHistorySaved, setCallHistorySaved] = useState(false)
  
  // State để prevent spam end call button
  const [isEndingCall, setIsEndingCall] = useState(false)
  
  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  
  // Thêm ref cho call timeout (30s)
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Thêm state để force restart progress ring animation
  const [progressKey, setProgressKey] = useState(0)

  // Use custom hooks
  const { networkStats, showDetailedStats, setShowDetailedStats, startNetworkMonitoring, stopNetworkMonitoring } = useNetworkMonitoring()
  const { callDuration, callStartTime } = useCallDuration(callStatus, call, incoming)
  const { 
    isMuted, 
    localStreamRef, 
    phoneRingRef, 
    ringbackAudioRef, 
    toggleMute, 
    playRingtone, 
    playRingback, 
    stopAllAudioWithRefs, 
    performAudioCleanup, 
    initAudio 
  } = useCallAudio(call, incoming)
  
  // Get user info
  const { data: userData } = useFrappeGetDoc('Raven User', toUserId)

  const { data } = useFrappeGetCall<{ message: { user_id: string; token: string } }>(
    'raven.api.stringee_token.get_stringee_token'
  )
  
  // Hook để gọi API lưu lịch sử cuộc gọi
  const { call: saveCallHistory } = useFrappePostCall('raven.api.raven_message.send_call_history_message')
  const { call: findDMChannel } = useFrappePostCall('raven.api.raven_message.find_dm_channel_between_users')

  // Add proper Frappe API hooks để thay thế fetch calls với error handling
  const { call: createCallSession, error: createCallError } = useFrappePostCall('raven.api.stringee_token.create_call_session')
  const { call: updateCallStatus, error: updateCallError } = useFrappePostCall('raven.api.stringee_token.update_call_status')
  const { call: sendVideoUpgradeRequest, error: videoUpgradeError } = useFrappePostCall('raven.api.stringee_token.send_video_upgrade_request')
  const { call: respondVideoUpgrade, error: respondVideoError } = useFrappePostCall('raven.api.stringee_token.respond_video_upgrade')
  const { call: checkUserBusyStatus, error: checkBusyError } = useFrappePostCall('raven.api.stringee_token.check_user_busy_status')
  const { call: sendVideoStatus, error: sendVideoStatusError } = useFrappePostCall('raven.api.stringee_token.send_video_status')
  
  // Get caller info for incoming calls
  const callerUserId = incoming?.fromNumber
  const { data: callerData } = useFrappeGetDoc('Raven User', callerUserId, {
    enabled: !!callerUserId
  })

  // Reset call states when starting new call
  useEffect(() => {
    if (call || incoming) {
      setCallHistorySaved(false) // Reset flag lưu lịch sử
      setIsEndingCall(false) // Reset ending flag
      
      // Reset video states khi bắt đầu cuộc gọi mới
      setIsLocalVideoEnabled(true)
      setIsRemoteVideoEnabled(true)
      
      console.log('🔄 Reset call states for new call - callHistorySaved: false, isEndingCall: false')
    }
  }, [call, incoming])

  // 📹 Force refresh local video when call state changes
  useEffect(() => {
    if (isVideoCall && localStreamRef.current && localVideoRef.current && (callStatus === 'connected' || callStatus === 'connecting')) {
      console.log('🔄 Refreshing local video due to call state change...')
      
      const refreshLocalVideo = async () => {
        try {
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current
            localVideoRef.current.muted = true
            localVideoRef.current.autoplay = true
            localVideoRef.current.playsInline = true
            await localVideoRef.current.play()
            console.log('✅ Local video refreshed successfully')
          }
        } catch (error) {
          console.log('❌ Local video refresh failed:', error)
        }
      }
      
      refreshLocalVideo()
    }
  }, [isVideoCall, callStatus, localStreamRef.current])

  // Monitor API errors for debugging
  useEffect(() => {
    if (createCallError) {
      console.error('❌ Create call session error:', createCallError)
    }
    if (updateCallError) {
      console.error('❌ Update call status error:', updateCallError)
    }
    if (videoUpgradeError) {
      console.error('❌ Video upgrade request error:', videoUpgradeError)
    }
    if (respondVideoError) {
      console.error('❌ Respond video upgrade error:', respondVideoError)
    }
    if (checkBusyError) {
      console.error('❌ Check busy status error:', checkBusyError)
    }
  }, [createCallError, updateCallError, videoUpgradeError, respondVideoError, checkBusyError])

  // Get helper values using utility functions
  const displayName = getDisplayName(incoming, callerUserName, callerData, callerUserId, userData, toUserId)
  const userAvatar = getUserAvatar(incoming, callerData, userData)
  const avatarInitials = getAvatarInitials(displayName, toUserId, incoming, callerUserId)

  // 📝 Function để tìm đúng DM channel ID qua API
  const getDMChannelId = useCallback(async () => {
    const currentUserId = data?.message?.user_id
    
    // Xác định caller và callee dựa trên loại cuộc gọi
    let callerId: string | undefined
    let calleeId: string | undefined
    
    if (incoming) {
      // Cuộc gọi đến: fromNumber là caller, toNumber (current user) là callee
      callerId = incoming.fromNumber
      calleeId = incoming.toNumber || currentUserId
    } else {
      // Cuộc gọi đi: current user là caller, toUserId là callee
      callerId = currentUserId
      calleeId = toUserId
    }
    
    if (!callerId || !calleeId) {
      console.error('❌ Missing caller or callee ID for channel lookup')
      return null
    }
    
    try {
      console.log('📝 Finding DM channel between:', callerId, '<->', calleeId)
      console.log('📝 Call direction:', incoming ? 'incoming' : 'outgoing')
      
      // Gọi API để tìm channel ID đúng
      const result = await findDMChannel({
        user1: callerId,
        user2: calleeId
      })
      
      const channelId = result?.message || result
      console.log('📝 Found DM channel ID:', channelId)
      return channelId
    } catch (error) {
      console.error('❌ Failed to find DM channel:', error)
      return null
    }
  }, [data?.message?.user_id, toUserId, incoming, findDMChannel])

  // Function để lưu lịch sử cuộc gọi
  const saveCallHistoryToChat = async (callType: 'audio' | 'video', callStatus: 'completed' | 'missed' | 'rejected' | 'ended', duration?: number) => {
    // Double check để tránh duplicate
    if (callHistorySaved) {
      console.log('⚠️ Call history already saved - skipping duplicate save attempt')
      return
    }
    
    // Set flag ngay lập tức để prevent race conditions
    setCallHistorySaved(true)
    
    try {
      const dmChannelId = await getDMChannelId()
      if (!dmChannelId) {
        console.error('❌ Cannot save call history - no valid channel ID')
        // Reset flag nếu failed
        setCallHistorySaved(false)
        return
      }
      
      console.log('💾 Saving call history to channel:', dmChannelId, 'Call type:', callType, 'Status:', callStatus, 'Duration:', duration)
      
      await saveCallHistory({
        channel_id: dmChannelId,
        call_type: callType,
        call_status: callStatus,
        duration: duration
      })
      
      console.log('✅ Call history saved successfully to:', dmChannelId)
    } catch (error) {
      console.error('❌ Failed to save call history:', error)
      // Reset flag nếu failed để có thể retry
      setCallHistorySaved(false)
    }
  }





  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting - performing final cleanup')
      
      // 📹 Safety guard: Force stop any remaining media tracks
      if (localStreamRef.current) {
        console.log('🔴 [UNMOUNT] Stopping remaining local media tracks:', localStreamRef.current.getTracks().length)
        localStreamRef.current.getTracks().forEach((track, index) => {
          console.log(`🔴 [UNMOUNT] Stopping track ${index}:`, track.kind, track.readyState)
          track.stop()
        })
        localStreamRef.current = null
      }
      
      // Clear all video/audio elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null
      }
      
      // Call comprehensive cleanup
      performCleanup()
      console.log('✅ Component cleanup completed')
    }
  }, [])

  // Load Stringee SDK
  useEffect(() => {
    if (window.StringeeClient && window.StringeeCall2) {
      setSdkLoaded(true)
    } else {
      
      // Remove existing babel-polyfill to avoid conflict
      const existingPolyfill = document.querySelector('script[src*="babel-polyfill"]')
      if (existingPolyfill) {
        existingPolyfill.remove()
      }
      
      // Remove existing Stringee scripts
      const existingStringee = document.querySelector('script[src*="latest.sdk.bundle.min.js"]')
      if (existingStringee) {
        existingStringee.remove()
      }
      
      const script = document.createElement('script')
      script.src = '/assets/raven/stringee/latest.sdk.bundle.min.js'
      script.async = true
      script.onload = () => {
        setSdkLoaded(true)
      }
      script.onerror = () => {
        // Failed to load Stringee SDK
      }
      document.head.appendChild(script)
    }
    
          // Initialize audio context on first user interaction
    const handleFirstInteraction = () => {
      initAudio()
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }
    
    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteraction)
    document.addEventListener('touchstart', handleFirstInteraction)
    
    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }
  }, [])

    // Listen for realtime call status updates using frappe-react-sdk hook
  useFrappeEventListener('call_status_update', (data: any) => {
    console.log('🔄 Received call_status_update:', data, 'currentSessionId:', currentSessionId)
    
    // Match by session ID to ensure we only handle our call
    if (data.session_id === currentSessionId) {
      
      // Handle call connected notification - chỉ cho outgoing calls
      if (data.status === 'connected' && callStatus === 'connecting' && !incoming) {
        console.log('✅ Received call connected notification via realtime for outgoing call')
        
        // Aggressive audio stop
        stopAllAudio()
        
        setIsCallConnected(true)
        setCallStatus('connected')
        
        // Clear call timeout when connected
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current)
          callTimeoutRef.current = null
        }
        
        // Start network monitoring when call is connected
        setTimeout(() => {
          startNetworkMonitoring(call)
        }, 1000)
      }
      
      // Handle call ended notification
      if (data.status === 'ended') {
        console.log('🔚 Received call ended notification via realtime')
        
        // AGGRESSIVE audio stop immediately - caller hangup
        stopAllAudio()
        
        // Additional immediate audio cleanup using hook
        stopAllAudioWithRefs()
        
        // Force remove ring audio from DOM
        document.querySelectorAll('audio').forEach(audio => {
          if (audio.src.includes('phone-ring') || audio.src.includes('ringtone')) {
            audio.pause()
            audio.currentTime = 0
            audio.volume = 0
            audio.loop = false
            try {
              audio.remove()
            } catch (e) {
              // Could not remove audio element
            }
          }
        })
        
        // Clear video streams
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null
        }
        
        // Force UI update - cập nhật ngay lập tức nhưng KHÔNG đóng modal
        setCallStatus('ended')
        setIsCallConnected(false)
        setHasRemoteVideo(false)
        setHasRemoteAudio(false)
        setVideoUpgradeRequest(null)
        setForceRender(prev => prev + 1) // Force re-render
        
        // KHÔNG tự động đóng modal - để người dùng nhấn nút kết thúc để đóng
      }
    }
  })

  // Listen for video upgrade requests
  useFrappeEventListener('video_upgrade_request', (eventData: any) => {
    // More flexible matching - check if we're the target user  
    const currentUserId = data?.message?.user_id
    const isTargetUser = eventData.to_user === currentUserId
    
    // Show popup if we are the target user, regardless of session ID match
    if (isTargetUser || eventData.session_id === currentSessionId) {
      setVideoUpgradeRequest({
        fromUser: eventData.from_user,
        fromUserName: eventData.from_user_name || eventData.from_user,
        sessionId: eventData.session_id
      })
      
      // Also update current session ID if it was missing
      if (!currentSessionId && eventData.session_id) {
        setCurrentSessionId(eventData.session_id)
      }
    }
  })

  // Listen for video upgrade responses
  useFrappeEventListener('video_upgrade_response', (data: any) => {
    if (data.session_id === currentSessionId) {
      if (data.accepted && call) {
        call.upgradeToVideoCall()
        setIsVideoCall(true)
      } else {
        
        // Revert to audio-only call
        setIsVideoCall(false)
        
        // Stop video stream and revert to audio only
        if (localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks()
          videoTracks.forEach(track => {
            track.stop()
          })
          
          // Get audio-only stream
          navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(audioStream => {
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = null
              }
              localStreamRef.current = audioStream
            })
            .catch(error => {
              // Failed to get audio stream after video rejection
            })
        }
        
        // Clear local video display
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null
        }
        
        // Show rejection message briefly
        toast.error('Người dùng đã từ chối chuyển sang video call')
      }
    }
  })

  // Listen for video status updates (tắt/bật video)
  useFrappeEventListener('video_status_update', (data: any) => {
    if (data.session_id === currentSessionId) {
      console.log('📹 Received video status update:', data)
      setIsRemoteVideoEnabled(data.video_enabled)
      
      if (data.video_enabled) {
        console.log('📹 Remote user enabled video')
      } else {
        console.log('📹 Remote user disabled video')
      }
    }
  })

  // Listen for incoming call notifications to get correct call type
  useFrappeEventListener('incoming_call', (callData: any) => {
    // Store call type info for when stringee event arrives
    const currentUserId = data?.message?.user_id
    if (callData.callee_id === currentUserId) {
          // Store in a ref or global variable to use when incoming call arrives
          ;(window as any)._expectedCallType = callData.call_type
          ;(window as any)._expectedCallSession = callData.session_id
          
          // Set caller name from realtime notification
          if (callData.caller_name) {
            setCallerUserName(callData.caller_name)
          }
    }
  })

  // Initialize Stringee client when SDK is loaded and we have token
  useEffect(() => {
    // 🌐 Sử dụng global client nếu có (cho global calls)
    if (globalClient && isGlobalCall) {
      setClient(globalClient)
      return
    }
    
    // Local client initialization (cho local calls trong DM)
    if (sdkLoaded && data?.message && !client && window.StringeeClient) {
      const stringeeClient = new window.StringeeClient()
      stringeeClient.connect(data.message.token)
      setClient(stringeeClient)

      phoneRingRef.current = getPhoneRingAudio()
      phoneRingRef.current.loop = true

      stringeeClient.on('connect', () => {
        console.log('Stringee connected')
      })
      
      stringeeClient.on('disconnect', () => {
        console.log('Stringee disconnected')
      })
      
      stringeeClient.on('authen', (res: any) => {
        console.log('Stringee authentication:', res)
        if (res.r !== 0) {
          console.error('Stringee authentication failed:', res)
        }
      })
      
      stringeeClient.on('otherdeviceauthen', (data: any) => {
        console.log('Other device authentication:', data)
      })
      
      stringeeClient.on('requestnewtoken', () => {
        console.log('Stringee token expired, need refresh')
        // Token expired, you might want to refresh here
      })

      stringeeClient.on('incomingcall2', (incomingCall: any) => {
        // Detect call type from incoming call - use stored session info if available
        let incomingIsVideo = incomingCall.isVideoCall === true
        let expectedSessionId = null
        
        // Check if we have stored call type info from realtime notification
        const expectedCallType = (window as any)._expectedCallType
        if (expectedCallType) {
          incomingIsVideo = expectedCallType === 'video'
          expectedSessionId = (window as any)._expectedCallSession
          // Clear stored info
          ;(window as any)._expectedCallType = null
          ;(window as any)._expectedCallSession = null
        }
        
        // Set session ID for incoming call
        if (expectedSessionId) {
          setCurrentSessionId(expectedSessionId)
        } else {
          // Create fallback session ID if not available
          const fallbackSessionId = `incoming_${incomingCall.fromNumber}_${incomingCall.toNumber}_${Date.now()}`
          setCurrentSessionId(fallbackSessionId)
        }
        
        setIsVideoCall(incomingIsVideo)
        
        setIncoming(incomingCall)
        setupCallEvents(incomingCall)
        
        // Setup ring tone
        if (phoneRingRef.current) {
          // Ensure audio context is ready
          initAudioContext()
          
          phoneRingRef.current.currentTime = 0
          phoneRingRef.current.loop = true
          phoneRingRef.current.volume = 0.7
          phoneRingRef.current.autoplay = true
          
          // Multiple retry attempts for ringtone
          const playRingtone = async (attempt = 1) => {
            try {
              await phoneRingRef.current?.play()
            } catch (error) {
              if (attempt < 3) {
                setTimeout(() => playRingtone(attempt + 1), 500 * attempt)
              }
            }
          }
          
          playRingtone()
        }
      })
    }
  }, [sdkLoaded, data, client, globalClient, isGlobalCall])

  // 🌐 Xử lý global incoming call
  useEffect(() => {
    if (globalIncomingCall && isGlobalCall) {
      console.log('🌐 Processing global incoming call:', globalIncomingCall)
      
      // Set call type từ global incoming call
      const incomingIsVideo = globalIncomingCall.isVideoCall === true
      setIsVideoCall(incomingIsVideo)
      
      // Set incoming call
      setIncoming(globalIncomingCall)
      setupCallEvents(globalIncomingCall)
      
      // Play ringtone
      if (phoneRingRef.current) {
        phoneRingRef.current.currentTime = 0
        phoneRingRef.current.loop = true
        phoneRingRef.current.volume = 0.7
        phoneRingRef.current.play().catch(() => {})
      }
    }
  }, [globalIncomingCall, isGlobalCall])

  const setupCallEvents = (callObj: any) => {
    console.log('🔧 Setting up call events for call:', callObj?.callId || 'unknown')
    
    // Add error handling for call events
    callObj.on('error', (error: any) => {
      console.error('❌ Stringee call error:', error)
      // Don't auto-hangup on error, let user decide
    })
    
    callObj.on('addremotestream', (stream: MediaStream) => {
      // KHÔNG tự động set connected - chỉ xử lý stream
      // setIsCallConnected sẽ được set khi user nhấn Accept hoặc trong signalingstate
      
      const videoTracks = stream.getVideoTracks()
      const audioTracks = stream.getAudioTracks()
      
      // Handle video tracks
      if (videoTracks.length > 0) {
        setHasRemoteVideo(true)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null
          // Force refresh video element
          setTimeout(() => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream
              remoteVideoRef.current.autoplay = true
              remoteVideoRef.current.play().then(() => {
                // Remote video playing successfully
              }).catch((error) => {
                // Retry after a short delay
                setTimeout(() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play().catch(() => {})
                  }
                }, 500)
              })
            }
          }, 100)
        }
      }
      
      // Handle audio tracks (for both video and Gọi thoạis)
      if (audioTracks.length > 0) {
        setHasRemoteAudio(true)
        
        // Ensure audio context is ready
        initAudioContext()
        
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null
          
          // Aggressive audio play with multiple retries
          const playRemoteAudio = async (attempt = 1) => {
            try {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = stream
                remoteAudioRef.current.volume = 1.0
                remoteAudioRef.current.autoplay = true
                await remoteAudioRef.current.play()
              }
            } catch (error) {
              if (attempt < 5) {
                setTimeout(() => playRemoteAudio(attempt + 1), 200 * attempt)
              }
            }
          }
          
          // Start immediately and also retry after delay
          playRemoteAudio()
          setTimeout(() => playRemoteAudio(), 100)
        }
        
        // For audio-only calls, also set audio to video element as fallback
        if (videoTracks.length === 0 && remoteVideoRef.current) {
          const playAudioViaVideo = async (attempt = 1) => {
            try {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream
                remoteVideoRef.current.volume = 1.0
                remoteVideoRef.current.autoplay = true
                await remoteVideoRef.current.play()
              }
            } catch (error) {
              if (attempt < 5) {
                setTimeout(() => playAudioViaVideo(attempt + 1), 200 * attempt)
              }
            }
          }
          
          // Multiple attempts for audio-only calls
          playAudioViaVideo()
          setTimeout(() => playAudioViaVideo(), 100)
          setTimeout(() => playAudioViaVideo(), 500)
        }
      }
    })

    callObj.on('addlocalstream', (stream: MediaStream) => {
      console.log('📹 Local stream received:', stream, 'Video tracks:', stream.getVideoTracks().length)
      
      // Store local stream for mute/unmute control
      localStreamRef.current = stream
      
      if (localVideoRef.current) {
        console.log('📹 Setting local video stream...')
        localVideoRef.current.srcObject = null
        
        // Multiple aggressive attempts to set and play local video
        const setLocalVideo = async (attempt = 1) => {
          try {
            if (localVideoRef.current && stream) {
              console.log(`📹 Local video attempt ${attempt}`)
              localVideoRef.current.srcObject = stream
              localVideoRef.current.muted = true
              localVideoRef.current.autoplay = true
              localVideoRef.current.playsInline = true
              
              // Force play with multiple retries
              await localVideoRef.current.play()
              console.log('✅ Local video playing successfully')
            }
          } catch (error) {
            console.log(`❌ Local video attempt ${attempt} failed:`, error)
            if (attempt < 5) {
              setTimeout(() => setLocalVideo(attempt + 1), 200 * attempt)
            }
          }
        }
        
        // Start immediately and retry
        setLocalVideo()
        setTimeout(() => setLocalVideo(), 100)
        setTimeout(() => setLocalVideo(), 500)
        setTimeout(() => setLocalVideo(), 1000)
      }
    })

    callObj.on('signalingstate', (state: any) => {
      console.log('🔄 Stringee signalingstate:', state, 'callStatus:', callStatus, 'call:', !!call, 'incoming:', !!incoming)
      
      // Khi cuộc gọi được trả lời/kết nối
      if (state.code === 3 || state.reason === 'Answered' || state.reason === 'CALL_ANSWERED') {
        
        // Xử lý signal Answered cho cả incoming và outgoing calls
        // Logic đơn giản: Nếu chưa connected thì set connected
        console.log('📞 Processing Answered signal, isCallConnected:', isCallConnected)
        
        if (!isCallConnected) {
          console.log('✅ Setting call connected from Stringee signal...')
          console.log('📊 State before signalingstate update - callStatus:', callStatus, 'isCallConnected:', isCallConnected, 'call:', !!call, 'incoming:', !!incoming)
          
          // AGGRESSIVE audio cleanup on call connected
          stopAllAudio()
          
          // Additional specific audio cleanup
          if (ringbackAudioRef.current) {
            ringbackAudioRef.current.pause()
            ringbackAudioRef.current.currentTime = 0
            ringbackAudioRef.current.loop = false
            ringbackAudioRef.current.volume = 0
            ringbackAudioRef.current.src = ''
          }
          if (phoneRingRef.current) {
            phoneRingRef.current.pause()
            phoneRingRef.current.currentTime = 0
            phoneRingRef.current.loop = false
            phoneRingRef.current.volume = 0
            phoneRingRef.current.src = ''
          }
          
                  // Force stop global audio using utility function
        stopAllAudioGlobal()
          
          // Force stop and remove all ringtones from DOM
          document.querySelectorAll('audio').forEach(audio => {
            if (audio.src.includes('phone-ring') || audio.src.includes('ringtone')) {
              audio.pause()
              audio.currentTime = 0
              audio.loop = false
              audio.volume = 0
              try {
                audio.remove()
              } catch (e) {
                // Could not remove audio element
              }
            }
          })
          
          setIsCallConnected(true)
          setCallStatus('connected')
          
          // Clear call timeout when connected
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current)
            callTimeoutRef.current = null
          }
          
          // Start network monitoring when call is connected
          startNetworkMonitoring(call)
        } else {
          console.log('⏳ Call already connected, skipping duplicate signal')
        }
      }
      
      // Khi cuộc gọi bị từ chối
      if (state.code === 5 || state.reason === 'CALL_REJECTED' || state.reason === 'Rejected') {
        setCallStatus('rejected')
        setIsCallConnected(false)
        setHasRemoteVideo(false)
        setHasRemoteAudio(false)
        setVideoUpgradeRequest(null)
        ringbackAudioRef.current?.pause()
        if (ringbackAudioRef.current) {
          ringbackAudioRef.current.currentTime = 0
        }
        phoneRingRef.current?.pause()
        if (phoneRingRef.current) {
          phoneRingRef.current.currentTime = 0
        }
        
        // Clear call timeout when rejected
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current)
          callTimeoutRef.current = null
        }
        
        // KHÔNG tự động đóng modal - để người dùng nhấn nút kết thúc để đóng
      }
      
      // Khi cuộc gọi kết thúc (chỉ xử lý nếu chưa có callStatus là 'ended')
      if ((state.code === 6 || state.reason === 'Ended' || state.reason === 'CALL_ENDED' || state.reason === 'CALL_BUSY') && callStatus !== 'ended') {
        console.log('🔚 Call ended via signaling state - stopping media tracks immediately')
        
        // 📹 FORCE STOP media tracks ngay lập tức khi call ends từ signaling
        if (localStreamRef.current) {
          console.log('🔴 Stopping local stream from signaling end:', localStreamRef.current.getTracks().length)
          localStreamRef.current.getTracks().forEach((track, index) => {
            console.log(`🔴 Stopping track ${index} from signaling:`, track.kind, track.readyState)
            track.stop()
          })
          localStreamRef.current = null
        }
        
        // Clear video sources immediately
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null
        }
        
        setCallStatus('ended')
        setIsCallConnected(false)
        setHasRemoteVideo(false)
        setHasRemoteAudio(false)
        setVideoUpgradeRequest(null)
        ringbackAudioRef.current?.pause()
        if (ringbackAudioRef.current) {
          ringbackAudioRef.current.currentTime = 0
        }
        phoneRingRef.current?.pause()
        if (phoneRingRef.current) {
          phoneRingRef.current.currentTime = 0
        }
        
        // Clear call timeout when ended
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current)
          callTimeoutRef.current = null
        }
        
        // 🌐 FORCE global media cleanup when call ends via signaling
        setTimeout(() => {
          console.log('🌐 Performing delayed global cleanup after signaling end...')
          forceStopAllMediaStreams()
        }, 500)
        
        // KHÔNG tự động đóng modal - để người dùng nhấn nút kết thúc để đóng
      }
    })

    callObj.on('mediastate', (state: any) => {
      // Media state changed
    })

    callObj.on('info', (info: any) => {
      // Call info received
    })
  }

  // Function để kiểm tra thiết bị mic/camera trước khi gọi
  const checkDeviceAvailability = async (isVideoCall: boolean): Promise<boolean> => {
    try {
      // Kiểm tra quyền truy cập thiết bị
      const constraints = isVideoCall 
        ? { audio: true, video: true }
        : { audio: true, video: false }
      
      // Test getUserMedia để xem có thể truy cập thiết bị không
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Kiểm tra audio tracks
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        toast.error('Thiết bị của bạn thiếu Micro để sử dụng chức năng này')
        stream.getTracks().forEach(track => track.stop())
        return false
      }
      
      // Kiểm tra video tracks nếu là video call
      if (isVideoCall) {
        const videoTracks = stream.getVideoTracks()
        if (videoTracks.length === 0) {
          toast.error('Thiết bị của bạn thiếu Camera để sử dụng chức năng video call')
          stream.getTracks().forEach(track => track.stop())
          return false
        }
      }
      
      // Dọn dẹp stream test
      stream.getTracks().forEach(track => track.stop())
      return true
      
    } catch (error: any) {
      console.error('❌ Device access error:', error)
      
      // Xử lý các loại lỗi cụ thể
      if (error.name === 'NotAllowedError') {
        toast.error('Vui lòng cấp quyền truy cập Micro và Camera để sử dụng chức năng gọi')
      } else if (error.name === 'NotFoundError') {
        toast.error('Thiết bị của bạn thiếu Micro để sử dụng chức năng này')
      } else if (error.name === 'NotReadableError') {
        toast.error('Thiết bị Micro/Camera đang được sử dụng bởi ứng dụng khác')
      } else {
        toast.error('Không thể truy cập thiết bị Micro/Camera. Vui lòng kiểm tra thiết bị của bạn')
      }
      
      return false
    }
  }

  // 📹 Function để toggle video local và thông báo cho remote user
  const toggleLocalVideo = useCallback(async () => {
    if (!isVideoCall || !localStreamRef.current || !call) {
      toast.error('Chỉ có thể tắt/bật video trong video call')
      return
    }

    const newVideoEnabled = !isLocalVideoEnabled
    console.log('📹 Toggling local video:', isLocalVideoEnabled, '->', newVideoEnabled)

    try {
      if (newVideoEnabled) {
        // Bật video - request camera lại
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        })
        
        // Replace local stream
        localStreamRef.current = videoStream
        ;(window as any).currentLocalStream = videoStream
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = videoStream
          localVideoRef.current.play().catch(() => {})
        }
        
        console.log('📹 Video enabled successfully')
        
      } else {
        // Tắt video - stop video tracks nhưng giữ audio
        if (localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks()
          videoTracks.forEach(track => {
            console.log('📹 Stopping video track:', track.kind)
            track.stop()
          })
          
          // Get audio-only stream
          const audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: false 
          })
          
          localStreamRef.current = audioStream
          ;(window as any).currentLocalStream = audioStream
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null
          }
          
          console.log('📹 Video disabled successfully')
        }
      }

      // Update local state
      setIsLocalVideoEnabled(newVideoEnabled)

      // Gửi thông báo cho remote user
      if (currentSessionId && data?.message?.user_id) {
        try {
          await sendVideoStatus({
            session_id: currentSessionId,
            from_user: data.message.user_id,
            to_user: toUserId,
            video_enabled: newVideoEnabled
          })
          
          console.log('📹 Video status sent successfully:', newVideoEnabled)
          
        } catch (error) {
          console.error('❌ Failed to send video status:', error)
          // Không block việc toggle local video
        }
      }

    } catch (error) {
      console.error('❌ Error toggling video:', error)
      toast.error('Không thể tắt/bật camera')
    }
  }, [isVideoCall, isLocalVideoEnabled, localStreamRef.current, call, currentSessionId, data?.message?.user_id, toUserId, sendVideoStatus])

  const makeCall = async (isVideoCall: boolean = true) => {
    // Set global call status immediately when starting call
    setGlobalIsInCall(true)
    
    // Initialize audio context immediately on user interaction
    initAudioContext()
    
    if (!client || !data?.message.user_id || !toUserId || !window.StringeeCall2) {
      console.error('❌ Cannot make call - missing requirements:', {
        client: !!client,
        userId: !!data?.message.user_id,
        toUserId: !!toUserId,
        StringeeCall2: !!window.StringeeCall2
      })
      return
    }

    // 🚫 Không thể gọi cho chính mình
    if (data.message.user_id === toUserId) {
      toast.error('Bạn không thể gọi cho chính mình')
      console.log('❌ Cannot call yourself')
      return
    }

    // 📞 Kiểm tra người nhận có đang bận không
    try {
      console.log('📞 Checking if user is busy:', toUserId)
      const busyResult = await checkUserBusyStatus({ user_id: toUserId })
      
      if (busyResult?.is_busy) {
        toast.error('Người dùng đang trong cuộc gọi khác')
        console.log('📞 User is busy:', toUserId)
        return // Dừng cuộc gọi nếu người nhận đang bận
      }
      
      console.log('📞 User is available:', toUserId)
    } catch (error) {
      console.warn('⚠️ Could not check busy status, proceeding with call:', error)
      // Vẫn tiếp tục gọi nếu không check được busy status
    }

    // ✅ Kiểm tra thiết bị mic/camera trước khi gọi
    const deviceAvailable = await checkDeviceAvailability(isVideoCall)
    if (!deviceAvailable) {
      console.log('❌ Device check failed - canceling call')
      return // Dừng thực hiện cuộc gọi nếu thiếu thiết bị
    }
    
    // Check if client is connected and authenticated
    if (!client.connected || !client.authenticated) {
      console.warn('⚠️ Stringee client not ready:', {
        connected: client.connected,
        authenticated: client.authenticated
      })
      // Still proceed but log the warning
    }

    try {
      // Tạo call session using Frappe hook
      const result = await createCallSession({
        caller_id: data.message.user_id,
        callee_id: toUserId,
        call_type: isVideoCall ? 'video' : 'audio'
      })
      
      console.log('📞 Create call session result:', result)
      
      if (result && result.session_id) {
        setCurrentSessionId(result.session_id)
      } else {
        console.warn('⚠️ No session_id in API response, using fallback')
        const fallbackSessionId = `outgoing_${data.message.user_id}_${toUserId}_${Date.now()}`
        setCurrentSessionId(fallbackSessionId)
      }
    } catch (error) {
      console.error('❌ Failed to create call session:', error)
      // Create fallback session ID on error
      const fallbackSessionId = `outgoing_${data.message.user_id}_${toUserId}_${Date.now()}`
      setCurrentSessionId(fallbackSessionId)
    }

    setCallStatus('connecting')
    setIsVideoCall(isVideoCall)
    
    // Reset progress ring animation
    setProgressKey(prev => prev + 1)
    
    // Create call with explicit video parameter
    console.log('📞 Creating StringeeCall2 with params:', {
      client: !!client,
      from: data.message.user_id,
      to: toUserId,
      isVideo: isVideoCall
    })
    
    const newCall = new window.StringeeCall2(client, data.message.user_id, toUserId, isVideoCall)
    
    console.log('📞 StringeeCall2 created with ID:', newCall?.callId || 'unknown')
    
    setCall(newCall)
    setupCallEvents(newCall)

    ringbackAudioRef.current = getRingtoneSoundAudio()
    ringbackAudioRef.current.loop = true
    ringbackAudioRef.current.volume = 0.7
    ringbackAudioRef.current.autoplay = true
    
    // Force play ringback with retry
    ringbackAudioRef.current.play().then(() => {
      // Ringback playing successfully
    }).catch(error => {
      // Retry after a short delay
      setTimeout(() => {
        if (ringbackAudioRef.current) {
          ringbackAudioRef.current.play().catch(() => {})
        }
      }, 500)
    })

    newCall.makeCall((res: any) => {
      console.log('📞 Call initiated, result:', res)
      
      // 📹 Force get local stream for video call immediately
      if (isVideoCall) {
        console.log('📹 Requesting local video stream for outgoing call...')
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            console.log('📹 Got local stream for outgoing call:', stream)
            localStreamRef.current = stream
            
            // 🌐 Store in global window for emergency cleanup
            ;(window as any).currentLocalStream = stream
            
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream
              localVideoRef.current.muted = true
              localVideoRef.current.play().catch(() => {})
            }
          })
          .catch(error => {
            console.log('❌ Failed to get local stream for outgoing call:', error)
          })
      }
      
      // Start 30 second timeout - independent timeout to ensure it works
      const timeoutId = setTimeout(async () => {
        console.log('Call timeout after 30 seconds - force hangup START')
        
        // Force hangup by simulating button click
        try {
          // If call is still connecting, force hangup
          if (newCall && (callStatus === 'connecting' || !isCallConnected)) {
            console.log('Forcing hangup due to timeout...')
            
            // 📹 FORCE STOP media tracks on timeout
            console.log('🔴 Stopping media tracks due to timeout')
            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach((track, index) => {
                console.log(`🔴 Stopping track ${index} on timeout:`, track.kind, track.readyState)
                track.stop()
              })
              localStreamRef.current = null
            }
            
            // Lưu lịch sử cuộc gọi nhỡ trước khi hangup
            await saveCallHistoryToChat(
              isVideoCall ? 'video' : 'audio',
              'missed'
            )
            
            // Directly hangup the StringeeCall
            newCall.hangup(() => {
              console.log('StringeeCall hangup completed')
            })
            
            // Also call our hangup function (không cần lưu lịch sử nữa vì đã lưu ở trên)
            await hangupCall()
          }
        } catch (error) {
          console.error('Error during timeout hangup:', error)
        }
        
        console.log('Call timeout after 30 seconds - force hangup END')
      }, 30000) // 30 seconds
      
      // Store the timeout ID
      callTimeoutRef.current = timeoutId
    })
  }

  const stopAllAudio = useCallback(() => {
    // Stop specific refs
    if (phoneRingRef.current) {
      phoneRingRef.current.pause()
      phoneRingRef.current.currentTime = 0
      phoneRingRef.current.loop = false
      phoneRingRef.current.volume = 0
      phoneRingRef.current.src = ''
    }
    
    if (ringbackAudioRef.current) {
      ringbackAudioRef.current.pause()
      ringbackAudioRef.current.currentTime = 0
      ringbackAudioRef.current.loop = false
      ringbackAudioRef.current.volume = 0
    }
    
    // Stop global audio using utility function
    stopAllAudioGlobal()
    
    // Force stop ALL audio elements in DOM
    document.querySelectorAll('audio').forEach((audio, index) => {
      if (!audio.src.includes('remoteAudio')) { // Don't stop call audio
        audio.pause()
        audio.currentTime = 0
        audio.loop = false
        audio.volume = 0
        
        // Remove ring audio from DOM
        if (audio.src.includes('phone-ring') || audio.src.includes('ringtone')) {
          try {
            audio.remove()
          } catch (e) {
            // Could not remove audio element
          }
        }
      }
    })
  }, [])

  // 🌐 GLOBAL Media Stream Cleanup - Force stop ALL active media streams
  const forceStopAllMediaStreams = useCallback(() => {
    console.log('🌐 FORCE STOPPING ALL MEDIA STREAMS globally...')
    
    try {
      // Method 1: Stop all tracks through navigator.mediaDevices
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
          console.log('📱 Found devices:', devices.length)
        }).catch(err => {
          console.log('❌ Device enumeration failed:', err)
        })
      }
      
      // Method 2: Force stop all video/audio elements in DOM
      const allVideoElements = document.querySelectorAll('video, audio')
      console.log('🎥 Found media elements:', allVideoElements.length)
      
      allVideoElements.forEach((element: any, index) => {
        if (element.srcObject && element.srcObject.getTracks) {
          console.log(`🔴 Stopping tracks from media element ${index}:`, element.srcObject.getTracks().length)
          element.srcObject.getTracks().forEach((track: MediaStreamTrack, trackIndex: number) => {
            console.log(`🔴 Force stopping track ${trackIndex} from element ${index}:`, track.kind, track.readyState)
            track.stop()
          })
          element.srcObject = null
        }
      })
      
      // Method 3: Try to access and stop current getUserMedia streams
      // This is a hack but sometimes works
      if ((window as any).currentLocalStream) {
        console.log('🔴 Stopping window.currentLocalStream')
        ;(window as any).currentLocalStream.getTracks().forEach((track: MediaStreamTrack) => {
          track.stop()
        })
        ;(window as any).currentLocalStream = null
      }
      
      console.log('✅ Global media stream cleanup completed')
      
    } catch (error) {
      console.error('❌ Global media cleanup error:', error)
    }
  }, [])

  // Comprehensive cleanup function
  const performCleanup = useCallback(() => {
    console.log('🧹 Performing comprehensive cleanup...')
    
    // Stop all media streams with detailed logging
    if (localStreamRef.current) {
      console.log('🔴 Stopping all local media tracks:', localStreamRef.current.getTracks().length)
      localStreamRef.current.getTracks().forEach((track, index) => {
        console.log(`🔴 Stopping track ${index}:`, track.kind, track.readyState)
        track.stop()
      })
      localStreamRef.current = null
      console.log('✅ Local stream ref cleared')
    } else {
      console.log('ℹ️ No local stream to stop - trying global cleanup...')
      
      // 🌐 Force global media cleanup when no local stream ref
      forceStopAllMediaStreams()
    }
    
    // Clear video sources
    if (localVideoRef.current) {
      console.log('🔴 Clearing local video source')
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      console.log('🔴 Clearing remote video source')
      remoteVideoRef.current.srcObject = null
    }
    if (remoteAudioRef.current) {
      console.log('🔴 Clearing remote audio source')
      remoteAudioRef.current.srcObject = null
    }
    
    // Stop all audio
    stopAllAudio()
    
    // Reset states
    setCall(null)
    setIncoming(null)
    setCallStatus(null)
    setCurrentSessionId(null)
    setIsCallConnected(false)
    setHasRemoteVideo(false)
    setHasRemoteAudio(false)
    setVideoUpgradeRequest(null)
    setCallerUserName('')
    
    // Stop network monitoring
    stopNetworkMonitoring()
    
    // Stop call timeout timer
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
    
    // Reset call history flag
    setCallHistorySaved(false)
    
    // Reset ending call flag
    setIsEndingCall(false)
    
    // Reset detailed stats view
    setShowDetailedStats(false)

    // Reset global call status
    setGlobalIsInCall(false)

    // 🌐 Gọi callback để đóng global modal
    if (isGlobalCall && onClose) {
      onClose()
    }
  }, [stopAllAudio, isGlobalCall, onClose])

  const answerCall = async () => {
    if (!incoming) return
    
    // Set global call status when answering call
    setGlobalIsInCall(true)
    
    // Initialize audio context immediately on user interaction
    initAudioContext()
    
    // ✅ Kiểm tra thiết bị mic/camera trước khi trả lời cuộc gọi
    const deviceAvailable = await checkDeviceAvailability(isVideoCall)
    if (!deviceAvailable) {
      console.log('❌ Device check failed - cannot answer call')
      return // Dừng trả lời cuộc gọi nếu thiếu thiết bị
    }
    
    // AGGRESSIVE audio stop BEFORE answering
    stopAllAudio()
    
    // Additional immediate audio cleanup
    if (phoneRingRef.current) {
      phoneRingRef.current.pause()
      phoneRingRef.current.currentTime = 0
      phoneRingRef.current.volume = 0
      phoneRingRef.current.src = ''
      phoneRingRef.current.loop = false
    }
    
            // Stop all audio using hook function
        stopAllAudioWithRefs()
    
    // Stop any remaining ring tones in DOM immediately
    document.querySelectorAll('audio').forEach(audio => {
      if (audio.src.includes('phone-ring') || audio.src.includes('ringtone')) {
        audio.pause()
        audio.currentTime = 0
        audio.volume = 0
        audio.loop = false
        try {
          audio.remove()
        } catch (e) {
          // Could not remove audio element
        }
      }
    })
    
    incoming.answer((res: any) => {
      console.log('✅ Incoming call answered:', res)
      console.log('📊 State before answer - callStatus:', callStatus, 'isCallConnected:', isCallConnected, 'call:', !!call, 'incoming:', !!incoming)
      
      setCall(incoming)
      setIncoming(null)
      // ✅ Set trạng thái tạm thời để UI update ngay, signalingstate sẽ confirm lại
      setCallStatus('connected') 
      setIsCallConnected(true)
      
      // 📹 Force get local stream for video call when answering
      if (isVideoCall) {
        console.log('📹 Requesting local video stream for answered call...')
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            console.log('📹 Got local stream for answered call:', stream)
            localStreamRef.current = stream
            
            // 🌐 Store in global window for emergency cleanup
            ;(window as any).currentLocalStream = stream
            
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream
              localVideoRef.current.muted = true
              localVideoRef.current.play().catch(() => {})
            }
          })
          .catch(error => {
            console.log('❌ Failed to get local stream for answered call:', error)
          })
      }
      
      console.log('📊 State after answer - setting call to incoming, incoming to null, status to connected')
      
      // 🔄 Gửi realtime event để thông báo cho bên gọi biết cuộc gọi đã được chấp nhận
      if (currentSessionId && data?.message?.user_id) {
        updateCallStatus({
          session_id: currentSessionId,
          status: 'connected',
          answered_at: new Date().toISOString()
        }).then(() => {
          console.log('✅ Call answered notification sent successfully')
        }).catch(error => {
          console.error('❌ Failed to send call answered notification:', error)
          // Continue anyway - don't block the call flow
        })
      }
      
      // Clear call timeout when answered
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current)
        callTimeoutRef.current = null
      }
      
      // ❌ Xóa startNetworkMonitoring - để signalingstate xử lý
      // Start network monitoring after answering
      // setTimeout(() => {
      //   startNetworkMonitoring()
      // }, 1000)
      
      // Multiple aggressive cleanups after answer
      setTimeout(() => {
        stopAllAudio()
      }, 10)
      
      setTimeout(() => {
        stopAllAudio()
      }, 100)
      
      setTimeout(() => {
        stopAllAudio()
      }, 500)
    })
  }

  const hangupCall = async () => {
    // Nếu call đã ended hoặc rejected, chỉ cần đóng modal - KHÔNG block
    if (callStatus === 'ended' || callStatus === 'rejected') {
      console.log('📱 Closing modal for ended/rejected call')
      performCleanup()
      return
    }
    
    // Prevent spam clicking chỉ khi đang có active call
    if (isEndingCall) {
      console.log('❌ Hangup already in progress - ignoring duplicate call')
      return
    }
    setIsEndingCall(true)
    
    if (!call) {
      console.log('❌ No active call to hangup')
      performCleanup()
      return
    }
    
    // Lưu lịch sử cuộc gọi nếu chưa lưu
    if (!callHistorySaved) {
      if (isCallConnected && callDuration > 0) {
        await saveCallHistoryToChat(
          isVideoCall ? 'video' : 'audio',
          'completed',
          callDuration
        )
      } else if (callStatus === 'connecting') {
        // Cuộc gọi chưa được trả lời
        await saveCallHistoryToChat(
          isVideoCall ? 'video' : 'audio',
          'ended'
        )
      }
    }
    
    // Gọi API để cập nhật trạng thái và gửi realtime TRƯỚC khi hangup
    if (currentSessionId) {
      try {
        console.log('📞 Updating call status to ended for session:', currentSessionId)
        await updateCallStatus({
          session_id: currentSessionId,
          status: 'ended',
          end_time: new Date().toISOString()
        })
        console.log('✅ Call status updated to ended successfully')
      } catch (error) {
        console.error('❌ Failed to update call status to ended:', error)
        // Continue with hangup even if API fails
      }
    }
    
    // Clear call timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
    
    // Ngắt audio ngay lập tức
    ringbackAudioRef.current?.pause()
    if (ringbackAudioRef.current) {
      ringbackAudioRef.current.currentTime = 0
    }
    phoneRingRef.current?.pause()
    if (phoneRingRef.current) {
      phoneRingRef.current.currentTime = 0
    }
    
    // 📹 FORCE STOP camera/media tracks NGAY LẬP TỨC
    console.log('🔴 Stopping media tracks immediately...')
    if (localStreamRef.current) {
      console.log('🔴 Stopping local stream tracks:', localStreamRef.current.getTracks().length)
      localStreamRef.current.getTracks().forEach((track, index) => {
        console.log(`🔴 Stopping track ${index}:`, track.kind, track.readyState)
        track.stop()
      })
      localStreamRef.current = null
    }
    
    // Clear video sources immediately
    if (localVideoRef.current) {
      console.log('🔴 Clearing local video source')
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      console.log('🔴 Clearing remote video source') 
      remoteVideoRef.current.srcObject = null
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }

    // Hangup call
    call.hangup((res: any) => {
      console.log('📞 Call hangup result:', res)
    })
    
    // 🌐 FORCE global media cleanup after hangup
    setTimeout(() => {
      console.log('🌐 Performing delayed global cleanup after hangup...')
      forceStopAllMediaStreams()
    }, 500)
    
    // Cập nhật trạng thái ended nhưng KHÔNG đóng modal
    setCallStatus('ended')
    setIsCallConnected(false)
    setHasRemoteVideo(false)
    setHasRemoteAudio(false)
    setVideoUpgradeRequest(null)
    
    // KHÔNG tự động đóng modal - để người dùng nhấn nút đóng
  }

  const rejectCall = async () => {
    if (!incoming) return
    
    // Lưu lịch sử cuộc gọi bị từ chối
    await saveCallHistoryToChat(
      isVideoCall ? 'video' : 'audio',
      'rejected'
    )
    
    // Clear call timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
    
    // AGGRESSIVE audio stop immediately
    stopAllAudio()
    
    // Additional immediate audio cleanup for reject
    if (phoneRingRef.current) {
      phoneRingRef.current.pause()
      phoneRingRef.current.currentTime = 0
      phoneRingRef.current.volume = 0
      phoneRingRef.current.src = ''
      phoneRingRef.current.loop = false
    }
    
    // phoneRingAudio handled by hook
    stopAllAudioGlobal()
    
    // Force remove ring audio from DOM
    document.querySelectorAll('audio').forEach(audio => {
      if (audio.src.includes('phone-ring') || audio.src.includes('ringtone')) {
        audio.pause()
        audio.currentTime = 0
        audio.volume = 0
        audio.loop = false
        try {
          audio.remove()
        } catch (e) {
          // Could not remove audio element
        }
      }
    })
    
    // 📹 FORCE STOP media tracks khi reject call
    console.log('🔴 Stopping media tracks on reject...')
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track, index) => {
        console.log(`🔴 Stopping track ${index} on reject:`, track.kind, track.readyState)
        track.stop()
      })
      localStreamRef.current = null
    }
    
    // Clear video sources immediately
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }

    incoming.reject((res: any) => {
      console.log('📞 Call rejected result:', res)
    })
    
    // 🌐 FORCE global media cleanup after reject
    setTimeout(() => {
      console.log('🌐 Performing delayed global cleanup after reject...')
      forceStopAllMediaStreams()
    }, 500)
    
    // Cập nhật UI ngay lập tức
    setCallStatus('rejected')
    setIsCallConnected(false)
    setHasRemoteVideo(false)
    setHasRemoteAudio(false)
    setVideoUpgradeRequest(null)
    
    // Final cleanup to ensure no audio continues
    setTimeout(() => {
      stopAllAudio()
    }, 100)
    
    // KHÔNG tự động đóng modal - để người dùng nhấn nút đóng
  }

  const upgradeToVideo = async () => {
    if (!call || !data?.message.user_id) {
      return
    }

    // ✅ Kiểm tra camera trước khi upgrade sang video call
    const deviceAvailable = await checkDeviceAvailability(true) // true = video call
    if (!deviceAvailable) {
      console.log('❌ Camera check failed - cannot upgrade to video')
      return // Dừng upgrade nếu thiếu camera
    }

    // If no currentSessionId, try to create one based on call info
    let sessionId = currentSessionId
    if (!sessionId && call?.callId) {
      sessionId = `call_${data.message.user_id}_${toUserId}_${Date.now()}`
      setCurrentSessionId(sessionId)
    }

    if (!sessionId) {
      return
    }
    
    try {
      
      // Check if call has upgradeToVideoCall method
      if (typeof call.upgradeToVideoCall === 'function') {
        // Try to upgrade immediately if the method exists
        call.upgradeToVideoCall()
        setIsVideoCall(true)
      }
      
      // Send video upgrade request to the other user using Frappe hook
      console.log('📹 Sending video upgrade request:', {
        session_id: sessionId,
        from_user: data.message.user_id,
        to_user: toUserId
      })
      
      await sendVideoUpgradeRequest({
        session_id: sessionId,
        from_user: data.message.user_id,
        to_user: toUserId
      })
      
      console.log('✅ Video upgrade request sent successfully')
      
    } catch (error) {
      // Try to upgrade locally even if API fails
      if (typeof call.upgradeToVideoCall === 'function') {
        try {
          call.upgradeToVideoCall()
          setIsVideoCall(true)
        } catch (fallbackError) {
          // Fallback upgrade also failed
        }
      }
    }
  }

  const acceptVideoUpgrade = async () => {
    if (!videoUpgradeRequest || !call) return
    
    // ✅ Kiểm tra camera trước khi chấp nhận video upgrade
    const deviceAvailable = await checkDeviceAvailability(true) // true = video call
    if (!deviceAvailable) {
      console.log('❌ Camera check failed - cannot accept video upgrade')
      return // Dừng chấp nhận video upgrade nếu thiếu camera
    }
    
    try {
      // Request camera permission first
      let videoStream: MediaStream | null = null
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        })
        
        // 🌐 Store in global window for emergency cleanup
        ;(window as any).currentLocalStream = videoStream
      } catch (cameraError) {
        toast.error('Không thể truy cập camera. Vui lòng cho phép truy cập camera để sử dụng video call.')
        return
      }
      
      // Send acceptance response using Frappe hook
      await respondVideoUpgrade({
        session_id: videoUpgradeRequest.sessionId,
        accepted: true
      })
      
      // Upgrade the call with new video stream
      if (typeof call.upgradeToVideoCall === 'function') {
        call.upgradeToVideoCall()
      }
      
      // Replace local stream with video stream
      if (videoStream && localVideoRef.current) {
        localVideoRef.current.srcObject = videoStream
        localStreamRef.current = videoStream
        localVideoRef.current.play().catch(() => {})
      }
      
      setIsVideoCall(true)
      setVideoUpgradeRequest(null)
      
    } catch (error) {
      toast.error('Có lỗi khi chuyển sang video call. Vui lòng thử lại.')
    }
  }

  const rejectVideoUpgrade = async () => {
    if (!videoUpgradeRequest) return
    
    try {
      // Send rejection response using Frappe hook
      await respondVideoUpgrade({
        session_id: videoUpgradeRequest.sessionId,
        accepted: false
      })
      
      setVideoUpgradeRequest(null)
      
    } catch (error) {
      // Still close the popup even if API fails
      setVideoUpgradeRequest(null)
    }
  }



  return (
    <>
      {/* CSS Animation for pulse effects and progress ring */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 8px 32px rgba(46, 213, 115, 0.4), 0 0 0 0px rgba(46, 213, 115, 0.3);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 8px 32px rgba(46, 213, 115, 0.4), 0 0 0 12px rgba(46, 213, 115, 0.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            box-shadow: 0 8px 32px rgba(46, 213, 115, 0.4), 0 0 0 0px rgba(46, 213, 115, 0.3);
            opacity: 1;
          }
        }
        
        @keyframes progressRing {
          0% {
            stroke-dashoffset: 377;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        
        .progress-ring {
          transform: rotate(-90deg);
        }
        
        .progress-ring-circle {
          stroke-dasharray: 377;
          stroke-dashoffset: 377;
          animation: progressRing 30s linear forwards;
        }
      `}</style>
      
      {/* 🎯 Call Button with Dropdown - chỉ hiển thị khi không phải global call và không đang trong cuộc gọi */}
      {!isGlobalCall && !call && !incoming && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <button
              disabled={globalIsInCall}
              className="bg-transparent text-gray-12 hover:bg-gray-3 disabled:opacity-50"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                border: 'none',
                color: appearance === 'light' ? '#000000' : '#ffffff',
                cursor: globalIsInCall ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              title={globalIsInCall ? "Cuộc gọi đang diễn ra" : "Tùy chọn cuộc gọi"}
            >
              <FiPhone size={18} />
              <FiChevronDown size={12} style={{ position: 'absolute', bottom: '-2px', right: '2px' }} />
            </button>
          </DropdownMenu.Trigger>
          
          <DropdownMenu.Content>
            <DropdownMenu.Item onClick={() => makeCall(false)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiPhoneCall size={16} />
                <span>Gọi Thoại</span>
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => makeCall(true)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiVideo size={16} />
                <span>Gọi Video</span>
              </div>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}

      {/* Call Modal - Zalo style - hiển thị khi có call hoặc là global call */}
      {(call || incoming || isGlobalCall) && (
        <div 
          key={`call-modal-${forceRender}-${callStatus}`} 
          onClick={() => {
            // Force audio context resume on any click in modal
            initAudioContext()
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
          <div           style={{
            width: '420px',
            height: '650px',
            backgroundColor: getBackgroundColor('modal', appearance),
            borderRadius: '20px',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: appearance === 'light' 
              ? '0 20px 60px rgba(0, 0, 0, 0.15)' 
              : '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: appearance === 'light' ? '1px solid #e5e7eb' : 'none'
          }}>
            {/* Video Area */}
            <div style={{ 
              flex: 1, 
              position: 'relative',
              background: appearance === 'light' 
                ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                : 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)'
            }}>
              {/* Remote Video */}
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                controls={false}
                muted={false}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  display: isRemoteVideoEnabled ? 'block' : 'none'
                }} 
              />
              
              {/* 📹 Remote Video Disabled Overlay */}
              {isVideoCall && !isRemoteVideoEnabled && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: appearance === 'light' ? '#f3f4f6' : '#1f2937',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: getIconColor('gray', appearance)
                }}>
                  <div style={{
                    fontSize: '80px',
                    marginBottom: '16px',
                    opacity: 0.7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiVideoOff size={80} />
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '500',
                    color: getIconColor('gray', appearance)
                  }}>
                    {displayName} đã tắt camera
                  </div>
                </div>
              )}
              
              {/* Local Video (PiP) - Always show when in video call */}
              {isVideoCall && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  width: '100px',
                  height: '140px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: appearance === 'light' ? '3px solid #d1d5db' : '3px solid #404040',
                  backgroundColor: appearance === 'light' ? '#f3f4f6' : '#2a2a2a',
                  boxShadow: appearance === 'light' 
                    ? '0 4px 20px rgba(0, 0, 0, 0.1)' 
                    : '0 4px 20px rgba(0, 0, 0, 0.3)',
                  zIndex: 20 // Ensure it's above overlay
                }}>
                  {/* Local Video Element */}
                  {isLocalVideoEnabled && (
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      controls={false}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        transform: 'scaleX(-1)' // Mirror effect for natural selfie view
                      }} 
                    />
                  )}
                  
                  {/* Local Video Disabled Overlay */}
                  {!isLocalVideoEnabled && (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: appearance === 'light' ? '#e5e7eb' : '#374151'
                    }}>
                      <div style={{
                        fontSize: '24px',
                        marginBottom: '4px',
                        opacity: 0.7,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FiVideoOff size={24} />
                      </div>
                      <div style={{
                        fontSize: '8px',
                        color: getIconColor('gray', appearance),
                        textAlign: 'center'
                      }}>
                        Camera tắt
                      </div>
                    </div>
                  )}
                  
                  {/* Local video indicator */}
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '4px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backdropFilter: 'blur(4px)'
                  }}>
                    Bạn
                  </div>
                </div>
              )}

            {/* User Info Overlay - Zalo style - Ẩn chỉ khi Gọi video có remote video */}
              {(callStatus === 'ended' || callStatus === 'rejected' || callStatus === 'connecting' || !isCallConnected || !isVideoCall || (isVideoCall && !hasRemoteVideo)) && (
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: appearance === 'light'
                    ? 'linear-gradient(135deg, rgba(248, 249, 250, 0.95) 0%, rgba(233, 236, 239, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(42, 42, 42, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)',
                  color: getIconColor('white', appearance)
                }}>
                                     {/* Avatar với animation cho active call */}
                   <div style={{
                     width: '120px',
                     height: '120px',
                     margin: '0 auto 24px',
                     position: 'relative',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center'
                   }}>
                     {/* Progress Ring - chỉ hiển thị khi đang gọi đi */}
                     {call && callStatus === 'connecting' && (
                       <svg 
                         key={`progress-${progressKey}`}
                         width="140" 
                         height="140" 
                         style={{
                           position: 'absolute',
                           top: '-10px',
                           left: '-10px',
                           zIndex: 2
                         }}
                         className="progress-ring"
                       >
                         <circle
                           cx="70"
                           cy="70"
                           r="60"
                           fill="transparent"
                           stroke={appearance === 'light' ? '#e5e7eb' : '#374151'}
                           strokeWidth="3"
                         />
                         <circle
                           cx="70"
                           cy="70"
                           r="60"
                           fill="transparent"
                           stroke={getIconColor('blue', appearance)}
                           strokeWidth="3"
                           className="progress-ring-circle"
                           style={{
                             filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
                           }}
                         />
                       </svg>
                     )}
                     
                     {/* Avatar */}
                     <div style={{
                       width: '120px',
                       height: '120px',
                       borderRadius: '50%',
                       backgroundColor: userAvatar ? 'transparent' : (callStatus === 'connected' && !isVideoCall 
                         ? getIconColor('green', appearance) 
                         : getBackgroundColor('button', appearance)),
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       fontSize: userAvatar ? '16px' : '48px',
                       border: callStatus === 'connected' && !isVideoCall 
                         ? `4px solid ${getIconColor('green', appearance)}` 
                         : `4px solid ${getIconColor('gray', appearance)}`,
                       boxShadow: callStatus === 'connected' && !isVideoCall
                         ? `0 8px 32px ${getIconColor('green', appearance)}66, 0 0 0 8px ${getIconColor('green', appearance)}1a`
                         : appearance === 'light' 
                           ? '0 8px 32px rgba(0, 0, 0, 0.1)'
                           : '0 8px 32px rgba(0, 0, 0, 0.4)',
                       animation: callStatus === 'connected' && !isVideoCall 
                         ? 'pulse 2s infinite' 
                         : 'none',
                       transition: 'all 0.3s ease',
                       backgroundImage: userAvatar ? `url(${userAvatar})` : 'none',
                       backgroundSize: 'cover',
                       backgroundPosition: 'center',
                       position: 'relative',
                       overflow: 'hidden',
                       zIndex: 1
                     }}>
                       {!userAvatar && (
                         // Fallback to initials when no avatar
                         <div style={{
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           width: '100%',
                           height: '100%',
                           fontSize: '36px',
                           fontWeight: '600',
                           color: getIconColor('white', appearance)
                         }}>
                           {avatarInitials}
                         </div>
                       )}
                       

                     </div>
                   </div>
                  
                                     {/* User Name */}
                   <h2 style={{ 
                     margin: '0 0 12px', 
                     fontSize: '28px', 
                     fontWeight: '600',
                     color: getIconColor('white', appearance),
                     textShadow: appearance === 'light' ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.3)'
                   }}>
                     {displayName}
                   </h2>
                  
                                     {/* Status */}
                   <p style={{ 
                     margin: 0, 
                     fontSize: '18px', 
                     color: getIconColor('gray', appearance),
                     fontWeight: '400'
                   }}>
                     {callStatus === 'ended' 
                       ? (callDuration > 0 
                           ? `Cuộc gọi đã kết thúc - Thời gian: ${formatCallDuration(callDuration)}`
                           : (incoming && !isCallConnected ? 'Cuộc gọi nhỡ' : 'Cuộc gọi đã kết thúc'))
                       : callStatus === 'rejected'
                         ? 'Cuộc gọi bị từ chối'
                         : incoming 
                           ? 'Cuộc gọi đến...' 
                           : call 
                             ? (callStatus === 'connected' 
                                 ? (isVideoCall && hasRemoteVideo 
                                     ? 'Gọi video - Đã kết nối'
                                     : isVideoCall && !hasRemoteVideo
                                       ? 'Đang chờ video...'
                                       : 'Đang nói chuyện')
                                 : (isVideoCall ? 'Đang gọi video...' : 'Đang gọi...'))
                             : 'Đang kết nối...'
                     }
                   </p>
                   
                   {/* Call type indicator với trạng thái chi tiết */}
                   <div style={{
                     marginTop: '16px',
                     padding: '8px 20px',
                     backgroundColor: callStatus === 'connected' && !isVideoCall
                       ? `${getIconColor('green', appearance)}33` 
                       : isVideoCall 
                         ? `${getIconColor('blue', appearance)}33`
                         : `${getIconColor('gray', appearance)}33`,
                     borderRadius: '20px',
                     fontSize: '14px',
                     color: callStatus === 'connected' && !isVideoCall
                       ? getIconColor('green', appearance)
                       : isVideoCall
                         ? getIconColor('blue', appearance)
                         : getIconColor('gray', appearance),
                     border: callStatus === 'connected' && !isVideoCall
                       ? `1px solid ${getIconColor('green', appearance)}66`
                       : isVideoCall
                         ? `1px solid ${getIconColor('blue', appearance)}66`
                         : 'none',
                     whiteSpace: 'nowrap',
                     minWidth: 'max-content'
                                        }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         {isVideoCall ? <FiVideo size={16} /> : <FiPhoneCall size={16} />}
                         <span>
                           {isVideoCall ? 'Gọi video' : 'Gọi thoại'}
                           {callStatus === 'connected' && !isVideoCall && ' - Đang hoạt động'}
                           {callStatus === 'connecting' && ' - Đang kết nối...'}
                         </span>
                       </div>
                     </div>
                   
                   {/* Thời gian cuộc gọi */}
                   {(callStatus === 'connected' || callStatus === 'ended') && callDuration > 0 && (
                     <div style={{
                       marginTop: '12px',
                       fontSize: callStatus === 'ended' ? '20px' : '16px',
                       color: callStatus === 'ended' ? getIconColor('white', appearance) : getIconColor('green', appearance),
                       fontWeight: '600',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '8px'
                     }}>
                       {callStatus === 'connected' && (
                         <div style={{
                           width: '8px',
                           height: '8px',
                           borderRadius: '50%',
                           backgroundColor: getIconColor('green', appearance),
                           animation: 'pulse 1s infinite'
                         }}></div>
                       )}
                       <span style={{
                         background: callStatus === 'ended' 
                           ? 'linear-gradient(45deg, #4ade80, #22c55e)'
                           : 'none',
                         WebkitBackgroundClip: callStatus === 'ended' ? 'text' : 'initial',
                         WebkitTextFillColor: callStatus === 'ended' ? 'transparent' : 'inherit',
                         fontSize: callStatus === 'ended' ? '22px' : '16px'
                       }}>
                         {formatCallDuration(callDuration)}
                       </span>
                     </div>
                   )}
                   
                   {/* Quick Network Quality Indicator */}
                   {callStatus === 'connected' && networkStats.ping !== null && !showDetailedStats && (
                     <div 
                       onClick={() => setShowDetailedStats(true)}
                       style={{
                         marginTop: '8px',
                         fontSize: '14px',
                         color: getIconColor('gray', appearance),
                         fontWeight: '400',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         gap: '6px',
                         cursor: 'pointer',
                         padding: '4px 8px',
                         borderRadius: '8px',
                         background: 'rgba(0, 0, 0, 0.2)',
                         transition: 'all 0.2s ease'
                       }}
                       onMouseOver={(e) => {
                         e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'
                       }}
                       onMouseOut={(e) => {
                         e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
                       }}
                       title="Click để xem chi tiết mạng"
                     >
                       <span>📡</span>
                       <span style={{ 
                         color: networkStats.ping < 100 ? getIconColor('green', appearance) : networkStats.ping < 300 ? '#fbbf24' : '#ef4444',
                         fontWeight: '500'
                       }}>
                         {networkStats.ping < 100 ? 'Mạng tốt' : networkStats.ping < 300 ? 'Mạng trung bình' : 'Mạng yếu'}
                       </span>
                       <span style={{ fontSize: '12px', opacity: 0.7 }}>
                         ({networkStats.ping}ms)
                       </span>
                     </div>
                   )}
                </div>
              )}
              
                            {/* Network Stats Overlay - Show only when connected and detailed view enabled */}
              {callStatus === 'connected' && showDetailedStats && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  background: appearance === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  backdropFilter: 'blur(8px)',
                  fontSize: '12px',
                  color: appearance === 'light' ? '#374151' : 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: '120px',
                  zIndex: 10,
                  border: appearance === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : 'none'
                }}>
                  <div style={{ 
                    fontWeight: '600', 
                    marginBottom: '4px', 
                    color: '#4ade80',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    📡 Chi tiết mạng
                    <button
                      onClick={() => setShowDetailedStats(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: appearance === 'light' ? '#6b7280' : '#9ca3af',
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '0',
                        marginLeft: '8px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  {networkStats.ping !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Độ trễ:</span>
                      <span style={{ 
                        color: networkStats.ping < 100 ? '#4ade80' : networkStats.ping < 300 ? '#fbbf24' : '#ef4444',
                        fontWeight: '600'
                      }}>
                        {networkStats.ping}ms
                      </span>
                    </div>
                  )}
                  
                  {networkStats.packetLoss !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Mất gói:</span>
                      <span style={{ 
                        color: networkStats.packetLoss < 1 ? '#4ade80' : networkStats.packetLoss < 5 ? '#fbbf24' : '#ef4444',
                        fontWeight: '600'
                      }}>
                        {networkStats.packetLoss}%
                      </span>
                    </div>
                  )}
                  
                  {networkStats.bitrate !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Bitrate:</span>
                      <span style={{ color: appearance === 'light' ? '#6b7280' : '#94a3b8' }}>
                        {networkStats.bitrate}kbps
                      </span>
                    </div>
                  )}
                  
                  {networkStats.networkType && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Kết nối:</span>
                      <span style={{ color: appearance === 'light' ? '#6b7280' : '#94a3b8' }}>
                        {networkStats.networkType}
                      </span>
                    </div>
                  )}
                  
                  {/* Show loading if no data yet */}
                  {networkStats.ping === null && networkStats.packetLoss === null && (
                    <div style={{ color: appearance === 'light' ? '#6b7280' : '#94a3b8', textAlign: 'center' }}>
                      Đang đo...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls - Zalo style */}
            <div style={{
              padding: '30px 24px',
              backgroundColor: appearance === 'light' ? '#f8f9fa' : '#0d0d0d',
              borderTop: appearance === 'light' ? '1px solid #e5e7eb' : '1px solid #333',
              display: 'flex',
              justifyContent: 'center',
              gap: '30px',
              alignItems: 'center'
            }}>
              {incoming && !call && callStatus !== 'rejected' && callStatus !== 'ended' ? (
                // Incoming call controls - Zalo style
                <>
                  <button
                    onClick={rejectCall}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: getIconColor('red', appearance),
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      boxShadow: '0 4px 16px rgba(255, 71, 87, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)'
                      e.currentTarget.style.opacity = '0.9'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    <FiPhoneOff size={24} />
                  </button>
                  <button
                    onClick={answerCall}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: getIconColor('green', appearance),
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      boxShadow: '0 4px 16px rgba(46, 213, 115, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)'
                      e.currentTarget.style.opacity = '0.9'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    <FiPhone size={24} />
                  </button>
                </>
              ) : (
                // In-call controls - Zalo style
                <>
                                    {/* Mute/Unmute Button - only show when connected */}
                   {callStatus === 'connected' && (
                     <button
                       onClick={toggleMute}
                       style={{
                         width: '54px',
                         height: '54px',
                         borderRadius: '50%',
                         border: 'none',
                         backgroundColor: isMuted ? getIconColor('red', appearance) : getBackgroundColor('button', appearance),
                         color: isMuted ? 'white' : getIconColor('white', appearance),
                         cursor: 'pointer',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         fontSize: '20px',
                         boxShadow: isMuted 
                           ? '0 3px 12px rgba(255, 107, 107, 0.4)' 
                           : `0 3px 12px ${getIconColor('gray', appearance)}33`,
                         transition: 'all 0.2s ease'
                       }}
                       onMouseOver={(e) => {
                         e.currentTarget.style.transform = 'scale(1.05)'
                         e.currentTarget.style.opacity = '0.8'
                       }}
                       onMouseOut={(e) => {
                         e.currentTarget.style.transform = 'scale(1)'
                         e.currentTarget.style.opacity = '1'
                       }}
                       title={isMuted ? "Bật tiếng" : "Tắt tiếng"}
                     >
                       {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
                     </button>
                   )}

                  {/* 📹 Video Toggle Button - chỉ hiển thị trong video call */}
                  {isVideoCall && callStatus === 'connected' && (
                    <button
                      onClick={toggleLocalVideo}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: !isLocalVideoEnabled ? getIconColor('red', appearance) : getBackgroundColor('button', appearance),
                        color: !isLocalVideoEnabled ? 'white' : getIconColor('white', appearance),
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        boxShadow: !isLocalVideoEnabled 
                          ? '0 3px 12px rgba(255, 107, 107, 0.4)' 
                          : `0 3px 12px ${getIconColor('gray', appearance)}33`,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.opacity = '0.8'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.opacity = '1'
                      }}
                      title={isLocalVideoEnabled ? "Tắt camera" : "Bật camera"}
                    >
                      {isLocalVideoEnabled ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
                    </button>
                  )}

                  {!isVideoCall && callStatus === 'connected' && (
                    <button
                      onClick={upgradeToVideo}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: getBackgroundColor('button', appearance),
                        color: getIconColor('blue', appearance),
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        boxShadow: `0 3px 12px ${getIconColor('gray', appearance)}33`,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.opacity = '0.8'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.opacity = '1'
                      }}
                      title="Bật camera"
                    >
                      <FiVideo size={20} />
                    </button>
                  )}
                  <button
                    onClick={hangupCall}
                    disabled={isEndingCall && !['ended', 'rejected'].includes(callStatus || '')}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: ['ended', 'rejected'].includes(callStatus || '')
                        ? getBackgroundColor('button', appearance) 
                        : (isEndingCall && !['ended', 'rejected'].includes(callStatus || ''))
                          ? getIconColor('gray', appearance)
                          : getIconColor('red', appearance),
                      color: ['ended', 'rejected'].includes(callStatus || '')
                        ? getIconColor('white', appearance) 
                        : 'white',
                      cursor: (isEndingCall && !['ended', 'rejected'].includes(callStatus || ''))
                        ? 'not-allowed' 
                        : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      boxShadow: ['ended', 'rejected'].includes(callStatus || '')
                        ? `0 4px 16px ${getIconColor('gray', appearance)}33`
                        : '0 4px 16px rgba(255, 71, 87, 0.3)',
                      transition: 'all 0.2s ease',
                      opacity: (isEndingCall && !['ended', 'rejected'].includes(callStatus || ''))
                        ? '0.6' 
                        : '1'
                    }}
                    onMouseOver={(e) => {
                      if (!(isEndingCall && !['ended', 'rejected'].includes(callStatus || ''))) {
                        e.currentTarget.style.transform = 'scale(1.1)'
                        e.currentTarget.style.opacity = '0.9'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!(isEndingCall && !['ended', 'rejected'].includes(callStatus || ''))) {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.opacity = '1'
                      }
                    }}
                    title={
                      (isEndingCall && !['ended', 'rejected'].includes(callStatus || ''))
                        ? 'Đang kết thúc cuộc gọi...'
                        : ['ended', 'rejected'].includes(callStatus || '')
                          ? 'Đóng' 
                          : 'Kết thúc cuộc gọi'
                    }
                  >
                    <FiPhoneOff size={24} />
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Hidden audio element for remote audio */}
          <audio 
            ref={remoteAudioRef} 
            autoPlay 
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Video Upgrade Request Dialog */}
      {videoUpgradeRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: appearance === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.8)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: getBackgroundColor('modal', appearance),
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '400px',
            textAlign: 'center',
            border: appearance === 'light' ? '1px solid #e5e7eb' : '1px solid #333',
            boxShadow: appearance === 'light' 
              ? '0 10px 40px rgba(0, 0, 0, 0.15)' 
              : '0 10px 40px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
              color: getIconColor('blue', appearance)
            }}>
              <FiVideo size={48} />
            </div>
            <h3 style={{
              color: getIconColor('white', appearance),
              fontSize: '22px',
              margin: '0 0 12px',
              fontWeight: '600'
            }}>
              Yêu cầu bật camera
            </h3>
                         <p style={{
               color: getIconColor('gray', appearance),
               fontSize: '16px',
               margin: '0 0 30px',
               lineHeight: '1.4'
             }}>
               <strong style={{ color: getIconColor('white', appearance) }}>{videoUpgradeRequest.fromUserName || callerUserName || videoUpgradeRequest.fromUser}</strong> muốn chuyển sang chế độ Gọi video. Bạn có đồng ý không?
             </p>
            <div style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center'
            }}>
              <button
                onClick={rejectVideoUpgrade}
                style={{
                  padding: '12px 24px',
                  borderRadius: '25px',
                  border: 'none',
                  backgroundColor: getBackgroundColor('button', appearance),
                  color: getIconColor('white', appearance),
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '100px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.opacity = '0.8'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                Từ chối
              </button>
              <button
                onClick={acceptVideoUpgrade}
                style={{
                  padding: '12px 24px',
                  borderRadius: '25px',
                  border: 'none',
                  backgroundColor: getIconColor('green', appearance),
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '100px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.opacity = '0.9'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 