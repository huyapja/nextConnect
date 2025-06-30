import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useStringeeCall } from '@/hooks/useStringeeCall'
import { CallModal } from './CallModal'
import { toast } from 'sonner'

interface CallContextType {
  isInCall: boolean
  makeCall: (peerUserId: string, isVideoCall: boolean) => Promise<void>
}

const CallContext = createContext<CallContextType | null>(null)

interface CallProviderProps {
  children: ReactNode
}

export const CallProvider = ({ children }: CallProviderProps) => {
  const { isInCall, makeCall, currentCall } = useStringeeCall()
  const [showCallModal, setShowCallModal] = useState(false)
  const [incomingCall, setIncomingCall] = useState<any>(null)
  const [callType, setCallType] = useState<'audio' | 'video'>('video')

  // Lắng nghe sự kiện cuộc gọi đến từ realtime
  useEffect(() => {
    const handleIncomingCall = (data: any) => {
      console.log('Incoming call event:', data)
      setIncomingCall(data)
      setCallType(data.call_type)
      setShowCallModal(true)
      
      // Hiển thị thông báo
      toast.info(`Cuộc gọi đến từ ${data.caller_name}`, {
        duration: 10000,
        action: {
          label: 'Trả lời',
          onClick: () => {
            setShowCallModal(true)
          }
        }
      })
    }

    const handleCallStatusUpdate = (data: any) => {
      console.log('Call status update:', data)
      if (data.status === 'ended' || data.status === 'rejected') {
        setShowCallModal(false)
        setIncomingCall(null)
      }
    }

    // Đăng ký lắng nghe sự kiện realtime
    if (window.frappe?.realtime) {
      window.frappe.realtime.on('incoming_call', handleIncomingCall)
      window.frappe.realtime.on('call_status_update', handleCallStatusUpdate)
      window.frappe.realtime.on('call_answered', handleCallStatusUpdate)
      window.frappe.realtime.on('call_rejected', handleCallStatusUpdate)
    }

    return () => {
      if (window.frappe?.realtime) {
        window.frappe.realtime.off('incoming_call', handleIncomingCall)
        window.frappe.realtime.off('call_status_update', handleCallStatusUpdate)
        window.frappe.realtime.off('call_answered', handleCallStatusUpdate)
        window.frappe.realtime.off('call_rejected', handleCallStatusUpdate)
      }
    }
  }, [])

  // Hiển thị modal khi có cuộc gọi
  useEffect(() => {
    if (currentCall || incomingCall) {
      setShowCallModal(true)
    }
  }, [currentCall, incomingCall])

  const handleCallModalClose = () => {
    setShowCallModal(false)
    setIncomingCall(null)
  }

  const contextValue: CallContextType = {
    isInCall,
    makeCall
  }

  return (
    <CallContext.Provider value={contextValue}>
      {children}
      
      {/* Call Modal */}
      <CallModal
        isOpen={showCallModal}
        onClose={handleCallModalClose}
        peerUserId={incomingCall?.caller_id || currentCall?.fromUserId}
        isIncoming={!!incomingCall}
        callType={callType}
      />
    </CallContext.Provider>
  )
}

export const useCallContext = () => {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCallContext must be used within CallProvider')
  }
  return context
} 