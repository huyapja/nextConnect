import { useFrappeEventListener } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { stopAllAudio as stopAllAudioGlobal, initAudioContext } from '../utils/stringeeAudio'
import { CallStatus, VideoUpgradeRequest } from '../types'

interface UseCallEventHandlersProps {
  currentSessionId: string | null
  callStatus: CallStatus
  incoming: any
  call: any
  data: any
  stopAllAudioWithRefs: () => void
  setIsCallConnected: (connected: boolean) => void
  setCallStatus: (status: CallStatus) => void
  callTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
  startNetworkMonitoring: (call: any) => void
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  remoteAudioRef: React.RefObject<HTMLAudioElement>
  setHasRemoteVideo: (hasVideo: boolean) => void
  setHasRemoteAudio: (hasAudio: boolean) => void
  setVideoUpgradeRequest: (request: VideoUpgradeRequest | null) => void
  setForceRender: (fn: (prev: number) => number) => void
  setIsVideoCall: (isVideo: boolean) => void
  setIsRemoteVideoEnabled: (enabled: boolean) => void
  setCurrentSessionId: (id: string) => void
  setCallerUserName: (name: string) => void
  localStreamRef: React.MutableRefObject<MediaStream | null>
}

export function useCallEventHandlers({
  currentSessionId,
  callStatus,
  incoming,
  call,
  data,
  stopAllAudioWithRefs,
  setIsCallConnected,
  setCallStatus,
  callTimeoutRef,
  startNetworkMonitoring,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  setHasRemoteVideo,
  setHasRemoteAudio,
  setVideoUpgradeRequest,
  setForceRender,
  setIsVideoCall,
  setIsRemoteVideoEnabled,
  setCurrentSessionId,
  setCallerUserName,
  localStreamRef
}: UseCallEventHandlersProps) {

  // Listen for realtime call status updates
  useFrappeEventListener('call_status_update', (eventData: any) => {
    console.log('🔄 Received call_status_update:', eventData, 'currentSessionId:', currentSessionId)
    
    // Match by session ID to ensure we only handle our call
    if (eventData.session_id === currentSessionId) {
      
      // Handle call connected notification - chỉ cho outgoing calls
      if (eventData.status === 'connected' && callStatus === 'connecting' && !incoming) {
        console.log('✅ Received call connected notification via realtime for outgoing call')
        
        // Aggressive audio stop
        stopAllAudioGlobal()
        
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
      if (eventData.status === 'ended') {
        console.log('🔚 Received call ended notification via realtime')
        
        // AGGRESSIVE audio stop immediately - caller hangup
        stopAllAudioGlobal()
        
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
  useFrappeEventListener('video_upgrade_response', (eventData: any) => {
    if (eventData.session_id === currentSessionId) {
      if (eventData.accepted && call) {
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
  useFrappeEventListener('video_status_update', (eventData: any) => {
    if (eventData.session_id === currentSessionId) {
      console.log('📹 Received video status update:', eventData)
      setIsRemoteVideoEnabled(eventData.video_enabled)
      
      if (eventData.video_enabled) {
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
} 