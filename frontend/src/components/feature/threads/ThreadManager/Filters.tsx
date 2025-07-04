import { IconButton, Tooltip } from '@radix-ui/themes'

import { useChannelList } from '@/utils/channel/ChannelListProvider'
import { ChannelIcon } from '@/utils/layout/channelIcon'
import { Select, Text, TextField } from '@radix-ui/themes'
import { BiFilter, BiSearch } from 'react-icons/bi'
import { toast } from 'sonner'
import { useParams } from 'react-router-dom'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { useMemo } from 'react'

export const SearchFilter = ({ search, setSearch }: { search: string; setSearch: (search: string) => void }) => {
  return (
    <div>
      <TextField.Root
        placeholder='Search threads...'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className='w-full'
      >
        <TextField.Slot>
          <BiSearch size={16} />
        </TextField.Slot>
      </TextField.Root>
    </div>
  )
}

export const ChannelFilter = ({ channel, setChannel }: { channel: string; setChannel: (channel: string) => void }) => {
  const { channels } = useChannelList()

  const { workspaceID } = useParams()

  const {
    data: participatingThreads,
    isLoading,
    error
  } = useFrappeGetCall<{ message: any[] }>(
    'raven.api.threads.get_all_threads',
    {
      workspace: workspaceID,
      start_after: 0,
      limit: 10000, // Lấy "hết" các thread mà user tham gia để lọc kênh
      only_show_unread: false
    },
    `participating_thread_channels_${workspaceID}`
  )

  // Tập hợp channel_id của các thread tham gia
  const participatingChannelIDs = useMemo(() => {
    const set = new Set<string>()
    participatingThreads?.message?.forEach((t: any) => {
      if (t.channel_id) set.add(t.channel_id)
    })
    return set
  }, [participatingThreads])

  // Lọc danh sách kênh theo tập hợp ở trên
  const filteredChannels = useMemo(() => {
    if (!channels) return []
    // Nếu API chưa load xong -> trả tạm thời mảng rỗng, tránh flicker
    if (isLoading || error) {
      return []
    }
    return channels.filter((c) => participatingChannelIDs.has(c.name))
  }, [channels, participatingChannelIDs, isLoading, error])

  return (
    <div className='w-full'>
      <Select.Root value={channel} onValueChange={setChannel}>
        <Select.Trigger placeholder='Channel / DM' className='w-full' />
        <Select.Content className='z-50'>
          <Select.Item value='all'>Tất cả</Select.Item>
          {filteredChannels?.map((ch) => (
            <Select.Item key={ch.name} value={ch.name}>
              <div className='gap-1 items-center flex overflow-hidden'>
                <ChannelIcon type={ch.type} />
                <Text
                  style={{
                    maxWidth: '20ch'
                  }}
                  className='text-ellipsis whitespace-break-spaces line-clamp-1 pb-0.5'
                >
                  {ch.channel_name}
                </Text>
              </div>
            </Select.Item>
          ))}
          {filteredChannels?.length === 0 && !isLoading && (
            <Select.Item value='none' disabled>
              <Text size='1' className='italic'>
                Không có kênh nào
              </Text>
            </Select.Item>
          )}
        </Select.Content>
      </Select.Root>
    </div>
  )
}

export const UnreadFilter = ({
  onlyShowUnread,
  setOnlyShowUnread
}: {
  onlyShowUnread: boolean
  setOnlyShowUnread: (onlyShowUnread: boolean) => void
}) => {
  const onToggle = () => {
    const currentValue = onlyShowUnread
    setOnlyShowUnread(!onlyShowUnread)

    if (currentValue) {
      toast.info('Viewing all threads', {
        position: 'bottom-center',
        duration: 800
      })
    } else {
      toast.info('Viewing only unread threads', {
        position: 'bottom-center',
        duration: 800
      })
    }
  }

  const text = onlyShowUnread ? 'Showing only unread threads' : 'Showing all threads'

  return (
    <Tooltip content={'Filter unread threads'}>
      <IconButton variant={onlyShowUnread ? 'solid' : 'soft'} aria-label={text} title={text} onClick={onToggle}>
        <BiFilter size={16} />
      </IconButton>
    </Tooltip>
  )
}
