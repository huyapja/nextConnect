import { useStringeeToken } from '@/hooks/useStringeeToken'
import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { toast } from 'sonner'
import { settingCallEvents } from './stringee/callEventHandlers'
import { initStringeeClient } from './stringee/initClient'
import { useOutgoingCallAudio } from './stringee/sound/useOutgoingCallAudio'
import { useIncomingCallAudio } from './stringee/sound/useInComingCallAudio'

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

// Hàm kiểm tra mic tái sử dụng
export const StringeeProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, userId } = useStringeeToken()
  const clientRef = useRef<any>(null)
  const [state, dispatch] = useReducer(callReducer, initialCallState)

  const { play: playRingtone, stop: stopRingtone } = useOutgoingCallAudio()
  const { play: playIncomingRingtone, stop: stopIncomingRingtone } = useIncomingCallAudio()

  const clearAudioElements = () => {
    const container = document.getElementById('audio_container')
    if (container) container.innerHTML = ''
  }

  const resetCallState = () => {
    dispatch({ type: 'RESET' })
    clearAudioElements()
  }

  // 📲 Xử lý cuộc gọi đến
  const handleIncomingCall = (incomingCall: any) => {
    console.log('[📲] Incoming call received')

    dispatch({ type: 'SET_CURRENT_CALL', payload: incomingCall })
    dispatch({ type: 'SET_IS_INCOMING', payload: true })
    dispatch({ type: 'SET_IS_CONNECTING', payload: true })

    playIncomingRingtone() // 🔔 Play ngay khi có cuộc gọi

    settingCallEvents(
      incomingCall,
      () => {
        stopIncomingRingtone() // 🛑 Tắt khi kết thúc
        resetCallState()
      },
      (val) => dispatch({ type: 'SET_IS_IN_CALL', payload: val }),
      (val) => dispatch({ type: 'SET_IS_CONNECTING', payload: val })
    )
  }

  // 🔌 Khởi tạo client
  useEffect(() => {
    if (!token || !window.StringeeClient || !window.StringeeCall) return

    const client = initStringeeClient(token, handleIncomingCall)
    clientRef.current = client

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [token])

  // ✅ Kiểm tra mic chỉ khi user bắt đầu cuộc gọi
  const checkMicrophone = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      dispatch({ type: 'SET_HAS_MICROPHONE', payload: true })
      return true
    } catch (err) {
      console.warn('[❌] Mic error:', err)
      dispatch({ type: 'SET_HAS_MICROPHONE', payload: false })
      return false
    }
  }

  // 📞 Gọi đi
  const makeCall = async (to: string, isVideoCall = false) => {
    if (state.currentCall) {
      toast.error('📞 Bạn đang trong một cuộc gọi khác')
      return
    }

    const hasMic = await checkMicrophone()
    if (!hasMic) {
      toast.error('Không thể gọi – trình duyệt không cấp quyền micro')
      return
    }

    const client = clientRef.current
    if (!client || !userId) return

    const call = new window.StringeeCall(client, userId, to, isVideoCall)

    dispatch({ type: 'SET_CURRENT_CALL', payload: call })
    dispatch({ type: 'SET_IS_CALLING', payload: true })
    dispatch({ type: 'SET_IS_INCOMING', payload: false })
    dispatch({ type: 'SET_IS_CONNECTING', payload: true })

    playRingtone()

    settingCallEvents(
      call,
      () => {
        stopRingtone()
        resetCallState()
      },
      (val) => {
        dispatch({ type: 'SET_IS_IN_CALL', payload: val })
        if (val) stopRingtone()
      },
      (val) => dispatch({ type: 'SET_IS_CONNECTING', payload: val })
    )

    call.makeCall((res: any) => {
      console.log('[📞] Make call result', res)
      if (res.r !== 0) {
        stopRingtone()
        resetCallState()
      }
    })
  }

  const endCall = () => {
    const call = state.currentCall
    if (!call) return

    call.hangup((res: any) => {
      console.log('[🔚] Call ended by user', res)
      if (res?.r === 0) {
        resetCallState()
        stopRingtone()
      } else {
        console.warn('[⚠️] Call hangup failed:', res)
      }
    })
  }

  const rejectCall = () => {
    const call = state.currentCall
    if (!call) return

    call.reject((res: any) => {
      console.log('[❌] Call rejected', res)
      resetCallState()
      stopRingtone()
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
