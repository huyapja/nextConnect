// StringeeProvider.tsx
import { useStringeeToken } from '@/hooks/useStringeeToken'
import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { toast } from 'sonner'
import { settingCallEvents } from './stringee/callEventHandlers'
import { initStringeeClient } from './stringee/initClient'
interface StringeeContextValue extends CallState {
  makeCall: (to: string, isVideoCall?: boolean) => void
  endCall: () => void
  rejectCall: () => void
  client: any | null
}

interface CallState {
  currentCall: any
  isCalling: boolean
  isIncoming: boolean
  isConnecting: boolean
  isInCall: boolean
  hasMicrophone: boolean
}

type Action =
  | { type: 'SET_CURRENT_CALL'; payload: any }
  | { type: 'SET_IS_CALLING'; payload: boolean }
  | { type: 'SET_IS_INCOMING'; payload: boolean }
  | { type: 'SET_IS_CONNECTING'; payload: boolean }
  | { type: 'SET_IS_IN_CALL'; payload: boolean }
  | { type: 'SET_HAS_MICROPHONE'; payload: boolean }
  | { type: 'RESET' }

const initialCallState: CallState = {
  currentCall: null,
  isCalling: false,
  isIncoming: false,
  isConnecting: false,
  isInCall: false,
  hasMicrophone: true
}

function callReducer(state: CallState, action: Action): CallState {
  switch (action.type) {
    case 'SET_CURRENT_CALL':
      return { ...state, currentCall: action.payload }
    case 'SET_IS_CALLING':
      return { ...state, isCalling: action.payload }
    case 'SET_IS_INCOMING':
      return { ...state, isIncoming: action.payload }
    case 'SET_IS_CONNECTING':
      return { ...state, isConnecting: action.payload }
    case 'SET_IS_IN_CALL':
      return { ...state, isInCall: action.payload }
    case 'SET_HAS_MICROPHONE':
      return { ...state, hasMicrophone: action.payload }
    case 'RESET':
      return { ...initialCallState, hasMicrophone: state.hasMicrophone }
    default:
      return state
  }
}

const StringeeContext = createContext<StringeeContextValue>({
  ...initialCallState,
  makeCall: () => {},
  endCall: () => {},
  rejectCall: () => {},
  client: null
})

export const useStringee = () => useContext(StringeeContext)

export const StringeeProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, userId } = useStringeeToken()
  const clientRef = useRef<any>(null)
  const [state, dispatch] = useReducer(callReducer, initialCallState)

  const resetCallState = () => dispatch({ type: 'RESET' })

  useEffect(() => {
    const checkMic = () => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const hasMic = devices.some((d) => d.kind === 'audioinput')
          dispatch({ type: 'SET_HAS_MICROPHONE', payload: hasMic })
          console.log('[🎤] Microphone check:', hasMic)
        })
        .catch((err) => {
          console.warn('[❌] Failed to check microphone:', err)
          dispatch({ type: 'SET_HAS_MICROPHONE', payload: false })
        })
    }

    checkMic() // gọi khi mount

    navigator.mediaDevices.addEventListener('devicechange', checkMic)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', checkMic)
    }
  }, [])

  const handleIncomingCall = (incomingCall: any) => {
    console.log('[📲] Incoming call received')
    dispatch({ type: 'SET_CURRENT_CALL', payload: incomingCall })
    dispatch({ type: 'SET_IS_INCOMING', payload: true })
    dispatch({ type: 'SET_IS_CONNECTING', payload: true })

    settingCallEvents(incomingCall, resetCallState, () => {
      dispatch({ type: 'SET_IS_IN_CALL', payload: true })
      dispatch({ type: 'SET_IS_CONNECTING', payload: false })
    })
  }

  useEffect(() => {
    if (!token || !window.StringeeClient) return
    const client = initStringeeClient(token, handleIncomingCall)
    clientRef.current = client
    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [token])

  const makeCall = async (to: string, isVideoCall = false) => {
    if (state.currentCall) {
      toast.error('📞 Bạn đang trong một cuộc gọi khác')
      return
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    if (!stream) {
      toast.error('❌ Không truy cập được micro')
      return
    }
    const client = clientRef.current
    if (!client || !userId) return

    const call = new window.StringeeCall2(client, userId, to, isVideoCall)
    dispatch({ type: 'SET_CURRENT_CALL', payload: call })
    dispatch({ type: 'SET_IS_CALLING', payload: true })
    dispatch({ type: 'SET_IS_INCOMING', payload: false })
    dispatch({ type: 'SET_IS_CONNECTING', payload: true })

    settingCallEvents(call, resetCallState, () => {
      dispatch({ type: 'SET_IS_IN_CALL', payload: true })
      dispatch({ type: 'SET_IS_CONNECTING', payload: false })
    })

    call.makeCall((res: any) => {
      console.log('[📞] Make call result', res)
      if (res.r !== 0) resetCallState()
    })
  }

  const endCall = () => {
    state.currentCall?.hangup(() => {
      console.log('[🔚] End call')
      resetCallState()
    })
  }

  const rejectCall = () => {
    state.currentCall?.reject((res: any) => {
      console.log('[❌] Rejected', res)
      if (res?.r === 0) resetCallState()
      else console.warn('[⚠️] Reject failed', res)
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
