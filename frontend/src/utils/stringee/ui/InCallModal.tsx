import { useStringee } from '@/utils/StringeeProvider'
import { Dialog } from '@radix-ui/themes'
import { useEffect, useState } from 'react'

const InCallModal = () => {
  const { isInCall, isConnecting, endCall } = useStringee()
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let interval: any
    if (isInCall) {
      setSeconds(0)
      interval = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isInCall])

  if (!isInCall && !isConnecting) return null

  return (
    <Dialog.Root open>
      <Dialog.Content className='p-6 text-center space-y-4 rounded-xl bg-white shadow-lg'>
        <Dialog.Title>{isInCall ? '🟢 Đang trong cuộc gọi' : '⏳ Đang kết nối...'}</Dialog.Title>

        {isInCall && (
          <div className='text-sm text-gray-700'>
            Thời gian: {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
          </div>
        )}

        <button
          onClick={endCall}
          className='mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer'
        >
          Kết thúc
        </button>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default InCallModal
