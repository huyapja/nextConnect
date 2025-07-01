import { useFrappePostCall } from 'frappe-react-sdk'
import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChannelListItem } from '@/utils/channel/ChannelListProvider'
import { ChannelIcon } from '@/utils/layout/channelIcon'
import { AlertDialog, Button, Dialog, Flex, Text } from '@radix-ui/themes'
import { Loader } from '@/components/common/Loader'
import { toast } from 'sonner'
import { getErrorMessage, ErrorBanner } from '@/components/layout/AlertBanner/ErrorBanner'

interface LeaveChannelModalProps {
  onClose: () => void
  channelData: ChannelListItem
  closeDetailsModal: () => void
  isDrawer?: boolean
}

export const LeaveChannelModal = ({ onClose, channelData, isDrawer, closeDetailsModal }: LeaveChannelModalProps) => {
  const { call, loading: deletingDoc, error } = useFrappePostCall('raven.api.raven_channel.leave_channel')
  const navigate = useNavigate()

  // const { mutate } = useContext(ChannelListContext) as ChannelListContextType

  const onSubmit = async () => {
    return call({ channel_id: channelData?.name })
      .then(() => {
        toast('You have left the channel')
        onClose()
        navigate('../')
        closeDetailsModal()
      })
      .catch((e) => {
        toast.error('Could not leave channel', {
          description: getErrorMessage(e)
        })
      })
  }

  const Title = isDrawer ? Dialog.Title : AlertDialog.Title
  const DialogCancel = isDrawer ? Fragment : AlertDialog.Cancel
  const DialogAction = isDrawer ? Fragment : AlertDialog.Action

  return (
    <>
      <Title>
        <Flex gap='2'>
          <Text>Rời </Text>
          <ChannelIcon groupImage={channelData.group_image} type={channelData?.type} className={'mt-1'} />
          <Text>{channelData?.channel_name}?</Text>
        </Flex>
      </Title>

      <Flex direction={'column'} gap='2'>
        <ErrorBanner error={error} />
        {channelData?.type === 'Private' ? (
          <Text size='1'>
            Khi bạn rời khỏi kênh này, bạn sẽ không còn xem được bất kỳ tin nhắn nào trong kênh. Để tham gia lại, bạn
            cần được mời.
          </Text>
        ) : (
          <Text size='1'>
            Khi bạn rời khỏi kênh này, bạn sẽ không thể gửi thêm tin nhắn. Bạn sẽ cần tham gia lại để tiếp tục trao đổi
            trong kênh.
          </Text>
        )}
      </Flex>

      <Flex gap='3' mt='4' justify='end'>
        <DialogCancel>
          <Button variant='soft' color='gray' onClick={onClose}>
            Hủy
          </Button>
        </DialogCancel>
        <DialogAction>
          <Button variant='solid' color='red' onClick={onSubmit} disabled={deletingDoc}>
            {deletingDoc && <Loader className='text-white' />}
            {deletingDoc ? 'Đang rời' : 'Rời khỏi kênh'}
          </Button>
        </DialogAction>
      </Flex>
    </>
  )
}
