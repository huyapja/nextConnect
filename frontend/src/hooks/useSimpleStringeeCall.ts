import { useEffect, useRef, useState, useCallback } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'

declare global {
  interface Window {
    StringeeClient: any
    StringeeCall2: any
  }
}

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

export interface SimpleStringeeCallHook {
  client: any
  call: any
  incoming: any
  isConnected: boolean
  makeCall: (toUserId: string, isVideoCall?: boolean) => void
  answerCall: () => void
  rejectCall: () => void
  hangupCall: () => void
  upgradeToVideo: () => void
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
}

export const useSimpleStringeeCall = (): SimpleStringeeCallHook => {
  const [client, setClient] = useState<any>(null)
  const [call, setCall] = useState<any>(null)
  const [incoming, setIncoming] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const phoneRingRef = useRef<HTMLAudioElement | null>(null)
  const ringbackAudioRef = useRef<HTMLAudioElement | null>(null)

  const { data } = useFrappeGetCall<{ message: { userId: string; token: string } }>(
    'raven.api.stringee_token.get_stringee_token'
  )

  // Kiểm tra và đợi Stringee SDK load
  useEffect(() => {
    const checkSDK = () => {
      if (window.StringeeClient && window.StringeeCall2) {
        setSdkLoaded(true)
        console.log('✅ Stringee SDK loaded successfully')
        return true
      }
      return false
    }

    // Kiểm tra ngay lập tức
    if (checkSDK()) return

    // Nếu chưa load, đợi và thử lại
    const interval = setInterval(() => {
      if (checkSDK()) {
        clearInterval(interval)
      }
    }, 500)

    // Timeout sau 10 giây
    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (!sdkLoaded) {
        console.error('❌ Stringee SDK failed to load after 10 seconds')
      }
    }, 10000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [sdkLoaded])

  const setupCallEvents = useCallback((callObj: any) => {
    callObj.on('addremotestream', (stream: MediaStream) => {
      console.log('🎥 addremotestream')
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
        remoteVideoRef.current.srcObject = stream
        remoteVideoRef.current.play().catch(console.error)
      }
    })

    callObj.on('addlocalstream', (stream: MediaStream) => {
      console.log('📹 addlocalstream')
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        localVideoRef.current.play().catch(console.error)
      }
    })

    callObj.on('signalingstate', (state: any) => {
      console.log('📡 signalingstate:', state)
      // Khi cuộc gọi kết nối
      if (state.code === 6 || state.reason === 'CALL_ANSWERED') {
        ringbackAudioRef.current?.pause()
        if (ringbackAudioRef.current) {
          ringbackAudioRef.current.currentTime = 0
        }
      }
      // Khi bị từ chối
      if (state.code === 5 || state.reason === 'CALL_REJECTED') {
        ringbackAudioRef.current?.pause()
        if (ringbackAudioRef.current) {
          ringbackAudioRef.current.currentTime = 0
        }
      }
    })

    callObj.on('mediastate', (state: any) => {
      console.log('🎬 mediastate:', state)
    })

    callObj.on('info', (info: any) => {
      console.log('ℹ️ info:', info)
    })
  }, [])

  // Khởi tạo Stringee Client khi SDK đã load và có token
  useEffect(() => {
    if (!sdkLoaded || !data?.message || client) return

    console.log('🔗 Initializing Stringee Client...')
    
    const stringeeClient = new window.StringeeClient()
    stringeeClient.connect(data.message.token)
    setClient(stringeeClient)

    phoneRingRef.current = getPhoneRingAudio()
    phoneRingRef.current.loop = true

    stringeeClient.on('connect', () => {
      console.log('✅ Đã kết nối Stringee')
      setIsConnected(true)
    })
    
    stringeeClient.on('disconnect', () => {
      console.log('❌ Mất kết nối Stringee')
      setIsConnected(false)
    })
    
    stringeeClient.on('authen', (res: any) => {
      console.log('🎫 Auth:', res)
    })

    stringeeClient.on('incomingcall2', (incomingCall: any) => {
      console.log('📲 Cuộc gọi đến:', incomingCall)
      setIncoming(incomingCall)
      setupCallEvents(incomingCall)
      phoneRingRef.current?.play().catch(console.error)
    })

    // Cleanup function
    return () => {
      if (stringeeClient) {
        stringeeClient.disconnect()
      }
    }
  }, [sdkLoaded, data, client, setupCallEvents])

  const makeCall = useCallback((toUserId: string, isVideoCall: boolean = true) => {
    if (!sdkLoaded) {
      console.error('❌ Stringee SDK chưa được load')
      return
    }

    if (!client || !data?.message.userId || !toUserId || !isConnected) {
      console.error('❌ Cannot make call: missing requirements', {
        client: !!client,
        userId: data?.message.userId,
        toUserId,
        isConnected
      })
      return
    }

    console.log('📞 Making call to:', toUserId, 'Video:', isVideoCall)

    const newCall = new window.StringeeCall2(client, data.message.userId, toUserId, isVideoCall)
    setCall(newCall)
    setupCallEvents(newCall)

    ringbackAudioRef.current = getRingtoneSoundAudio()
    ringbackAudioRef.current.loop = true
    ringbackAudioRef.current.volume = 0.7
    ringbackAudioRef.current.play().catch(console.error)

    newCall.makeCall((res: any) => {
      console.log('📞 makeCall result:', res)
    })
  }, [client, data?.message.userId, isConnected, setupCallEvents, sdkLoaded])

  const answerCall = useCallback(() => {
    if (!incoming) return
    phoneRingRef.current?.pause()
    if (phoneRingRef.current) {
      phoneRingRef.current.currentTime = 0
    }
    incoming.answer((res: any) => {
      console.log('✅ Answer:', res)
      setCall(incoming)
      setIncoming(null)
    })
  }, [incoming])

  const rejectCall = useCallback(() => {
    if (!incoming) return
    phoneRingRef.current?.pause()
    if (phoneRingRef.current) {
      phoneRingRef.current.currentTime = 0
    }
    incoming.reject((res: any) => {
      console.log('❌ Reject:', res)
      setIncoming(null)
    })
  }, [incoming])

  const hangupCall = useCallback(() => {
    if (!call) return
    call.hangup((res: any) => {
      console.log('🔚 Hangup:', res)
      ringbackAudioRef.current?.pause()
      if (ringbackAudioRef.current) {
        ringbackAudioRef.current.currentTime = 0
      }
      setCall(null)
    })
  }, [call])

  const upgradeToVideo = useCallback(() => {
    if (!call) return
    call.upgradeToVideoCall()
  }, [call])

  return {
    client,
    call,
    incoming,
    isConnected,
    makeCall,
    answerCall,
    rejectCall,
    hangupCall,
    upgradeToVideo,
    localVideoRef,
    remoteVideoRef
  }
} 