import { useEffect, useState } from 'react'
import { Dialog } from '@radix-ui/themes'
import { useStringee } from '@/utils/StringeeProvider'
import { useGetUser } from '@/hooks/useGetUser'
import { UserAvatar } from '@/components/common/UserAvatar'

const IncomingCallModal = () => {
  const { currentCall, isIncoming, rejectCall } = useStringee()
  const [open, setOpen] = useState(false)

  const user = useGetUser(currentCall?.fromNumber)

  useEffect(() => {
    if (currentCall && isIncoming) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [currentCall, isIncoming])

  if (!currentCall || !isIncoming) return null

  const handleAnswer = () => {
    currentCall.answer((res: any) => {
      console.log('[✅] Answered', res)
      setOpen(false)
    })
  }

  const handleReject = () => {
    rejectCall() // 👈 Sử dụng hàm từ context
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Content className='rounded-xl p-6 text-center space-y-4'>
        <div className='text-lg font-semibold'>📞 Cuộc gọi đến</div>
        <div>
          <p className='mb-3'>
            Từ: <strong>{user?.full_name}</strong>
          </p>
          <UserAvatar
            src={user?.user_image ?? ''}
            alt={user?.full_name}
            size='7'
            availabilityStatus={user?.availability_status}
          />
        </div>
        <div className='flex justify-center gap-4 mt-4'>
          <button onClick={handleAnswer} className='px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg'>
            Trả lời
          </button>
          <button onClick={handleReject} className='px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg'>
            Từ chối
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default IncomingCallModal
