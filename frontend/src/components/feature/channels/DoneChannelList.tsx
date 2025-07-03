// components/DoneChannelList.tsx
import { useEnrichedSortedChannels } from '@/utils/channel/ChannelAtom'
import { DirectMessageItem } from '../direct-messages/DirectMessageListCustom'
import { Tooltip } from '@radix-ui/themes'
import { HiCheck } from 'react-icons/hi'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'

export const DoneChannelList = () => {
  const doneChannels = useEnrichedSortedChannels(1)

  const { call, loading } = useFrappePostCall('raven.api.raven_channel.mark_selected_channels_not_done')

  const handleMarkAllDone = async () => {
    // Lọc các channel được đánh dấu là done
    const channelIDs = doneChannels.map((ch) => ch.name)
    try {
      const res = await call({ channel_ids: channelIDs })

      if (res?.message?.status === 'success') {
        toast.success(`Đã đánh dấu tất cả các kênh thành chưa xong`)
      } else {
        toast.warning('Không thể đánh dấu các kênh')
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi đánh dấu')
      console.error(err)
    }
  }

  if (doneChannels?.length === 0) {
    return <div className='text-sm italic text-gray-500 p-4 text-center'>Không có cuộc trò chuyện nào đã xong</div>
  }

  return (
    <div className='flex flex-col gap-2'>
      {doneChannels?.length > 0 && (
        <div className='ml-auto mr-2'>
          <Tooltip content={'Đánh dấu tất cả chưa xong'} side='top'>
            <button
              onClick={handleMarkAllDone}
              disabled={loading}
              className='p-1 rounded-full bg-gray-200 hover:bg-gray-300 h-[20px] w-[20px] flex items-center justify-center cursor-pointer'
            >
              <HiCheck className='h-3 w-3 transition-colors duration-150 text-gray-800' />
            </button>
          </Tooltip>
        </div>
      )}
      {doneChannels?.map((channel) => (
        <div key={channel.name} className='relative group'>
          <DirectMessageItem dm_channel={channel} />
        </div>
      ))}
    </div>
  )
}
