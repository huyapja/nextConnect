import { Suspense, lazy } from 'react'
import { useStringee } from '@/utils/StringeeProvider'

// đang trong cuộc gọi
const InCallModal = lazy(() => import('./InCallModal'))
// cuộc gọi đi (user A  gọi cho user B)
const OutgoingCallModal = lazy(() => import('./OutgoingCallModal'))
// cuộc gọi đến
const IncomingCallModal = lazy(() => import('./IncomingModalCall'))

const StringeeModal = () => {
  const context = useStringee()
  if (!context) return null

  const { isConnecting, isIncoming, isCalling, isInCall } = context
  return (
    <Suspense fallback={null}>
      {(isConnecting || isInCall) && <InCallModal />}
      {isCalling && <OutgoingCallModal />}
      {isIncoming && <IncomingCallModal />}
    </Suspense>
  )
}

export default StringeeModal
