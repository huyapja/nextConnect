import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useFrappeGetCall, useFrappeEventListener, useFrappePostCall } from 'frappe-react-sdk'
import CallStringee from './CallStringee'

declare global {
  interface Window {
    StringeeClient: any
    StringeeCall2: any
  }
}

interface OngoingCallInfo {
  session_id: string
  peer_user_id: string
  peer_user_name: string
  peer_user_image?: string
  call_type: 'audio' | 'video'
  status: string
  minutes_ago: number
  is_caller: boolean
}

interface GlobalStringeeContextType {
  client: any
  isConnected: boolean
  globalIncomingCall: any
  showGlobalCall: boolean
  setShowGlobalCall: (show: boolean) => void
  isInCall: boolean
  setIsInCall: (inCall: boolean) => void
  // Rejoin call properties
  ongoingCallInfo: OngoingCallInfo | null
  showRejoinDialog: boolean
  setShowRejoinDialog: (show: boolean) => void
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
  const [isInCall, setIsInCall] = useState(false)
  
  // Rejoin call states
  const [ongoingCallInfo, setOngoingCallInfo] = useState<OngoingCallInfo | null>(null)
  const [showRejoinDialog, setShowRejoinDialog] = useState(false)

  // Get Stringee token
  const { data } = useFrappeGetCall<{ message: { user_id: string; token: string } }>(
    'raven.api.stringee_token.get_stringee_token'
  )
  
  // API calls for rejoin functionality
  const { call: rejoinCall } = useFrappePostCall('raven.api.stringee_token.rejoin_call')
  const { call: declineRejoin } = useFrappePostCall('raven.api.stringee_token.decline_rejoin')

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

  // Listen for call status updates
  useFrappeEventListener('call_status_update', (eventData: any) => {
    console.log('🔄 Global call status update:', eventData.status)
    
    if (eventData.status === 'connecting' || eventData.status === 'initiated') {
      console.log('📞 Setting isInCall to true - call started')
      setIsInCall(true)
    } else if (eventData.status === 'ended' || eventData.status === 'rejected') {
      console.log('📞 Setting isInCall to false - call ended')
      setIsInCall(false)
      setShowGlobalCall(false)
      setGlobalIncomingCall(null)
      setGlobalCallData(null)
    } else if (eventData.status === 'connected') {
      console.log('📞 Call connected - keeping isInCall true')
      setIsInCall(true)
    }
  })

  // Listen for incoming calls to set call status
  useFrappeEventListener('incoming_call', (eventData: any) => {
    console.log('📞 Incoming call detected - setting isInCall to true')
    setIsInCall(true)
  })

  // Check for ongoing calls when app starts
  useEffect(() => {
    const checkForOngoingCalls = async () => {
      if (!data?.message?.user_id) return
      
      try {
        console.log('🔍 Checking for ongoing calls on app start...')
        
        const response = await fetch('/api/method/raven.api.stringee_token.check_ongoing_calls', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': (window as any).csrf_token
          }
        })
        
        const result = await response.json()
        
        if (result.message?.has_ongoing_call && result.message?.call_info) {
          console.log('🔍 Found ongoing call:', result.message.call_info)
          setOngoingCallInfo(result.message.call_info)
          setShowRejoinDialog(true)
          setIsInCall(true) // Set in call status
        } else {
          console.log('🔍 No ongoing calls found')
        }
      } catch (error) {
        console.error('🔍 Error checking ongoing calls:', error)
      }
    }
    
    // Only check once when user data is available
    if (data?.message?.user_id && !ongoingCallInfo) {
      checkForOngoingCalls()
    }
  }, [data?.message?.user_id])

  // Handle rejoin call
  const handleRejoinCall = async () => {
    if (!ongoingCallInfo) return
    
    try {
      console.log('🔄 Rejoining call:', ongoingCallInfo.session_id)
      
      await rejoinCall({ session_id: ongoingCallInfo.session_id })
      
             // Set up call data for rejoining
       const currentUserId = data?.message?.user_id
       const peerUserId = ongoingCallInfo.peer_user_id
       
       const rejoinCallData = {
         toUserId: peerUserId,
         channelId: currentUserId && currentUserId < peerUserId 
           ? `${currentUserId} _ ${peerUserId}` 
           : `${peerUserId} _ ${currentUserId}`
       }
      
      setGlobalCallData(rejoinCallData)
      setShowGlobalCall(true)
      setShowRejoinDialog(false)
      
      console.log('🔄 Successfully rejoined call')
      
    } catch (error) {
      console.error('🔄 Error rejoining call:', error)
      setShowRejoinDialog(false)
      setOngoingCallInfo(null)
      setIsInCall(false)
    }
  }

  // Handle decline rejoin
  const handleDeclineRejoin = async () => {
    if (!ongoingCallInfo) return
    
    try {
      console.log('❌ Declining to rejoin call:', ongoingCallInfo.session_id)
      
      await declineRejoin({ session_id: ongoingCallInfo.session_id })
      
      setShowRejoinDialog(false)
      setOngoingCallInfo(null)
      setIsInCall(false)
      
      console.log('❌ Successfully declined rejoin')
      
    } catch (error) {
      console.error('❌ Error declining rejoin:', error)
      // Still close dialog even if API fails
      setShowRejoinDialog(false)
      setOngoingCallInfo(null)
      setIsInCall(false)
    }
  }

  const contextValue: GlobalStringeeContextType = {
    client,
    isConnected,
    globalIncomingCall,
    showGlobalCall,
    setShowGlobalCall,
    isInCall,
    setIsInCall,
    ongoingCallInfo,
    showRejoinDialog,
    setShowRejoinDialog
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

      {/* 🔄 Rejoin Call Dialog */}
      {showRejoinDialog && ongoingCallInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '450px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            {/* User Avatar */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: ongoingCallInfo.peer_user_image 
                ? `url(${ongoingCallInfo.peer_user_image})` 
                : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              fontSize: '32px',
              fontWeight: '600',
              color: '#64748b'
            }}>
              {!ongoingCallInfo.peer_user_image && 
                ongoingCallInfo.peer_user_name.charAt(0).toUpperCase()
              }
            </div>
            
            {/* Call Type Icon */}
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
              color: ongoingCallInfo.call_type === 'video' ? '#3b82f6' : '#10b981'
            }}>
              {ongoingCallInfo.call_type === 'video' ? '📹' : '📞'}
            </div>
            
            {/* Title */}
            <h3 style={{
              color: '#1e293b',
              fontSize: '24px',
              margin: '0 0 12px',
              fontWeight: '600'
            }}>
              Tiếp tục cuộc gọi?
            </h3>
            
            {/* Description */}
            <p style={{
              color: '#64748b',
              fontSize: '16px',
              margin: '0 0 8px',
              lineHeight: '1.5'
            }}>
              Bạn có một cuộc gọi {ongoingCallInfo.call_type === 'video' ? 'video' : 'thoại'} đang diễn ra với{' '}
              <strong style={{ color: '#1e293b' }}>{ongoingCallInfo.peer_user_name}</strong>
            </p>
            
            <p style={{
              color: '#94a3b8',
              fontSize: '14px',
              margin: '0 0 30px'
            }}>
              Cuộc gọi đã bắt đầu {ongoingCallInfo.minutes_ago} phút trước
            </p>
            
            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleDeclineRejoin}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: 'white',
                  color: '#64748b',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                Kết thúc
              </button>
              <button
                onClick={handleRejoinCall}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: ongoingCallInfo.call_type === 'video' ? '#3b82f6' : '#10b981',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.opacity = '0.9'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
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