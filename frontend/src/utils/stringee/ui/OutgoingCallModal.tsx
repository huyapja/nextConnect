import { useStringee } from '@/utils/StringeeProvider'
import { useGetUser } from '@/hooks/useGetUser'
import { Button, Dialog } from '@radix-ui/themes'
import { UserAvatar } from '@/components/common/UserAvatar'
const OutgoingCallModal = () => {
  const { currentCall, isCalling, endCall, isInCall } = useStringee()

  const user = useGetUser(currentCall?.toNumber)

  if (!isCalling || !currentCall || isInCall) return null

  return (
    <Dialog.Root open={true}>
      <Dialog.Content className='rounded-xl p-6 text-center space-y-4'>
        <Dialog.Title>📞 Đang gọi...</Dialog.Title>

        <Dialog.Description>
          Đến: <strong>{user?.full_name}</strong>
        </Dialog.Description>

        <UserAvatar
          src={user?.user_image ?? ''}
          alt={user?.full_name}
          size='7'
          availabilityStatus={user?.availability_status}
        />

        <Button className='bg-red-500 hover:bg-red-600 cursor-pointer' onClick={endCall}>
          Huỷ cuộc gọi
        </Button>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default OutgoingCallModal
