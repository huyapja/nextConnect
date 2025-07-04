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

  // const handleAnswer = () => {
  //   currentCall.answer((res: any) => {
  //     console.log('[✅] Answered', res)

  //     const remoteTracks = currentCall.getRemoteTracks?.() || []

  //     remoteTracks.forEach((track: any) => {
  //       const audioEl = track.attach()
  //       audioEl.autoplay = true
  //       audioEl.controls = false
  //       audioEl.style.display = 'none'

  //       const container = document.getElementById('audio_container') || document.body
  //       container.appendChild(audioEl)

  //       audioEl
  //         .play()
  //         .then(() => console.log('[🔊] Remote audio started playing from handleAnswer'))
  //         .catch((err: any) => console.warn('[⚠️] Remote audio play blocked in handleAnswer:', err))
  //     })

  //     setOpen(false)
  //   })
  // }

  const handleAnswer = () => {
    currentCall.answer((res: any) => {
      console.log('[✅] Answered', res)
      setOpen(false)
    })
  }

  const handleReject = () => {
    rejectCall()
    setOpen(false)
  }

  return (
    <Dialog.Root open={open}>
      <Dialog.Content className='rounded-xl p-6 text-center space-y-4'>
        <Dialog.Title className='text-lg font-semibold'>📞 Cuộc gọi đến</Dialog.Title>

        <Dialog.Description>
          Từ: <strong>{user?.full_name}</strong>
        </Dialog.Description>

        <UserAvatar
          src={user?.user_image ?? ''}
          alt={user?.full_name}
          size='7'
          availabilityStatus={user?.availability_status}
        />

        <div className='flex justify-center gap-4 mt-4'>
          <button
            onClick={handleAnswer}
            className='px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg cursor-pointer'
          >
            Trả lời
          </button>
          <button
            onClick={handleReject}
            className='px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg cursor-pointer'
          >
            Từ chối
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default IncomingCallModal
