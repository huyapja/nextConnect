import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { useStringeeToken } from '@/hooks/useStringeeToken'
import { initStringeeClient } from './stringee/initClient'
import { settingCallEvents } from './stringee/callEventHandlers'

interface StringeeContextValue {
  client: any | null
  currentCall: any | null
  isIncoming: boolean
  makeCall: (to: string, isVideoCall?: boolean) => void
  endCall: () => void
  rejectCall: () => void
}

const StringeeContext = createContext<StringeeContextValue>({
  client: null,
  currentCall: null,
  isIncoming: false,
  makeCall: () => {},
  endCall: () => {},
  rejectCall: () => {}
})

export const useStringee = () => useContext(StringeeContext)

export const StringeeProvider = ({ children }: { children: ReactNode }) => {
  const { token, userId } = useStringeeToken()
  const clientRef = useRef<any>(null)
  const [currentCall, setCurrentCall] = useState<any>(null)
  const [isIncoming, setIsIncoming] = useState(false)

  useEffect(() => {
    if (!token || !window.StringeeClient) return

    const client = initStringeeClient(token, (incomingCall) => {
      console.log('[📲] Incoming Call', incomingCall)
      setCurrentCall(incomingCall)
      setIsIncoming(true)
      settingCallEvents(incomingCall)
    })

    clientRef.current = client

    return () => {
      client.disconnect()
    }
  }, [token])

  const makeCall = (to: string, isVideoCall = false) => {
    const client = clientRef.current
    if (!client || !userId) return

    const call = new window.StringeeCall2(client, userId, to, isVideoCall)
    setCurrentCall(call)
    setIsIncoming(false)
    settingCallEvents(call)

    call.makeCall((res: any) => {
      console.log('[📞] Make call result', res)
    })
  }

  const endCall = () => {
    if (currentCall) {
      currentCall.hangup((res: any) => {
        console.log('[🔚] End call', res)
        setCurrentCall(null)
      })
    }
  }

  const rejectCall = () => {
    if (currentCall) {
      currentCall.reject((res: any) => {
        console.log('[❌] Rejected', res)
        setCurrentCall(null)
        setIsIncoming(false)
      })
    }
  }

  return (
    <StringeeContext.Provider
      value={{
        client: clientRef.current,
        currentCall,
        isIncoming,
        makeCall,
        endCall,
        rejectCall
      }}
    >
      {children}
    </StringeeContext.Provider>
  )
}
