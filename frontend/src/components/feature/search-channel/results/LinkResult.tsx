import { useCurrentChannelData } from '@/hooks/useCurrentChannelData'
import { useGetUser } from '@/hooks/useGetUser'
import { useGetUserRecords } from '@/hooks/useGetUserRecords'
import { DMChannelListItem } from '@/utils/channel/ChannelListProvider'
import { DateMonthYear } from '@/utils/dateConversions'
import { Box, Flex, Separator, Text } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'
import { MessageSenderAvatar, UserHoverCard } from '../../chat/ChatMessage/MessageItem'

export interface SearchLink {
  id: number
  url: string
  label: string
  description: string
  content: string
  owner: string
  creation: string
  channel_id: string
  is_bot_message?: boolean
  bot?: string
}

interface LinkResultProps {
  link: SearchLink
  onLinkClick?: (url: string, link: SearchLink) => void
}

const linkResultStyles = {
  container: `
    group
    p-4
    rounded-xl
    border
    border-gray-3
    dark:border-gray-7
    hover:border-gray-6
    dark:hover:border-gray-6
    hover:shadow-md
    dark:hover:bg-gray-2
    transition-all
    duration-200
    cursor-pointer
    bg-white
    dark:bg-gray-1
  `,
  urlText: `
    text-blue-11
    hover:text-blue-12
    underline
    decoration-dotted
    underline-offset-2
    hover:decoration-solid
    transition-colors
    duration-150
    cursor-pointer
    break-all
  `,
  channelText: `
    text-gray-11
    text-xs
    font-medium
  `,
  dateText: `
    text-gray-10
    text-xs
  `,
  contentText: `
    text-gray-12
    text-sm
    leading-relaxed
    line-clamp-2
  `
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const openUrl = (url: string): void => {
  if (isValidUrl(url)) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export const LinkResult = ({ link }: LinkResultProps) => {
  const { owner, creation, channel_id, url } = link
  const users = useGetUserRecords()

  const user = useGetUser(link.is_bot_message && link.bot ? link.bot : owner)
  const { channel } = useCurrentChannelData(channel_id)
  const channelData = channel?.channelData

  const channelName = useMemo(() => {
    if (!channelData) return 'Unknown Channel'

    if (channelData.is_direct_message) {
      const dmChannel = channelData as DMChannelListItem
      const peerUserName = users[dmChannel.peer_user_id]?.full_name ?? dmChannel.peer_user_id
      return `DM with ${peerUserName}`
    }

    return channelData.channel_name || 'Unnamed Channel'
  }, [channelData, users])

  const handleContainerClick = useCallback(() => {
    openUrl(url)
  }, [url])

  if (!user) {
    return null
  }

  return (
    <Flex
      direction='column'
      gap='3'
      className={linkResultStyles.container}
      onClick={handleContainerClick}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleContainerClick()
        }
      }}
    >
      {/* Header with channel and date */}
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
            {link.content}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
