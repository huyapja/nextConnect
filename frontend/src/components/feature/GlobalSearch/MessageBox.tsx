import { useCurrentChannelData } from '@/hooks/useCurrentChannelData'
import { useGetUser } from '@/hooks/useGetUser'
import { useGetUserRecords } from '@/hooks/useGetUserRecords'
import { UserContext } from '@/utils/auth/UserProvider'
import { DMChannelListItem } from '@/utils/channel/ChannelListProvider'
import { DateMonthYear } from '@/utils/dateConversions'
import { Box, Flex, Text } from '@radix-ui/themes'
import { useContext, useMemo } from 'react'
import { Message } from '../../../../../types/Messaging/Message'
import { MessageContent, MessageSenderAvatar, UserHoverCard } from '../chat/ChatMessage/MessageItem'

type MessageBoxProps = {
  message: Message & { workspace?: string }
  handleScrollToMessage?: (messageName: string, channelID: string, workspace?: string) => void
}

export const MessageBox = ({ message, handleScrollToMessage }: MessageBoxProps) => {
  const { owner, creation, channel_id } = message
  const users = useGetUserRecords()
  const { currentUser } = useContext(UserContext)

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
  }, [channelData])

  const handleClick = () => {
    if (handleScrollToMessage) {
      handleScrollToMessage(message.name, channel_id, message.workspace)
    }
  }

  return (
    <Flex
      direction='column'
      gap='2'
      className='group hover:bg-gray-100 dark:hover:bg-gray-4 p-2 rounded-md cursor-pointer transition-colors duration-150 border border-transparent hover:border-primary-6'
      onClick={handleClick}
      tabIndex={0}
      role='button'
      aria-label={`Đi tới tin nhắn trong kênh ${channelName}`}
    >
      <Flex gap='2'>
        <Text as='span' size='1'>
          {channelName}
        </Text>
        <Text as='span' size='1' color='gray'>
          <DateMonthYear date={creation} />
        </Text>
      </Flex>

      <Flex gap='3'>
        <MessageSenderAvatar userID={owner} user={user} isActive={false} />
        <Flex direction='column' gap='0' justify='center'>
          <Box>
            <UserHoverCard user={user} userID={owner} isActive={false} />
          </Box>
          <MessageContent 
            message={message} 
            user={user} 
            currentUser={currentUser} 
            removePendingMessage={() => {}} 
            sendOnePendingMessage={() => {}} 
          />
        </Flex>
      </Flex>
    </Flex>
  )
}
