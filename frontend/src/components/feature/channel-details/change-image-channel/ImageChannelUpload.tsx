import { useFrappePostCall } from 'frappe-react-sdk'
import { Dialog } from '@radix-ui/themes'
import { toast } from 'sonner'
import { UploadImageModal } from '../../userSettings/UploadImage/UploadImageModal'

import { atom, useAtom, useSetAtom } from 'jotai'
import { setSortedChannelsAtom } from '@/utils/channel/ChannelAtom'
import { useParams } from 'react-router-dom'

export const groupImageUploadAtom = atom<{
  open: boolean
  groupID?: string
} | null>(null)

type GroupImageUploadManagerProps = {
  setModalOpen?: (open: boolean) => void
}

export const GroupImageUploadManager = ({ setModalOpen }: GroupImageUploadManagerProps) => {
  const [uploadState, setUploadState] = useAtom(groupImageUploadAtom)
  const setSortedChannels = useSetAtom(setSortedChannelsAtom)
  const { call } = useFrappePostCall('raven.api.raven_channel.update_channel')
  const { channelID } = useParams()

  if (!uploadState?.open || !channelID) return null

  const handleUpload = (file: string) => {
    call({ channel_id: channelID, group_image: file })
      .then(() => {
        toast.success('Ảnh nhóm đã được cập nhật')
        setSortedChannels((prev) =>
          prev.map((channel) => (channel.name === channelID ? { ...channel, group_image: file } : channel))
        )
        setUploadState({ open: false })

        // Đóng modal nếu được truyền từ cha
        setModalOpen?.(false)
      })
      .catch(() => {
        toast.error('Lỗi khi tải ảnh nhóm')
      })
  }

  return (
    <Dialog.Root open={uploadState.open} onOpenChange={(open) => !open && setUploadState(null)}>
      <Dialog.Content className='max-w-md relative z-[9999]'>
        <UploadImageModal
          isPrivate={false}
          uploadImage={handleUpload}
          doctype='Raven Channel'
          docname={channelID}
          fieldname='group_image'
        />
      </Dialog.Content>
    </Dialog.Root>
  )
}