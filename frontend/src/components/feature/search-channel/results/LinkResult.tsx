import { useCurrentChannelData } from '@/hooks/useCurrentChannelData'
import { useGetUser } from '@/hooks/useGetUser'
import { useGetUserRecords } from '@/hooks/useGetUserRecords'
import { DMChannelListItem } from '@/utils/channel/ChannelListProvider'
import { DateMonthYear } from '@/utils/dateConversions'
import { Box, Flex, Separator, Text, Tooltip } from '@radix-ui/themes'
import { useCallback, useMemo, useState } from 'react'
import { BiCheck, BiCopy, BiLinkExternal } from 'react-icons/bi'
import { MessageSenderAvatar, UserHoverCard } from '../../chat/ChatMessage/MessageItem'
import { useScrollToMessage } from '../useScrollToMessage'

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
  name: string
  workspace: string
  channel: string
  file: string
}

interface LinkResultProps {
  link: SearchLink
  onLinkClick?: (url: string, link: SearchLink) => void
  onClose: () => void
}

const linkResultStyles = {
  container: `
    group p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer
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

export const LinkResult = ({ link, onClose }: LinkResultProps) => {
  const [copied, setCopied] = useState(false)
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

  const { handleScrollToMessage } = useScrollToMessage(onClose)

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleScrollToMessage(link.name, link.channel_id || '', link.workspace)
  }

  const extractFirstUrl = (content: string): string | null => {
    const match = content.match(/https?:\/\/[^\s]+/)
    return match ? match[0] : null
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()

    const url = extractFirstUrl(link.content)
    if (url) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      navigator.clipboard.writeText(url)
    }
  }

  const renderContentWithLinks = (content: string) => {
    const parts = content.split(/(https?:\/\/[^\s]+)/g)

    return parts.map((part, index) => {
      if (part.match(/https?:\/\/[^\s]+/)) {
        return (
          <a
            key={index}
            href={part}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 underline decoration-dotted underline-offset-2 hover:text-blue-800 hover:decoration-solid transition-colors duration-150 break-all'
          >
            {part}
          </a>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

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
        <div className='flex flex-1 min-w-0 justify-between'>
          <Flex direction='column' gap='0' justify='center'>
            <Box>
              <UserHoverCard user={user} userID={owner} isActive={false} />
            </Box>
            <Text size={'2'} color='gray'>
              {renderContentWithLinks(link.content)}
            </Text>
          </Flex>

          <div className='flex items-center gap-2'>
            <Tooltip content='Sao chép link'>
              <div onClick={handleCopyLink}>
                {copied ? <BiCheck className='w-4 h-4' /> : <BiCopy className='w-4 h-4' />}
              </div>
            </Tooltip>
            <Tooltip content='Xem tin nhắn gốc'>
              <div onClick={handleIconClick}>
                <BiLinkExternal className='w-4 h-4' />
              </div>
            </Tooltip>
          </div>
        </div>
      </Flex>
    </Flex>
  )
}
