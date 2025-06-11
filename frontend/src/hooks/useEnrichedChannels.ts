import { ChannelWithGroupType } from '@/store/slices/channelSlice'
import { UnreadItem } from '@/components/layout/Sidebar/UnreadContext' // hoặc đúng path bạn có



// hàm kết hợp các api danh sách vào với nhau -> dùng 1 source of truth
export const prepareSortedChannels = (
  channels: any[],
  dm_channels: any[],
  unreadList: UnreadItem[]
): ChannelWithGroupType[] => {
  const withGroup = [
    ...channels.map((channel) => ({
      ...channel,
      group_type: 'channel' as const
    })),
    ...dm_channels.map((dm) => ({
      ...dm,
      group_type: 'dm' as const
    }))
  ]

  const enriched = withGroup.map((channel) => {
    const unread = (unreadList ?? []).find((u) => u.name === channel.name)
    return {
      ...channel,
      unread_count: unread?.unread_count ?? 0,
      last_message_content: unread?.last_message_content ?? channel.last_message_content,
      last_message_sender_name: unread?.last_message_sender_name ?? channel.last_message_sender_name,
      last_message_timestamp: unread?.last_message_timestamp ?? channel.last_message_timestamp
    }
  })

  return enriched.sort((a, b) => {
    const timeA = new Date(a.last_message_timestamp || 0).getTime()
    const timeB = new Date(b.last_message_timestamp || 0).getTime()
    return timeB - timeA
  })
}
