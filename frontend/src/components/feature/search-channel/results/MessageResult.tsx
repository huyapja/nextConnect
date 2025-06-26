import { useCurrentChannelData } from '@/hooks/useCurrentChannelData'
import { useGetUser } from '@/hooks/useGetUser'
import { useGetUserRecords } from '@/hooks/useGetUserRecords'
import { DMChannelListItem } from '@/utils/channel/ChannelListProvider'
import { DateMonthYear } from '@/utils/dateConversions'
import { Box, Flex, Separator, Text } from '@radix-ui/themes'
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
  }, [channelData])
  return (
    <Flex
      direction='column'
      gap='2'
      className='group
        hover:bg-gray-100
                            dark:hover:bg-gray-4
                            p-2
                            rounded-md'
    >
      <Flex gap='2'>
        <Text as='span' size='1'>
          {channelName}
        </Text>
        <Separator orientation='vertical' />
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
          <Text size={'2'} color='gray'>
            {message.content}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
