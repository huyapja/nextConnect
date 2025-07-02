import { atom, useAtom } from 'jotai'
import { AlertDialog, Button, Flex, Text } from '@radix-ui/themes'
import { toast } from 'sonner'
import { useFrappePostCall } from 'frappe-react-sdk'
import { ErrorBanner } from '@/components/layout/AlertBanner/ErrorBanner'
import { Loader } from '@/components/common/Loader'
import { useParams } from 'react-router-dom'

export const imageChannelDeleteAtom = atom<{
  open: boolean
  groupID?: string | null
}>({
  open: false,
  groupID: null
})

interface ImageChannelDeleteProps {
  setModalOpen?: (open: boolean) => void
}

export const ImageChannelDelete = ({ setModalOpen }: ImageChannelDeleteProps) => {
  const [state, setState] = useAtom(imageChannelDeleteAtom)
  const { open, groupID } = state
  const { channelID } = useParams()

  const { call, loading, error } = useFrappePostCall('raven.api.raven_channel.update_channel')

  const onClose = () => {
    setState({ open: false, groupID: null })
    setModalOpen?.(false) // đóng modal cha nếu có
  }

  const removeImage = () => {
    if (!groupID) return

    call({ channel_id: channelID, group_image: '' }).then(() => {
      toast.success('Ảnh đại diện nhóm đã được xoá.')
      onClose()
    })
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <AlertDialog.Content className='max-w-sm'>
        <AlertDialog.Title>Xoá ảnh đại diện</AlertDialog.Title>

        <Flex direction='column' gap='2'>
          <ErrorBanner error={error} />
          <Text>Bạn có chắc muốn xoá ảnh đại diện của nhóm này không?</Text>
        </Flex>

        <Flex justify='end' gap='3' mt='4'>
          <AlertDialog.Cancel>
            <Button variant='soft' color='gray'>
              Huỷ
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button onClick={removeImage} variant='solid' color='red' disabled={loading}>
              {loading && <Loader />}
              {loading ? 'Đang xoá...' : 'Xoá'}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  )
}