import { ChannelWithGroupType } from "@/store/slices/channelSlice"

// Hàm chuẩn bị dữ liệu ban đầu (channel + dm)
export const prepareSortedChannels = (
  channels: any[],
  dm_channels: any[]
): ChannelWithGroupType[] => {
  return [
    ...channels.map((channel) => ({ ...channel, group_type: 'channel' as const })),
    ...dm_channels.map((dm) => ({ ...dm, group_type: 'dm' as const }))
  ].sort((a, b) => {
    const timeA = new Date(a.last_message_timestamp || 0).getTime()
    const timeB = new Date(b.last_message_timestamp || 0).getTime()
    return timeB - timeA
  })
}

