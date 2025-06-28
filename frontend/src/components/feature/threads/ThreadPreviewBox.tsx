/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCurrentChannelData } from '@/hooks/useCurrentChannelData'
import { useGetUser } from '@/hooks/useGetUser'
import { useGetUserRecords } from '@/hooks/useGetUserRecords'
import { UserContext } from '@/utils/auth/UserProvider'
import { DMChannelListItem } from '@/utils/channel/ChannelListProvider'
import { DateMonthYear } from '@/utils/dateConversions'
import { ChannelIcon } from '@/utils/layout/channelIcon'
import { Badge, Box, Flex, Text } from '@radix-ui/themes'
import clsx from 'clsx'
import { useContext, useMemo } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { Message } from '../../../../../types/Messaging/Message'
import { MessageContent, MessageSenderAvatar, UserHoverCard } from '../chat/ChatMessage/MessageItem'
import { ViewThreadParticipants } from './ThreadParticipants'
import { ThreadMessage } from './Threads'

export const ThreadPreviewBox = ({ thread, unreadCount }: { thread: ThreadMessage; unreadCount: number }) => {
  const { currentUser } = useContext(UserContext)
  const user = useGetUser(thread.owner)
  const users = useGetUserRecords()
  const { channel } = useCurrentChannelData(thread.channel_id)
  const channelData = channel?.channelData
  const channelDetails = useMemo(() => {
    if (channelData) {
      if (channelData.is_direct_message) {
        const peer_user_name =
          users[(channelData as DMChannelListItem).peer_user_id]?.full_name ??
          (channelData as DMChannelListItem).peer_user_id
        return {
          channelIcon: '',
          channelName: `DM with ${peer_user_name}`
        }
      } else {
        return {
          channelIcon: channelData.type,
          channelName: channelData.channel_name
        }
      }
    }
  }, [channelData, users])

  const { workspaceID } = useParams()

  return (
    <NavLink
      to={`/${workspaceID}/threads/${thread.name}`}
      tabIndex={0}
      className={({ isActive }) =>
        clsx(
          'group block hover:bg-gray-2 dark:hover:bg-gray-4 px-4 py-4 border-b border-gray-4 overflow-hidden',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-8 focus-visible:ring-inset',
          isActive && 'bg-gray-3 dark:bg-gray-3'
        )
      }
    >
      {({ isActive }) => (
        <div className='flex w-full justify-between items-center gap-2'>
          <Flex direction='column' gap='2'>
            <Flex gap='2' align={'center'}>
              <Flex gap='1' align={'center'} justify={'center'}>
                {channelDetails?.channelIcon && (
                  <ChannelIcon type={channelDetails?.channelIcon as 'Private' | 'Public' | 'Open'} size='14' />
                )}
                <Text as='span' size='1' className={'font-semibold'}>
                  {channelDetails?.channelName}
                </Text>
              </Flex>
              <Text as='span' size='1' color='gray'>
                <DateMonthYear date={thread.creation} />
              </Text>
            </Flex>
            <Flex gap='3'>
              <MessageSenderAvatar userID={thread.owner} user={user} isActive={false} />
              <Flex direction='column' gap='0.5' justify='center'>
                <Box>
                  <UserHoverCard user={user} userID={thread.owner} isActive={false} />
                </Box>
                <MessageContent
                  message={thread as unknown as Message}
                  user={user}
                  currentUser={currentUser}
                  forceHideLinkPreview
                  removePendingMessage={() => {}}
                  sendOnePendingMessage={() => {}}
                />
              </Flex>
            </Flex>
            <Flex align={'center'} gap='2' className='pl-11'>
              <ViewThreadParticipants participants={thread.participants ?? []} />
              <Text as='div' size='1' className={'font-medium text-accent-a11'}>
                {thread.reply_count ?? 0} phản hồi
              </Text>
            </Flex>
            {/* {lastMessageDetails && <LastMessagePreview
                            details={lastMessageDetails}
                            timestamp={thread.last_message_timestamp}
                            isActive={isActive}
                        />} */}
          </Flex>
          {unreadCount > 0 && (
            <Badge variant='soft' className='font-bold' size='2'>
              {unreadCount}
            </Badge>
          )}
        </div>
      )}
    </NavLink>
  )
}
