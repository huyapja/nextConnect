import { useEffect, useMemo } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { DirectMessageItem } from '../direct-messages/DirectMessageListCustom'
import { useChannelDone } from '@/hooks/useChannelDone'
import { doneListAtom, sortedChannelsAtom } from '@/utils/channel/ChannelAtom'
import { useFrappeGetCall, useFrappeEventListener } from 'frappe-react-sdk'

export const DoneChannelList = () => {
  const [doneList, setDoneList] = useAtom(doneListAtom)

  const { data, error, isLoading, mutate } = useFrappeGetCall('raven.api.raven_channel.get_done_channels')

  // Fetch lần đầu
  useEffect(() => {
    if (data?.message) {
      const channelNames = data?.message.map((c: any) => c.name)
      setDoneList(channelNames)
    }
  }, [data, setDoneList])

  useFrappeEventListener('channel_done_updated', (data) => {
    setDoneList((prev) =>
      data.is_done
        ? prev.includes(data.channel_id)
          ? prev
          : [...prev, data.channel_id]
        : prev.filter((id) => id !== data.channel_id)
    )
    mutate()
  })

  useFrappeEventListener('channel_done_updated', (data) => {
    console.log('📩 Nhận được event channel_done_updated:', data)
  })

  // useFrappeEventListener('raven:channel_done_updated', (data) => {
  //   console.log('📩 Nhận được event raven:channel_done_updated:', data)
  // })

  const doneChannels = useMemo(() => {
    return data?.message || []
  }, [data])
  if (isLoading) {
    return <div className='text-sm italic text-gray-500 p-4 text-center'>Đang tải...</div>
  }

  if (error) {
    return <div className='text-sm text-red-500 p-4 text-center'>Không thể tải danh sách</div>
  }

  if (doneChannels.length === 0) {
    return <div className='text-sm italic text-gray-500 p-4 text-center'>Không có cuộc trò chuyện nào đã xong</div>
  }

  return (
    <div className='flex flex-col gap-2'>
      {doneChannels.map((channel) => (
        <div key={channel.name} className='relative group'>
          <DirectMessageItem dm_channel={channel} />
        </div>
      ))}
    </div>
  )
}
