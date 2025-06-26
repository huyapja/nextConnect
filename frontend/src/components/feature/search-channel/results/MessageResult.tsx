import { useCurrentChannelData } from '@/hooks/useCurrentChannelData'
import { useGetUser } from '@/hooks/useGetUser'
import { useGetUserRecords } from '@/hooks/useGetUserRecords'
import { DMChannelListItem } from '@/utils/channel/ChannelListProvider'
import { DateMonthYear } from '@/utils/dateConversions'
import { Box, Flex, Separator, Text } from '@radix-ui/themes'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { MessageSenderAvatar, UserHoverCard } from '../../chat/ChatMessage/MessageItem'
import { useScrollToMessage } from '../useScrollToMessage'

interface MessageResultProps {
  message: SearchMessage
  onClose: () => void
}

export interface SearchMessage {
  id: number
  name: string
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

export const MessageResult = ({ message, onClose }: MessageResultProps) => {
  const { owner, creation, channel_id } = message
  const users = useGetUserRecords()
  const { workspaceID } = useParams()
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

  const { handleScrollToMessage } = useScrollToMessage(onClose)

  if (!user) return null

  return (
    <div
      className='group p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer'
      onClick={() => handleScrollToMessage(message.name, channel_id, workspaceID)}
    >
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
      <Flex gap='3'>
        <MessageSenderAvatar userID={owner} user={user} isActive={false} />
        <Flex direction='column' gap='0' justify='center'>
          <Box>
            <UserHoverCard user={user} userID={owner} isActive={false} />
          </Box>
          <Text size={'2'} color='gray'>
            {message.content}
          </Text>
        </Flex>
      </Flex>
    </div>
  )
}
