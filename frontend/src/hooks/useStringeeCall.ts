import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'

declare global {
  interface Window {
    StringeeClient: any
    StringeeCall2: any
  }
}

interface StringeeCallHook {
  isConnected: boolean
  isInCall: boolean
  currentCall: any
  makeCall: (toUserId: string, isVideoCall: boolean) => Promise<void>
  answerCall: (call: any) => void
  endCall: () => void
  rejectCall: (call: any) => void
  toggleMute: () => void
  toggleVideo: () => void
  isMuted: boolean
  isVideoEnabled: boolean
}

interface CallSession {
  session_id: string
  caller_id: string
  callee_id: string
  call_type: string
}

export const useStringeeCall = (): StringeeCallHook => {
  const [client, setClient] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [currentCall, setCurrentCall] = useState<any>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [currentToken, setCurrentToken] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

  const { call: createCallSession } = useFrappePostCall('raven.api.stringee_token.create_call_session')
  const { call: updateCallStatus } = useFrappePostCall('raven.api.stringee_token.update_call_status')
  const { call: answerCallAPI } = useFrappePostCall('raven.api.stringee_token.answer_call')
  const { call: rejectCallAPI } = useFrappePostCall('raven.api.stringee_token.reject_call')

  // Khởi tạo Stringee Client
  const initStringeeClient = useCallback(async () => {
    try {
      const response = await fetch('/api/method/raven.api.stringee_token.get_stringee_token')
      const data = await response.json()
      
      if (data.message) {
        const { token, user_id } = data.message
        setCurrentToken(token)
        setUserId(user_id)

        if (window.StringeeClient) {
          const stringeeClient = new window.StringeeClient()
          
          stringeeClient.on('connect', () => {
            console.log('Stringee connected')
            setIsConnected(true)
          })

          stringeeClient.on('disconnect', () => {
            console.log('Stringee disconnected')
            setIsConnected(false)
          })

          stringeeClient.on('incomingcall2', (call: any) => {
            console.log('Incoming call:', call)
            handleIncomingCall(call)
          })

          stringeeClient.on('requestnewtoken', () => {
            console.log('Token expired, refreshing...')
            initStringeeClient()
          })

          stringeeClient.connect(token)
          setClient(stringeeClient)
        }
      }
    } catch (error) {
      console.error('Error initializing Stringee:', error)
      toast.error('Không thể kết nối đến dịch vụ gọi')
    }
  }, [])

  // Xử lý cuộc gọi đến
  const handleIncomingCall = (call: any) => {
    setCurrentCall(call)
    
    call.on('addlocalstream', (stream: MediaStream) => {
      const localVideo = document.getElementById('localVideo') as HTMLVideoElement
      if (localVideo) {
        localVideo.srcObject = stream
        localVideo.play()
      }
    })

    call.on('addremotestream', (stream: MediaStream) => {
      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement
      if (remoteVideo) {
        remoteVideo.srcObject = stream
        remoteVideo.play()
      }
    })

    call.on('signalingstate', (state: any) => {
      console.log('Call signaling state:', state)
      if (state.code === 3) { // Answered
        setIsInCall(true)
      } else if (state.code === 5) { // Ended
        setIsInCall(false)
        setCurrentCall(null)
      }
    })

    call.on('mediastate', (state: any) => {
      console.log('Call media state:', state)
    })

    call.on('info', (info: any) => {
      console.log('Call info:', info)
    })
  }

  // Thực hiện cuộc gọi
  const makeCall = useCallback(async (toUserId: string, isVideoCall: boolean) => {
    if (!client || !isConnected) {
      toast.error('Chưa kết nối đến dịch vụ gọi')
      return
    }

    try {
      // Tạo call session
      const sessionResponse = await createCallSession({
        caller_id: userId,
        callee_id: toUserId,
        call_type: isVideoCall ? 'video' : 'audio'
      })

      if (sessionResponse) {
        const call = new window.StringeeCall2(client, userId, toUserId, isVideoCall)
        
        call.on('addlocalstream', (stream: MediaStream) => {
          const localVideo = document.getElementById('localVideo') as HTMLVideoElement
          if (localVideo) {
            localVideo.srcObject = stream
            localVideo.play()
          }
        })

        call.on('addremotestream', (stream: MediaStream) => {
          const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement
          if (remoteVideo) {
            remoteVideo.srcObject = stream
            remoteVideo.play()
          }
        })

        call.on('signalingstate', (state: any) => {
          console.log('Call signaling state:', state)
          if (state.code === 3) { // Answered
            setIsInCall(true)
            updateCallStatus({
              session_id: sessionResponse.session_id,
              status: 'answered'
            })
          } else if (state.code === 5) { // Ended
            setIsInCall(false)
            setCurrentCall(null)
            updateCallStatus({
              session_id: sessionResponse.session_id,
              status: 'ended',
              end_time: new Date().toISOString()
            })
          }
        })

        setCurrentCall(call)
        call.makeCall()
      }
    } catch (error) {
      console.error('Error making call:', error)
      toast.error('Không thể thực hiện cuộc gọi')
    }
  }, [client, isConnected, userId, createCallSession, updateCallStatus])

  // Trả lời cuộc gọi
  const answerCall = useCallback((call: any) => {
    if (call) {
      call.answer()
      setIsInCall(true)
      
      // Gọi API để cập nhật trạng thái
      answerCallAPI({
        session_id: call.callId
      })
    }
  }, [answerCallAPI])

  // Kết thúc cuộc gọi
  const endCall = useCallback(() => {
    if (currentCall) {
      currentCall.hangup()
      setIsInCall(false)
      setCurrentCall(null)
    }
  }, [currentCall])

  // Từ chối cuộc gọi
  const rejectCall = useCallback((call: any) => {
    if (call) {
      call.reject()
      setCurrentCall(null)
      
      // Gọi API để cập nhật trạng thái
      rejectCallAPI({
        session_id: call.callId
      })
    }
  }, [rejectCallAPI])

  // Bật/tắt mic
  const toggleMute = useCallback(() => {
    if (currentCall) {
      if (isMuted) {
        currentCall.unmute()
      } else {
        currentCall.mute()
      }
      setIsMuted(!isMuted)
    }
  }, [currentCall, isMuted])

  // Bật/tắt camera
  const toggleVideo = useCallback(() => {
    if (currentCall) {
      if (isVideoEnabled) {
        currentCall.enableVideo(false)
      } else {
        currentCall.enableVideo(true)
      }
      setIsVideoEnabled(!isVideoEnabled)
    }
  }, [currentCall, isVideoEnabled])

  // Khởi tạo khi component mount
  useEffect(() => {
    if (window.StringeeClient) {
      initStringeeClient()
    } else {
      // Retry after a short delay if SDK not loaded yet
      const timer = setTimeout(() => {
        if (window.StringeeClient) {
          initStringeeClient()
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [initStringeeClient])

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (client) {
        client.disconnect()
      }
    }
  }, [client])

  return {
    isConnected,
    isInCall,
    currentCall,
    makeCall,
    answerCall,
    endCall,
    rejectCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoEnabled
  }
} 