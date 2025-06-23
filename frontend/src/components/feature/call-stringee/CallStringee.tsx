import { useEffect, useRef, useState, useCallback } from 'react'
import { useFrappeGetCall, useFrappeEventListener, useFrappeGetDoc } from 'frappe-react-sdk'
import { 
  FiPhone, FiPhoneCall, FiPhoneOff, 
  FiVideo, FiMic, FiMicOff, FiHeadphones 
} from 'react-icons/fi'
import { useTheme } from '@/ThemeProvider'

let phoneRingAudio: HTMLAudioElement | null = null
let ringbackAudio: HTMLAudioElement | null = null

export function getPhoneRingAudio(): HTMLAudioElement {
  if (!phoneRingAudio) {
    phoneRingAudio = new Audio('/assets/raven/stringee/phone-ring.wav')
    phoneRingAudio.volume = 0.7
    phoneRingAudio.preload = 'auto'
  }
  return phoneRingAudio
}

export function getRingtoneSoundAudio(): HTMLAudioElement {
  if (!ringbackAudio) {
    ringbackAudio = new Audio('/assets/raven/stringee/ringtone.mp3')
    ringbackAudio.volume = 0.7
    ringbackAudio.preload = 'auto'
  }
  return ringbackAudio
}

declare global {
  interface Window {
    StringeeClient: any
    StringeeCall2: any
  }
}

export default function StringeeCallComponent({ toUserId }: { toUserId: string }) {
  
  const { appearance } = useTheme()
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
  const [isMuted, setIsMuted] = useState(false)
  const [networkStats, setNetworkStats] = useState<{
    ping: number | null
    bitrate: number | null
    packetLoss: number | null
    networkType: string | null
  }>({
    ping: null,
    bitrate: null,
    packetLoss: null,
    networkType: null
  })
  const [showDetailedStats, setShowDetailedStats] = useState(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const phoneRingRef = useRef<HTMLAudioElement | null>(null)
  const ringbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const cleanupFunctionsRef = useRef<(() => void)[]>([])
  const audioPermissionRequestedRef = useRef<boolean>(false)
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Get user info
  const { data: userData } = useFrappeGetDoc('Raven User', toUserId)

  const { data } = useFrappeGetCall<{ message: { user_id: string; token: string } }>(
    'raven.api.stringee_token.get_stringee_token'
  )
  
  // Get caller info for incoming calls
  const callerUserId = incoming?.fromNumber
  const { data: callerData } = useFrappeGetDoc('Raven User', callerUserId, {
    enabled: !!callerUserId
  })

  // Audio context for better audio handling
  const audioContextRef = useRef<AudioContext | null>(null)

  // Get colors based on theme
  const getIconColor = (color: 'green' | 'blue' | 'red' | 'white' | 'gray') => {
    const isDark = appearance === 'dark' || (appearance === 'inherit' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    switch (color) {
      case 'green':
        return isDark ? '#2ed573' : '#10b981'
      case 'blue': 
        return isDark ? '#3b82f6' : '#2563eb'
      case 'red':
        return '#ff4757'
      case 'white':
        return isDark ? '#ffffff' : '#000000'
      case 'gray':
        return isDark ? '#9ca3af' : '#6b7280'
      default:
        return isDark ? '#ffffff' : '#000000'
    }
  }

  const getBackgroundColor = (type: 'button' | 'modal') => {
    const isDark = appearance === 'dark' || (appearance === 'inherit' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    if (type === 'button') {
      return isDark ? '#606060' : '#e5e7eb'
    }
    return isDark ? '#1a1a1a' : '#ffffff'
  }

  // Network monitoring functions
  const measurePing = async (): Promise<number | null> => {
    try {
      const start = performance.now()
      const response = await fetch('/api/method/ping', { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      const end = performance.now()
      
      if (response.ok) {
        return Math.round(end - start)
      }
      
      // Fallback: ping to current domain
      const fallbackStart = performance.now()
      await fetch(window.location.origin + '/ping', { 
        method: 'HEAD',
        cache: 'no-cache'
      }).catch(() => {}) // Ignore errors
      const fallbackEnd = performance.now()
      
      return Math.round(fallbackEnd - fallbackStart)
    } catch (error) {
      console.warn('❌ Ping measurement failed:', error)
      return null
    }
  }

  const getNetworkType = (): string => {
    // @ts-ignore - Navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    
    if (connection) {
      if (connection.effectiveType) {
        const typeMap: { [key: string]: string } = {
          'slow-2g': '2G (Chậm)',
          '2g': '2G',
          '3g': '3G', 
          '4g': '4G/LTE'
        }
        return typeMap[connection.effectiveType] || connection.effectiveType
      }
      
      if (connection.type) {
        const typeMap: { [key: string]: string } = {
          'wifi': 'WiFi',
          'cellular': 'Di động',
          'ethernet': 'Ethernet',
          'bluetooth': 'Bluetooth'
        }
        return typeMap[connection.type] || connection.type
      }
    }
    
    return 'Không xác định'
  }

  const getWebRTCStats = async (callObj: any): Promise<{bitrate: number | null, packetLoss: number | null}> => {
    try {
      if (!callObj || !callObj.localStream) {
        return { bitrate: null, packetLoss: null }
      }

      // Try to get peer connection from Stringee call
      const peerConnection = callObj.peerConnection || callObj._peerConnection
      
      if (!peerConnection || !peerConnection.getStats) {
        return { bitrate: null, packetLoss: null }
      }

      const stats = await peerConnection.getStats()
      let bitrate: number | null = null
      let packetLoss: number | null = null

      stats.forEach((report: any) => {
        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
          if (report.bytesSent && report.timestamp) {
            // Calculate bitrate (rough estimation)
            bitrate = Math.round((report.bytesSent * 8) / 1000) // kbps
          }
        }
        
        if (report.type === 'inbound-rtp') {
          if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
            const total = report.packetsLost + report.packetsReceived
            if (total > 0) {
              packetLoss = Math.round((report.packetsLost / total) * 100 * 100) / 100 // percentage
            }
          }
        }
      })

      return { bitrate, packetLoss }
    } catch (error) {
      console.warn('❌ WebRTC stats failed:', error)
      return { bitrate: null, packetLoss: null }
    }
  }

  const startNetworkMonitoring = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
    }

    const updateStats = async () => {
      try {
        const ping = await measurePing()
        const networkType = getNetworkType()
        const { bitrate, packetLoss } = await getWebRTCStats(call)

        setNetworkStats({
          ping,
          bitrate,
          packetLoss,
          networkType
        })
      } catch (error) {
        console.warn('❌ Failed to update network stats:', error)
      }
    }

    // Update immediately
    updateStats()
    
    // Update every 3 seconds
    statsIntervalRef.current = setInterval(updateStats, 3000)
    
    console.log('📊 Network monitoring started')
  }

  const stopNetworkMonitoring = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }
    
    setNetworkStats({
      ping: null,
      bitrate: null,
      packetLoss: null,
      networkType: null
    })
    
    console.log('📊 Network monitoring stopped')
  }

  // Get display name for user
  const getDisplayName = () => {
    if (incoming) {
      // For incoming calls, show caller info
      if (callerUserName) {
        return callerUserName
      }
      if (callerData?.full_name) {
        return callerData.full_name
      }
      if (callerData?.first_name) {
        return callerData.first_name
      }
      return callerUserId || 'Unknown Caller'
    } else {
      // For outgoing calls, show callee info
      if (userData?.full_name) {
        return userData.full_name
      }
      if (userData?.first_name) {
        return userData.first_name
      }
      return toUserId
    }
  }

  // Get user avatar
  const getUserAvatar = () => {
    if (incoming) {
      // For incoming calls, show caller avatar
      return callerData?.user_image || null
    } else {
      // For outgoing calls, show callee avatar
      return userData?.user_image || null
    }
  }

  // Get avatar initials as fallback
  const getAvatarInitials = () => {
    const name = getDisplayName()
    if (name && name !== toUserId && name !== 'Unknown Caller') {
      const words = name.split(' ')
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return name[0].toUpperCase()
    }
    return (incoming ? (callerUserId?.[0] || 'U') : toUserId[0]).toUpperCase()
  }

  // Initialize audio context
  const initAudioContext = async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        console.log('🔊 Audio context initialized')
      } catch (error) {
        console.error('❌ Failed to create audio context:', error)
      }
    }
    
    if (audioContextRef.current?.state === 'suspended') {
      try {
        await audioContextRef.current.resume()
        console.log('🔊 Audio context resumed')
      } catch (error) {
        console.error('❌ Failed to resume audio context:', error)
      }
    }

    // Request microphone permission proactively (only once)
    if (!audioPermissionRequestedRef.current && (call || incoming)) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        stream.getTracks().forEach(track => track.stop()) // Just for permission
        console.log('🎤 Microphone permission granted')
        audioPermissionRequestedRef.current = true
      } catch (error) {
        console.log('🎤 Microphone permission not granted yet')
      }
    }
  }

  // Toggle mute/unmute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
      console.log(`🎤 Audio ${!isMuted ? 'muted' : 'unmuted'}`)
    } else {
      console.warn('🎤 Cannot toggle mute: no local stream available')
    }
  }





  // Handle visibility change to resume audio (only during active calls)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only process if there's an active call
      if (!document.hidden && (call || incoming)) {
        console.log('🔍 Tab became visible during call, resuming audio...')
        initAudioContext()
        
        // Resume all audio elements
        document.querySelectorAll('audio, video').forEach((media) => {
          const mediaElement = media as HTMLMediaElement
          if (mediaElement.paused && mediaElement.readyState >= 2) {
            mediaElement.play().catch(console.error)
          }
        })
      }
    }

    const handleFocus = () => {
      // Only process if there's an active call
      if (call || incoming) {
        console.log('🎯 Window focused during call, ensuring audio...')
        initAudioContext()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Add to cleanup functions
    const cleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
    cleanupFunctionsRef.current.push(cleanup)

    return cleanup
  }, [call, incoming])

  // Force audio context when call modal opens
  useEffect(() => {
    if (call || incoming) {
      console.log('📞 Call modal opened, forcing audio context...')
      console.log('📋 Current session state:', {
        hasCall: !!call,
        hasIncoming: !!incoming,
        currentSessionId,
        callStatus,
        isVideoCall
      })
      
      initAudioContext()
      
      // Additional aggressive audio resuming with cleanup
      const timeout1 = setTimeout(() => initAudioContext(), 100)
      const timeout2 = setTimeout(() => initAudioContext(), 500) 
      const timeout3 = setTimeout(() => initAudioContext(), 1000)
      
      // Add timeouts to cleanup
      const cleanup = () => {
        clearTimeout(timeout1)
        clearTimeout(timeout2)
        clearTimeout(timeout3)
      }
      cleanupFunctionsRef.current.push(cleanup)
      
      return cleanup
    }
      }, [call, incoming, currentSessionId])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, performing final cleanup...')
      performCleanup()
    }
  }, [])

  // Load Stringee SDK
  useEffect(() => {
    if (window.StringeeClient && window.StringeeCall2) {
      console.log('✅ Stringee SDK already loaded')
      setSdkLoaded(true)
    } else {
      console.log('🔄 Loading Stringee SDK...')
      
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
        console.log('✅ Stringee SDK loaded successfully')
        setSdkLoaded(true)
      }
      script.onerror = () => {
        console.error('❌ Failed to load Stringee SDK')
      }
      document.head.appendChild(script)
    }
    
    // Initialize audio context on first user interaction
    const handleFirstInteraction = () => {
      initAudioContext()
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
    console.log('📡 [REALTIME] Received call status update:', data)
    
    if (data.status === 'ended') {
      console.log('🔴 [REALTIME] Processing call ended...')
      
      // Ngắt toàn bộ audio
      ringbackAudioRef.current?.pause()
      if (ringbackAudioRef.current) {
        ringbackAudioRef.current.currentTime = 0
      }
      phoneRingRef.current?.pause()
      if (phoneRingRef.current) {
        phoneRingRef.current.currentTime = 0
      }
      
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
      
      // Force UI update - cập nhật ngay lập tức
      setCallStatus('ended')
      setIsCallConnected(false)
      setHasRemoteVideo(false)
      setHasRemoteAudio(false)
      setIsVideoCall(true)
      setVideoUpgradeRequest(null)
      setForceRender(prev => prev + 1) // Force re-render
      
      // Tự động đóng modal sau 3 giây
      setTimeout(() => {
        performCleanup()
      }, 3000)
    }
  })

  // Listen for video upgrade requests
  useFrappeEventListener('video_upgrade_request', (eventData: any) => {
    console.log('📹 [REALTIME] Received video upgrade request:', eventData)
    console.log('📹 [REALTIME] Current session ID:', currentSessionId)
    console.log('📹 [REALTIME] Request session ID:', eventData.session_id)
    console.log('📹 [REALTIME] Session match:', eventData.session_id === currentSessionId)
    console.log('📹 [REALTIME] Current user ID from token API:', data?.message?.user_id)
    console.log('📹 [REALTIME] To user ID:', eventData.to_user)
    
    // More flexible matching - check if we're the target user  
    const currentUserId = data?.message?.user_id
    const isTargetUser = eventData.to_user === currentUserId
    
    console.log('📹 [REALTIME] Is target user:', isTargetUser)
    
    // Show popup if we are the target user, regardless of session ID match
    if (isTargetUser || eventData.session_id === currentSessionId) {
      console.log('📹 [REALTIME] Showing video upgrade popup')
      setVideoUpgradeRequest({
        fromUser: eventData.from_user,
        fromUserName: eventData.from_user_name || eventData.from_user,
        sessionId: eventData.session_id
      })
      
      // Also update current session ID if it was missing
      if (!currentSessionId && eventData.session_id) {
        setCurrentSessionId(eventData.session_id)
        console.log('📹 [REALTIME] Updated session ID from request:', eventData.session_id)
      }
    } else {
      console.log('📹 [REALTIME] Ignoring video upgrade request - not for this user/session')
    }
  })

  // Listen for video upgrade responses
  useFrappeEventListener('video_upgrade_response', (data: any) => {
    console.log('📹 [REALTIME] Received video upgrade response:', data)
    if (data.session_id === currentSessionId) {
      if (data.accepted && call) {
        console.log('✅ Video upgrade accepted, upgrading call...')
        call.upgradeToVideoCall()
        setIsVideoCall(true)
      } else {
        console.log('❌ Video upgrade rejected - reverting to audio only')
        
        // Revert to audio-only call
        setIsVideoCall(false)
        
        // Stop video stream and revert to audio only
        if (localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks()
          videoTracks.forEach(track => {
            track.stop()
            console.log('🔇 Stopped video track after rejection')
          })
          
          // Get audio-only stream
          navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(audioStream => {
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = null
              }
              localStreamRef.current = audioStream
              console.log('🔊 Switched back to audio-only stream')
            })
            .catch(error => {
              console.error('❌ Failed to get audio stream after video rejection:', error)
            })
        }
        
        // Clear local video display
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null
        }
        
        // Show rejection message briefly
        alert('Người dùng đã từ chối chuyển sang video call')
      }
    }
  })

  // Listen for incoming call notifications to get correct call type
  useFrappeEventListener('incoming_call', (callData: any) => {
    console.log('📡 [REALTIME] Received incoming call notification:', callData)
    // Store call type info for when stringee event arrives
    const currentUserId = data?.message?.user_id
    if (callData.callee_id === currentUserId) {
                console.log('📞 [REALTIME] Storing call type from session:', callData.call_type)
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
    console.log('🔧 Client init useEffect:', {
      sdkLoaded,
      hasData: !!data?.message,
      hasClient: !!client,
      hasStringeeClient: !!window.StringeeClient,
      hasStringeeCall2: !!window.StringeeCall2
    })
    
    if (sdkLoaded && data?.message && !client && window.StringeeClient) {
      console.log('🔗 Creating Stringee client...')
      const stringeeClient = new window.StringeeClient()
      stringeeClient.connect(data.message.token)
      setClient(stringeeClient)

      phoneRingRef.current = getPhoneRingAudio()
      phoneRingRef.current.loop = true

      stringeeClient.on('connect', () => console.log('✅ Đã kết nối Stringee'))
      stringeeClient.on('authen', (res: any) => console.log('🎫 Auth:', res))

      stringeeClient.on('incomingcall2', (incomingCall: any) => {
        console.log('📲 Cuộc gọi đến:', incomingCall)
        console.log('📲 Incoming call details:', {
          isVideoCall: incomingCall.isVideoCall,
          fromNumber: incomingCall.fromNumber,
          toNumber: incomingCall.toNumber,
          callId: incomingCall.callId,
          callType: typeof incomingCall.isVideoCall,
          stringValue: String(incomingCall.isVideoCall)
        })
        
        // Detect call type from incoming call - use stored session info if available
        let incomingIsVideo = incomingCall.isVideoCall === true
        let expectedSessionId = null
        
        // Check if we have stored call type info from realtime notification
        const expectedCallType = (window as any)._expectedCallType
        if (expectedCallType) {
          incomingIsVideo = expectedCallType === 'video'
          expectedSessionId = (window as any)._expectedCallSession
          console.log('📞 Using call type from session:', expectedCallType)
          console.log('📞 Using session ID from realtime:', expectedSessionId)
          // Clear stored info
          ;(window as any)._expectedCallType = null
          ;(window as any)._expectedCallSession = null
        } else {
          console.log('📞 Using call type from Stringee object:', incomingIsVideo)
        }
        
        // Set session ID for incoming call
        if (expectedSessionId) {
          setCurrentSessionId(expectedSessionId)
          console.log('📋 Set session ID for incoming call:', expectedSessionId)
        } else {
          // Create fallback session ID if not available
          const fallbackSessionId = `incoming_${incomingCall.fromNumber}_${incomingCall.toNumber}_${Date.now()}`
          setCurrentSessionId(fallbackSessionId)
          console.log('📋 Created fallback session ID for incoming call:', fallbackSessionId)
        }
        
        setIsVideoCall(incomingIsVideo)
        console.log('📞 Final incoming call type:', incomingIsVideo ? 'Video' : 'Audio')
        
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
              console.log('🔔 Ringtone playing successfully')
            } catch (error) {
              console.error(`❌ Cannot play ringtone (attempt ${attempt}):`, error)
              if (attempt < 3) {
                setTimeout(() => playRingtone(attempt + 1), 500 * attempt)
              }
            }
          }
          
          playRingtone()
          console.log('🔔 Playing incoming call ringtone')
        }
      })
    }
  }, [sdkLoaded, data, client])

  const setupCallEvents = (callObj: any) => {
    callObj.on('addremotestream', (stream: MediaStream) => {
      console.log('🎥 addremotestream', stream.getTracks())
      setIsCallConnected(true)
      
      const videoTracks = stream.getVideoTracks()
      const audioTracks = stream.getAudioTracks()
      
      console.log('📹 Video tracks:', videoTracks.length, 'Audio tracks:', audioTracks.length)
      
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
                console.log('🎥 Remote video playing successfully')
              }).catch((error) => {
                console.error('❌ Failed to play remote video:', error)
                // Retry after a short delay
                setTimeout(() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play().catch(console.error)
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
        console.log('🔊 Setting up audio stream...')
        
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
                console.log('🔊 Remote audio playing successfully')
              }
            } catch (error) {
              console.error(`❌ Failed to play remote audio (attempt ${attempt}):`, error)
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
          console.log('🔊 Audio-only call, using video element for audio')
          
          const playAudioViaVideo = async (attempt = 1) => {
            try {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream
                remoteVideoRef.current.volume = 1.0
                remoteVideoRef.current.autoplay = true
                await remoteVideoRef.current.play()
                console.log('🔊 Remote audio (via video element) playing successfully')
              }
            } catch (error) {
              console.error(`❌ Failed to play remote audio via video (attempt ${attempt}):`, error)
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
      console.log('📹 addlocalstream')
      
      // Store local stream for mute/unmute control
      localStreamRef.current = stream
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
        // Force refresh video element
        setTimeout(() => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream
            localVideoRef.current.muted = true
            localVideoRef.current.play().catch(console.error)
          }
        }, 100)
      }
    })

    callObj.on('signalingstate', (state: any) => {
      console.log('📡 signalingstate:', state, 'reason:', state.reason)
      
      // Khi cuộc gọi được trả lời/kết nối
      if (state.code === 3 || state.reason === 'Answered' || state.reason === 'CALL_ANSWERED') {
        console.log('🔇 Call answered/connected - aggressively stopping ALL ringtones')
        
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
        
        // Force stop global audio
        if (phoneRingAudio) {
          phoneRingAudio.pause()
          phoneRingAudio.currentTime = 0
          phoneRingAudio.loop = false
          phoneRingAudio.volume = 0
        }
        
        if (ringbackAudio) {
          ringbackAudio.pause()
          ringbackAudio.currentTime = 0
          ringbackAudio.loop = false
          ringbackAudio.volume = 0
        }
        
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
              console.log('Could not remove audio element:', e)
            }
          }
        })
        
        setIsCallConnected(true)
        setCallStatus('connected')
        
        // Start network monitoring when call is connected
        startNetworkMonitoring()
        
        console.log('🔇 ALL ringtones force stopped on call connected')
        console.log('🔊 Call connected - Audio/Video state:', {
          hasRemoteVideo,
          hasRemoteAudio,
          isVideoCall,
          remoteVideoSrc: remoteVideoRef.current?.srcObject,
          remoteAudioSrc: remoteAudioRef.current?.srcObject
        })
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
        
        // Tự động đóng modal sau 1.5 giây
        setTimeout(() => {
          performCleanup()
        }, 1500)
      }
      
      // Khi cuộc gọi kết thúc (chỉ xử lý nếu chưa có callStatus là 'ended')
      if ((state.code === 6 || state.reason === 'Ended' || state.reason === 'CALL_ENDED' || state.reason === 'CALL_BUSY') && callStatus !== 'ended') {
        console.log('🔚 [CALL] Call ended detected, updating status...')
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
        
        // Tự động đóng modal sau 2 giây
        setTimeout(() => {
          performCleanup()
        }, 2000)
      }
    })

    callObj.on('mediastate', (state: any) => {
      console.log('🎬 mediastate:', state)
    })

    callObj.on('info', (info: any) => {
      console.log('ℹ️ info:', info)
    })
  }

  const makeCall = async (isVideoCall: boolean = true) => {
    console.log('📞 makeCall clicked!', {
      hasClient: !!client,
      userId: data?.message.user_id,
      toUserId,
      isVideoCall,
      hasStringeeCall2: !!window.StringeeCall2
    })
    
    // Initialize audio context immediately on user interaction
    initAudioContext()
    
    if (!client || !data?.message.user_id || !toUserId || !window.StringeeCall2) {
      console.log('❌ Cannot make call - missing requirements')
      return
    }

    try {
      // Tạo call session  
      const response = await fetch('/api/method/raven.api.stringee_token.create_call_session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Frappe-CSRF-Token': (window as any).frappe?.csrf_token || '',
        },
        body: JSON.stringify({
          caller_id: data.message.user_id,
          callee_id: toUserId,
          call_type: isVideoCall ? 'video' : 'audio'
        })
      })
      
      const result = await response.json()
      console.log('📋 Call session API response:', result)
      
      if (result.message && result.message.session_id) {
        setCurrentSessionId(result.message.session_id)
        console.log('📋 Call session created and set:', result.message.session_id)
      } else {
        // Create fallback session ID if API failed
        const fallbackSessionId = `outgoing_${data.message.user_id}_${toUserId}_${Date.now()}`
        setCurrentSessionId(fallbackSessionId)
        console.log('📋 Created fallback session ID for outgoing call:', fallbackSessionId)
      }
    } catch (error) {
      console.error('❌ Failed to create call session:', error)
      // Create fallback session ID on error
      const fallbackSessionId = `outgoing_${data.message.user_id}_${toUserId}_${Date.now()}`
      setCurrentSessionId(fallbackSessionId)
      console.log('📋 Created fallback session ID due to error:', fallbackSessionId)
    }

    console.log('🔊 Creating StringeeCall2...', isVideoCall ? 'Video Call' : 'Audio Call')
    console.log('🔊 StringeeCall2 parameters:', {
      client: !!client,
      from: data.message.user_id,
      to: toUserId,
      isVideoCall: isVideoCall
    })
    
    setCallStatus('connecting')
    setIsVideoCall(isVideoCall)
    
    // Create call with explicit video parameter
    const newCall = new window.StringeeCall2(client, data.message.user_id, toUserId, isVideoCall)
    
    // Verify call type after creation
    console.log('🔊 StringeeCall2 created:', {
      callId: newCall.callId,
      isVideoCall: newCall.isVideoCall,
      actualVideoCall: isVideoCall
    })
    
    setCall(newCall)
    setupCallEvents(newCall)

    ringbackAudioRef.current = getRingtoneSoundAudio()
    ringbackAudioRef.current.loop = true
    ringbackAudioRef.current.volume = 0.7
    ringbackAudioRef.current.autoplay = true
    
    // Force play ringback with retry
    ringbackAudioRef.current.play().then(() => {
      console.log('🔔 Ringback playing successfully')
    }).catch(error => {
      console.error('❌ Cannot play ringback:', error)
      // Retry after a short delay
      setTimeout(() => {
        if (ringbackAudioRef.current) {
          ringbackAudioRef.current.play().catch(console.error)
        }
      }, 500)
    })

    newCall.makeCall((res: any) => {
      console.log('📞 makeCall:', res)
    })
  }

  const stopAllAudio = useCallback(() => {
    console.log('🔇 Stopping ALL audio immediately...')
    
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
    
    // Stop global audio
    if (phoneRingAudio) {
      phoneRingAudio.pause()
      phoneRingAudio.currentTime = 0
      phoneRingAudio.loop = false
      phoneRingAudio.volume = 0
    }
    
    if (ringbackAudio) {
      ringbackAudio.pause()
      ringbackAudio.currentTime = 0
      ringbackAudio.loop = false
      ringbackAudio.volume = 0
    }
    
    // Force stop ALL audio elements in DOM
    document.querySelectorAll('audio').forEach((audio, index) => {
      if (!audio.src.includes('remoteAudio')) { // Don't stop call audio
        console.log(`🔇 Force stopping audio ${index}:`, audio.src)
        audio.pause()
        audio.currentTime = 0
        audio.loop = false
        audio.volume = 0
        
        // Remove ring audio from DOM
        if (audio.src.includes('phone-ring') || audio.src.includes('ringtone')) {
          try {
            audio.remove()
          } catch (e) {
            console.log('Could not remove audio element:', e)
          }
        }
      }
    })
    
    console.log('🔇 All audio stopped immediately')
  }, [])

  // Comprehensive cleanup function
  const performCleanup = useCallback(() => {
    console.log('🧹 Performing comprehensive cleanup...')
    
    // Stop all media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('🔇 Stopped media track:', track.kind)
      })
      localStreamRef.current = null
    }
    
    // Clear video sources
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }
    
    // Stop all audio
    stopAllAudio()
    
    // Reset states
    setCall(null)
    setIncoming(null)
    setCallStatus(null)
    setCurrentSessionId(null)
    setIsMuted(false)
    setIsCallConnected(false)
    setHasRemoteVideo(false)
    setHasRemoteAudio(false)
    setVideoUpgradeRequest(null)
    setCallerUserName('')
    
    // Reset permission flags
    audioPermissionRequestedRef.current = false
    
    // Stop network monitoring
    stopNetworkMonitoring()
    
    // Reset detailed stats view
    setShowDetailedStats(false)
    
    // Run custom cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup()
      } catch (error) {
        console.error('Cleanup function error:', error)
      }
    })
    cleanupFunctionsRef.current = []
    
    console.log('✅ Cleanup completed')
  }, [stopAllAudio])

  const answerCall = () => {
    if (!incoming) return
    
    console.log('📞 Answering call - stopping all audio immediately')
    
    // Initialize audio context immediately on user interaction
    initAudioContext()
    
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
    
    // Force stop global phone ring audio
    if (phoneRingAudio) {
      phoneRingAudio.pause()
      phoneRingAudio.currentTime = 0
      phoneRingAudio.volume = 0
      phoneRingAudio.loop = false
    }
    
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
          console.log('Could not remove audio element:', e)
        }
      }
    })
    
    console.log('🔇 All ringtones force stopped before answer')
    
    incoming.answer((res: any) => {
      console.log('✅ Answer:', res)
      console.log('📋 Current session ID when answering:', currentSessionId)
      
      setCall(incoming)
      setIncoming(null)
      setCallStatus('connected')
      
      // Start network monitoring after answering
      setTimeout(() => {
        startNetworkMonitoring()
      }, 1000)
      
      console.log('📞 Call answered, maintaining call type:', isVideoCall ? 'Video' : 'Audio')
      console.log('📞 Session ID after answer:', currentSessionId)
      
      // Multiple aggressive cleanups after answer
      setTimeout(() => {
        stopAllAudio()
        console.log('🔇 First cleanup after answer')
      }, 10)
      
      setTimeout(() => {
        stopAllAudio()
        console.log('🔇 Second cleanup after answer')
      }, 100)
      
      setTimeout(() => {
        stopAllAudio()
        console.log('🔇 Final cleanup after answer')
      }, 500)
    })
  }

  const hangupCall = async () => {
    if (!call) return
    
    // Gọi API để cập nhật trạng thái và gửi realtime TRƯỚC khi hangup
    if (currentSessionId) {
      try {
        const response = await fetch('/api/method/raven.api.stringee_token.update_call_status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': (window as any).frappe?.csrf_token || '',
          },
          body: JSON.stringify({
            session_id: currentSessionId,
            status: 'ended',
            end_time: new Date().toISOString()
          })
        })
        
        const result = await response.json()
        console.log('📡 [API] Update call status response:', result)
        console.log('📡 Call status updated to ended')
      } catch (error) {
        console.error('❌ Failed to update call status:', error)
      }
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
    
    // Hangup call
    call.hangup((res: any) => {
      console.log('🔚 Hangup:', res)
    })
    
    // Đóng modal ngay lập tức
    setCallStatus('ended')
    setIsCallConnected(false)
    setHasRemoteVideo(false)
    setHasRemoteAudio(false)
    setVideoUpgradeRequest(null)
    
    // Đóng modal sau 1 giây để hiển thị thông báo "Cuộc gọi đã kết thúc"
    setTimeout(() => {
      performCleanup()
    }, 1000)
  }

  const rejectCall = () => {
    if (!incoming) return
    
    console.log('❌ Rejecting call - stopping all audio immediately')
    
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
    
    if (phoneRingAudio) {
      phoneRingAudio.pause()
      phoneRingAudio.currentTime = 0
      phoneRingAudio.volume = 0
      phoneRingAudio.loop = false
    }
    
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
          console.log('Could not remove audio element:', e)
        }
      }
    })
    
    console.log('🔇 All ringtones force stopped before reject')
    
    incoming.reject((res: any) => {
      console.log('❌ Reject:', res)
    })
    
    // Cập nhật UI ngay lập tức
    setCallStatus('rejected')
    setIsCallConnected(false)
    setHasRemoteVideo(false)
    setHasRemoteAudio(false)
    setVideoUpgradeRequest(null)
    
    // Final cleanup to ensure no audio continues
    setTimeout(() => {
      stopAllAudio()
      console.log('🔇 Final audio cleanup after reject')
    }, 100)
    
    // Tự động đóng modal sau 1 giây
    setTimeout(() => {
      performCleanup()
    }, 1000)
  }

  const upgradeToVideo = async () => {
    console.log('📹 Video upgrade button clicked, checking requirements...', {
      hasCall: !!call,
      hasSessionId: !!currentSessionId,
      hasUserId: !!data?.message.user_id,
      currentSessionId,
      callId: call?.callId
    })

    if (!call || !data?.message.user_id) {
      console.error('❌ Cannot upgrade to video: missing call or user ID')
      return
    }

    // If no currentSessionId, try to create one based on call info
    let sessionId = currentSessionId
    if (!sessionId && call?.callId) {
      sessionId = `call_${data.message.user_id}_${toUserId}_${Date.now()}`
      setCurrentSessionId(sessionId)
      console.log('📋 Created session ID for video upgrade:', sessionId)
    }

    if (!sessionId) {
      console.error('❌ Cannot upgrade to video: no session ID available')
      return
    }
    
    try {
      console.log('📹 Initiating video upgrade with session:', sessionId)
      
      // Check if call has upgradeToVideoCall method
      if (typeof call.upgradeToVideoCall === 'function') {
        // Try to upgrade immediately if the method exists
        call.upgradeToVideoCall()
        setIsVideoCall(true)
        console.log('✅ Upgraded to video call locally')
      } else {
        console.log('📹 upgradeToVideoCall method not available, using API approach')
      }
      
      // Send video upgrade request to the other user
      const response = await fetch('/api/method/raven.api.stringee_token.send_video_upgrade_request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window as any).frappe?.csrf_token || '',
        },
        body: JSON.stringify({
          session_id: sessionId,
          from_user: data.message.user_id,
          to_user: toUserId
        })
      })
      
      const result = await response.json()
      console.log('📹 Video upgrade request sent:', result)
      
      if (result.message && result.message.success) {
        console.log('✅ Video upgrade request successful')
      } else {
        console.error('❌ Video upgrade request failed:', result)
      }
      
    } catch (error) {
      console.error('❌ Failed to upgrade to video:', error)
      // Try to upgrade locally even if API fails
      if (typeof call.upgradeToVideoCall === 'function') {
        try {
          call.upgradeToVideoCall()
          setIsVideoCall(true)
          console.log('✅ Fallback: Upgraded to video call locally only')
        } catch (fallbackError) {
          console.error('❌ Fallback upgrade also failed:', fallbackError)
        }
      }
    }
  }

  const acceptVideoUpgrade = async () => {
    if (!videoUpgradeRequest || !call) return
    
    try {
      console.log('📹 Accepting video upgrade and requesting camera...')
      
      // Request camera permission first
      let videoStream: MediaStream | null = null
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        })
        console.log('📹 Camera permission granted, got video stream')
      } catch (cameraError) {
        console.error('❌ Failed to get camera permission:', cameraError)
        alert('Không thể truy cập camera. Vui lòng cho phép truy cập camera để sử dụng video call.')
        return
      }
      
      // Send acceptance response
      const response = await fetch('/api/method/raven.api.stringee_token.respond_video_upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window as any).frappe?.csrf_token || '',
        },
        body: JSON.stringify({
          session_id: videoUpgradeRequest.sessionId,
          accepted: true
        })
      })
      
      const result = await response.json()
      console.log('📹 Video upgrade response API result:', result)
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }
      
      // Upgrade the call with new video stream
      if (typeof call.upgradeToVideoCall === 'function') {
        call.upgradeToVideoCall()
        console.log('✅ Called upgradeToVideoCall()')
      }
      
      // Replace local stream with video stream
      if (videoStream && localVideoRef.current) {
        localVideoRef.current.srcObject = videoStream
        localStreamRef.current = videoStream
        localVideoRef.current.play().catch(console.error)
        console.log('✅ Updated local video stream')
      }
      
      setIsVideoCall(true)
      setVideoUpgradeRequest(null)
      console.log('✅ Video upgrade accepted and applied')
      
    } catch (error) {
      console.error('❌ Failed to accept video upgrade:', error)
      alert('Có lỗi khi chuyển sang video call. Vui lòng thử lại.')
    }
  }

  const rejectVideoUpgrade = async () => {
    if (!videoUpgradeRequest) return
    
    try {
      console.log('❌ Rejecting video upgrade request')
      
      // Send rejection response
      const response = await fetch('/api/method/raven.api.stringee_token.respond_video_upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window as any).frappe?.csrf_token || '',
        },
        body: JSON.stringify({
          session_id: videoUpgradeRequest.sessionId,
          accepted: false
        })
      })
      
      const result = await response.json()
      console.log('❌ Video upgrade rejection response:', result)
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }
      
      setVideoUpgradeRequest(null)
      console.log('❌ Video upgrade rejected successfully')
      
    } catch (error) {
      console.error('❌ Failed to reject video upgrade:', error)
      // Still close the popup even if API fails
      setVideoUpgradeRequest(null)
    }
  }



  return (
    <>
      {/* CSS Animation for pulse effects */}
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
      `}</style>
      
            {/* Call Buttons - Zalo style */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => makeCall(false)} 
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            background: getBackgroundColor('button'),
            color: getIconColor('green'),
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            boxShadow: `0 2px 8px ${getIconColor('gray')}33`,
            transition: 'all 0.2s ease'
          }}
          title="Audio Call"
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.opacity = '1'
          }}
        >
          <FiPhoneCall size={18} />
        </button>
        <button 
          onClick={() => makeCall(true)} 
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            background: getBackgroundColor('button'),
            color: getIconColor('blue'),
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            boxShadow: `0 2px 8px ${getIconColor('gray')}33`,
            transition: 'all 0.2s ease'
          }}
          title="Video Call"
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.opacity = '1'
          }}
        >
          <FiVideo size={18} />
        </button>
      </div>

      {/* Call Modal - Zalo style */}
      {(call || incoming) && (
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
            backgroundColor: getBackgroundColor('modal'),
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
                  objectFit: 'cover'
                }} 
              />
              
              {/* Local Video (PiP) - Zalo style */}
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
                  : '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}>
                              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                controls={false}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover'
                }} 
              />
            </div>

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
                  color: getIconColor('white')
                }}>
                                     {/* Avatar với animation cho active call */}
                   <div style={{
                     width: '120px',
                     height: '120px',
                     borderRadius: '50%',
                     backgroundColor: getUserAvatar() ? 'transparent' : (callStatus === 'connected' && !isVideoCall 
                       ? getIconColor('green') 
                       : getBackgroundColor('button')),
                     margin: '0 auto 24px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     fontSize: getUserAvatar() ? '16px' : '48px',
                     border: callStatus === 'connected' && !isVideoCall 
                       ? `4px solid ${getIconColor('green')}` 
                       : `4px solid ${getIconColor('gray')}`,
                     boxShadow: callStatus === 'connected' && !isVideoCall
                       ? `0 8px 32px ${getIconColor('green')}66, 0 0 0 8px ${getIconColor('green')}1a`
                       : appearance === 'light' 
                         ? '0 8px 32px rgba(0, 0, 0, 0.1)'
                         : '0 8px 32px rgba(0, 0, 0, 0.4)',
                     animation: callStatus === 'connected' && !isVideoCall 
                       ? 'pulse 2s infinite' 
                       : 'none',
                     transition: 'all 0.3s ease',
                     backgroundImage: getUserAvatar() ? `url(${getUserAvatar()})` : 'none',
                     backgroundSize: 'cover',
                     backgroundPosition: 'center',
                     position: 'relative',
                     overflow: 'hidden'
                   }}>
                     {!getUserAvatar() && (
                       // Fallback to initials when no avatar
                       <div style={{
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         width: '100%',
                         height: '100%',
                         fontSize: '36px',
                         fontWeight: '600',
                         color: getIconColor('white')
                       }}>
                         {getAvatarInitials()}
                       </div>
                     )}
                   </div>
                  
                                     {/* User Name */}
                   <h2 style={{ 
                     margin: '0 0 12px', 
                     fontSize: '28px', 
                     fontWeight: '600',
                     color: getIconColor('white'),
                     textShadow: appearance === 'light' ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.3)'
                   }}>
                     {getDisplayName()}
                   </h2>
                  
                                     {/* Status */}
                   <p style={{ 
                     margin: 0, 
                     fontSize: '18px', 
                     color: getIconColor('gray'),
                     fontWeight: '400'
                   }}>
                     {callStatus === 'ended' 
                       ? 'Cuộc gọi đã kết thúc'
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
                       ? `${getIconColor('green')}33` 
                       : isVideoCall 
                         ? `${getIconColor('blue')}33`
                         : `${getIconColor('gray')}33`,
                     borderRadius: '20px',
                     fontSize: '14px',
                     color: callStatus === 'connected' && !isVideoCall
                       ? getIconColor('green')
                       : isVideoCall
                         ? getIconColor('blue')
                         : getIconColor('gray'),
                     border: callStatus === 'connected' && !isVideoCall
                       ? `1px solid ${getIconColor('green')}66`
                       : isVideoCall
                         ? `1px solid ${getIconColor('blue')}66`
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
                   
                   {/* Thời gian cuộc gọi cho Gọi thoại */}
                   {callStatus === 'connected' && !isVideoCall && (
                     <div style={{
                       marginTop: '12px',
                       fontSize: '16px',
                       color: getIconColor('green'),
                       fontWeight: '500',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '8px'
                     }}>
                       <div style={{
                         width: '8px',
                         height: '8px',
                         borderRadius: '50%',
                         backgroundColor: getIconColor('green'),
                         animation: 'pulse 1s infinite'
                       }}></div>
                       Cuộc gọi đang diễn ra
                       <div style={{
                         width: '8px',
                         height: '8px',
                         borderRadius: '50%',
                         backgroundColor: getIconColor('green'),
                         animation: 'pulse 1s infinite reverse'
                       }}></div>
                     </div>
                   )}
                   
                   {/* Quick Network Quality Indicator */}
                   {callStatus === 'connected' && networkStats.ping !== null && !showDetailedStats && (
                     <div 
                       onClick={() => setShowDetailedStats(true)}
                       style={{
                         marginTop: '8px',
                         fontSize: '14px',
                         color: getIconColor('gray'),
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
                         color: networkStats.ping < 100 ? getIconColor('green') : networkStats.ping < 300 ? '#fbbf24' : '#ef4444',
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
              {incoming && !call ? (
                // Incoming call controls - Zalo style
                <>
                  <button
                    onClick={rejectCall}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: getIconColor('red'),
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
                      backgroundColor: getIconColor('green'),
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
                         backgroundColor: isMuted ? getIconColor('red') : getBackgroundColor('button'),
                         color: isMuted ? 'white' : getIconColor('white'),
                         cursor: 'pointer',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         fontSize: '20px',
                         boxShadow: isMuted 
                           ? '0 3px 12px rgba(255, 107, 107, 0.4)' 
                           : `0 3px 12px ${getIconColor('gray')}33`,
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

                  {!isVideoCall && callStatus === 'connected' && (
                    <button
                      onClick={upgradeToVideo}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: getBackgroundColor('button'),
                        color: getIconColor('blue'),
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        boxShadow: `0 3px 12px ${getIconColor('gray')}33`,
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
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: getIconColor('red'),
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
            backgroundColor: getBackgroundColor('modal'),
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
              color: getIconColor('blue')
            }}>
              <FiVideo size={48} />
            </div>
            <h3 style={{
              color: getIconColor('white'),
              fontSize: '22px',
              margin: '0 0 12px',
              fontWeight: '600'
            }}>
              Yêu cầu bật camera
            </h3>
                         <p style={{
               color: getIconColor('gray'),
               fontSize: '16px',
               margin: '0 0 30px',
               lineHeight: '1.4'
             }}>
               <strong style={{ color: getIconColor('white') }}>{videoUpgradeRequest.fromUserName || callerUserName || videoUpgradeRequest.fromUser}</strong> muốn chuyển sang chế độ Gọi video. Bạn có đồng ý không?
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
                  backgroundColor: getBackgroundColor('button'),
                  color: getIconColor('white'),
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
                  backgroundColor: getIconColor('green'),
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