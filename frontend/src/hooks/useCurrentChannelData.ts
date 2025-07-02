import { sortedChannelsAtom } from '@/utils/channel/ChannelAtom'
import {
  ChannelListContext,
  ChannelListContextType,
  ChannelListItem,
  DMChannelListItem
} from '@/utils/channel/ChannelListProvider'
import { UserListContext } from '@/utils/users/UserListProvider'
import { useAtomValue } from 'jotai'
import { useContext, useMemo } from 'react'

interface CurrentChannelDMData {
  channelData: DMChannelListItem
  type: 'dm'
}

interface CurrentChannelData {
  channelData: ChannelListItem
  type: 'channel'
}

// export const useCurrentChannelData = (channelID: string) => {
//   const { channels, dm_channels, error, isLoading } = useContext(ChannelListContext) as ChannelListContextType

//   const channel: CurrentChannelData | CurrentChannelDMData | undefined = useMemo(() => {
//     if (channelID) {
//       const channel = channels?.find((channel) => channel.name === channelID) as ChannelListItem
//       if (channel) {
//         return {
//           channelData: channel,
//           type: 'channel'
//         }
//       }
//       const dm_channel = dm_channels?.find((channel) => channel.name === channelID) as DMChannelListItem
//       if (dm_channel) {
//         return {
//           channelData: dm_channel as DMChannelListItem,
//           type: 'dm'
//         }
//       }
//       return undefined
//     } else {
//       return undefined
//     }
//   }, [channelID, channels])

//   return { channel, error, isLoading }
// }

export const useCurrentChannelData = (channelID: string) => {
  const channels = useAtomValue(sortedChannelsAtom)
  const { error, isLoading } = useContext(ChannelListContext) as ChannelListContextType
  const { enabledUsers } = useContext(UserListContext)

  const channel: CurrentChannelData | CurrentChannelDMData | undefined = useMemo(() => {
    if (channelID) {
      // Kiểm tra nếu là draft channel (bắt đầu bằng "_")
      if (channelID.startsWith('_')) {
        const userID = channelID.substring(1) // Bỏ dấu "_" ở đầu
        const user = enabledUsers?.find((u) => u.name === userID)

        if (user) {
          // Tạo virtual DM channel cho user này
          const virtualDMChannel: DMChannelListItem = {
            name: channelID,
            channel_name: user.full_name || user.name,
            type: 'Private',
            channel_description: '',
            is_direct_message: 1,
            is_self_message: 0,
            is_archived: 0,
            creation: new Date().toISOString(),
            owner: user.name,
            last_message_details: null,
            last_message_timestamp: '',
            workspace: '',
            pinned_messages_string: '',
            group_type: 'dm',
            member_id: '',
            is_done: 0,
            user_labels: [],
            peer_user_id: userID
          }
          return {
            channelData: virtualDMChannel,
            type: 'dm' as const
          }
        }
      }

      // Xử lý channel thông thường
      const channel = channels?.find((channel) => channel.name === channelID)
      if (channel?.group_type === 'channel') {
        return {
          channelData: channel as ChannelListItem,
          type: 'channel'
        }
      }
      if (channel?.group_type === 'dm') {
        return {
          channelData: channel as DMChannelListItem,
          type: 'dm'
        }
      }
      return undefined
    } else {
      return undefined
    }
  }, [channelID, channels, enabledUsers])

  return { channel, error, isLoading }
}
