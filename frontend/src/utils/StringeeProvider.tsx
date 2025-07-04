import { useStringeeToken } from '@/hooks/useStringeeToken'
import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { toast } from 'sonner'
import { settingCallEvents } from './stringee/callEventHandlers'

const initialCallState = {
  currentCall: null,
  isCalling: false,
  isIncoming: false,
  isInCall: false,
  isConnecting: false,
  hasMicrophone: false
}

function callReducer(state: any, action: any) {
  switch (action.type) {
    case 'SET_CURRENT_CALL':
      return { ...state, currentCall: action.payload }
    case 'SET_IS_CALLING':
      return { ...state, isCalling: action.payload }
    case 'SET_IS_INCOMING':
      return { ...state, isIncoming: action.payload }
    case 'SET_IS_IN_CALL':
      return { ...state, isInCall: action.payload }
    case 'SET_IS_CONNECTING':
      return { ...state, isConnecting: action.payload }
    case 'SET_HAS_MICROPHONE':
      return { ...state, hasMicrophone: action.payload }
    case 'RESET':
      return { ...initialCallState }
    default:
      return state
  }
}

// Context
const StringeeContext = createContext<any>(null)
export const useStringee = () => useContext(StringeeContext)

// ✅ Hàm kiểm tra mic tái sử dụng
const checkMicrophone = (dispatch: any) => {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      dispatch({ type: 'SET_HAS_MICROPHONE', payload: true })
      stream.getTracks().forEach((t) => t.stop()) // cleanup
    })
    .catch((err) => {
      console.warn('[❌] Mic error:', err)
      dispatch({ type: 'SET_HAS_MICROPHONE', payload: false })
    })
}

// Provider
export const StringeeProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, userId } = useStringeeToken()
  const clientRef = useRef<any>(null)
  const [state, dispatch] = useReducer(callReducer, initialCallState)

  const resetCallState = () => {
    dispatch({ type: 'RESET' })
    checkMicrophone(dispatch) // ✅ Gọi lại mic sau mỗi reset
  }

  const clearAudioElements = () => {
    const container = document.getElementById('audio_container')
    if (container) container.innerHTML = ''
  }

  // 🎤 Kiểm tra microphone ban đầu + khi thay đổi thiết bị
  useEffect(() => {
    checkMicrophone(dispatch)
    const handleDeviceChange = () => checkMicrophone(dispatch)

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [])

  // 📲 Xử lý cuộc gọi đến
  const handleIncomingCall = (incomingCall: any) => {
    console.log('[📲] Incoming call received')
    dispatch({ type: 'SET_CURRENT_CALL', payload: incomingCall })
    dispatch({ type: 'SET_IS_INCOMING', payload: true })
    dispatch({ type: 'SET_IS_CONNECTING', payload: true })

    settingCallEvents(
      incomingCall,
      resetCallState,
      (val) => dispatch({ type: 'SET_IS_IN_CALL', payload: val }),
      (val) => dispatch({ type: 'SET_IS_CONNECTING', payload: val })
    )
  }

  // 🔌 Khởi tạo client
  useEffect(() => {
    if (!token || !window.StringeeClient || !window.StringeeCall) return

    const client = new window.StringeeClient()
    clientRef.current = client

    client.connect(token)

    client.on('connect', () => console.log('[✅] Connected to Stringee'))
    client.on('authen', (res: any) => console.log('[🔐] Authenticated', res))
    client.on('incomingcall', handleIncomingCall)
    client.on('disconnect', () => console.log('[❌] Disconnected'))
    client.on('requestnewtoken', () => console.log('[🔄] Token expired'))
    client.on('otherdeviceauthen', (data: any) => console.warn('[⚠️] Another device logged in', data))

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [token])

  // 📞 Gọi đi
  const makeCall = (to: string, isVideoCall = false) => {
    if (state.currentCall) {
      toast.error('📞 Bạn đang trong một cuộc gọi khác')
      return
    }

    const client = clientRef.current
    if (!client || !userId) return

    const call = new window.StringeeCall(client, userId, to, isVideoCall)

    dispatch({ type: 'SET_CURRENT_CALL', payload: call })
    dispatch({ type: 'SET_IS_CALLING', payload: true })
    dispatch({ type: 'SET_IS_INCOMING', payload: false })
    dispatch({ type: 'SET_IS_CONNECTING', payload: true })

    settingCallEvents(
      call,
      resetCallState,
      (val) => dispatch({ type: 'SET_IS_IN_CALL', payload: val }),
      (val) => dispatch({ type: 'SET_IS_CONNECTING', payload: val })
    )

    call.makeCall((res: any) => {
      console.log('[📞] Make call result', res)
      if (res.r !== 0) resetCallState()
    })
  }

  // 🔚 Kết thúc
  const endCall = () => {
    const call = state.currentCall
    if (!call) return

    call.hangup(() => {
      console.log('[🔚] Call ended by user')
      resetCallState()
      clearAudioElements()
    })
  }

  // ❌ Từ chối
  const rejectCall = () => {
    const call = state.currentCall
    if (!call) return

    call.reject((res: any) => {
      console.log('[❌] Call rejected', res)
      resetCallState()
      clearAudioElements()
    })
  }

  return (
    <StringeeContext.Provider
      value={{
        ...state,
        makeCall,
        endCall,
        rejectCall,
        client: clientRef.current
      }}
    >
      {children}
    </StringeeContext.Provider>
  )
}
