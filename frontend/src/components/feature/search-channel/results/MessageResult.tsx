import { useCurrentChannelData } from '@/hooks/useCurrentChannelData'
import { useGetUser } from '@/hooks/useGetUser'
import { useGetUserRecords } from '@/hooks/useGetUserRecords'
import { DMChannelListItem } from '@/utils/channel/ChannelListProvider'
import { DateMonthYear } from '@/utils/dateConversions'
import { Flex, Separator, Text } from '@radix-ui/themes'
import { useMemo } from 'react'
import { MessageSenderAvatar, UserHoverCard } from '../../chat/ChatMessage/MessageItem'

interface MessageResultProps {
  message: SearchMessage
}

export interface SearchMessage {
  id: number
  sender: string
  content: string
  time: string
  avatar: string
  channel: string
  is_bot_message: boolean
  bot: string
  owner: string
  creation: string
  channel_id: string
  workspace: string
}

export const MessageResult = ({ message }: MessageResultProps) => {
  const { owner, creation, channel_id } = message
  const users = useGetUserRecords()

  const user = useGetUser(message.is_bot_message && message.bot ? message.bot : message.owner)
  const { channel } = useCurrentChannelData(channel_id)
  const channelData = channel?.channelData

  const channelName = useMemo(() => {
    if (channelData) {
      if (channelData.is_direct_message) {
        const peer_user_name =
          users[(channelData as DMChannelListItem).peer_user_id]?.full_name ??
          (channelData as DMChannelListItem).peer_user_id
        return `DM with ${peer_user_name}`
      } else {
        return channelData.channel_name
      }
    }
    return 'Unknown Channel'
  }, [channelData, users])

  if (!user) return null

  return (
    <div className='group p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-900'>
      {/* Header with channel and date */}
      <div className='flex items-center gap-2 mb-2 sm:mb-3'>
        <Text as='span' size='1' className='text-gray-600 dark:text-gray-400 font-medium truncate'>
          {channelName}
        </Text>
        <Separator orientation='vertical' className='hidden sm:block' />
        <Text as='span' size='1' className='text-gray-500 dark:text-gray-500 flex-shrink-0'>
          <DateMonthYear date={creation} />
        </Text>
      </div>

      {/* Message content */}
      <Flex gap='2 sm:gap-3' align='start'>
        <div className='flex-shrink-0'>
          <MessageSenderAvatar userID={owner} user={user} isActive={false} />
        </div>

        <div className='flex-1 min-w-0'>
          <div className='mb-1'>
            <UserHoverCard user={user} userID={owner} isActive={false} />
          </div>
          <Text size='2' className='text-gray-700 dark:text-gray-300 leading-relaxed break-words'>
            {message.content}
          </Text>
        </div>
      </Flex>
    </div>
  )
}
