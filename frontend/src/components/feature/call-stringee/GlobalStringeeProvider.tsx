import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useFrappeGetCall, useFrappeEventListener } from 'frappe-react-sdk'
import CallStringee from './CallStringee'

declare global {
  interface Window {
    StringeeClient: any
    StringeeCall2: any
  }
}

interface GlobalStringeeContextType {
  client: any
  isConnected: boolean
  globalIncomingCall: any
  showGlobalCall: boolean
  setShowGlobalCall: (show: boolean) => void
}

const GlobalStringeeContext = createContext<GlobalStringeeContextType | null>(null)

interface GlobalStringeeProviderProps {
  children: ReactNode
}

export const GlobalStringeeProvider = ({ children }: GlobalStringeeProviderProps) => {
  const [client, setClient] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [globalIncomingCall, setGlobalIncomingCall] = useState<any>(null)
  const [showGlobalCall, setShowGlobalCall] = useState(false)
  const [globalCallData, setGlobalCallData] = useState<any>(null)

  // Get Stringee token
  const { data } = useFrappeGetCall<{ message: { user_id: string; token: string } }>(
    'raven.api.stringee_token.get_stringee_token'
  )

  // Load Stringee SDK
  useEffect(() => {
    if (window.StringeeClient && window.StringeeCall2) {
      setSdkLoaded(true)
    } else {
      const script = document.createElement('script')
      script.src = '/assets/raven/stringee/latest.sdk.bundle.min.js'
      script.async = true
      script.onload = () => setSdkLoaded(true)
      document.head.appendChild(script)
    }
  }, [])

  // Initialize Stringee client globally
  useEffect(() => {
    if (sdkLoaded && data?.message && !client && window.StringeeClient) {
      const stringeeClient = new window.StringeeClient()
      stringeeClient.connect(data.message.token)
      setClient(stringeeClient)

      stringeeClient.on('connect', () => {
        console.log('🌐 Global Stringee connected')
        setIsConnected(true)
      })
      
      stringeeClient.on('disconnect', () => {
        console.log('🌐 Global Stringee disconnected')
        setIsConnected(false)
      })

      // 🎯 Global incoming call handler
      stringeeClient.on('incomingcall2', (incomingCall: any) => {
        console.log('🌐 Global incoming call received:', incomingCall)
        setGlobalIncomingCall(incomingCall)
        
        // 📝 Tạo channel_id theo format đúng của API (user1 _ user2)
        const caller = incomingCall.fromNumber
        const callee = data.message.user_id
        const channelId = caller < callee ? `${caller} _ ${callee}` : `${callee} _ ${caller}`
        
        console.log('🌐 Generated channelId for global call:', channelId)
        
        setGlobalCallData({
          toUserId: incomingCall.fromNumber,
          channelId: channelId
        })
        setShowGlobalCall(true)
      })
    }
  }, [sdkLoaded, data, client])

  // Listen for call ended to hide global modal
  useFrappeEventListener('call_status_update', (eventData: any) => {
    if (eventData.status === 'ended' || eventData.status === 'rejected') {
      setShowGlobalCall(false)
      setGlobalIncomingCall(null)
      setGlobalCallData(null)
    }
  })

  const contextValue: GlobalStringeeContextType = {
    client,
    isConnected,
    globalIncomingCall,
    showGlobalCall,
    setShowGlobalCall
  }

  return (
    <GlobalStringeeContext.Provider value={contextValue}>
      {children}
      
      {/* 🌐 Global Call Modal */}
      {showGlobalCall && globalCallData && (
        <CallStringee 
          toUserId={globalCallData.toUserId}
          channelId={globalCallData.channelId}
          globalClient={client}
          globalIncomingCall={globalIncomingCall}
          isGlobalCall={true}
          onClose={() => {
            setShowGlobalCall(false)
            setGlobalIncomingCall(null)
            setGlobalCallData(null)
          }}
        />
      )}
    </GlobalStringeeContext.Provider>
  )
}

export const useGlobalStringee = () => {
  const context = useContext(GlobalStringeeContext)
  if (!context) {
    throw new Error('useGlobalStringee must be used within GlobalStringeeProvider')
  }
  return context
} 