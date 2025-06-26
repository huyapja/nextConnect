import { UserAvatar } from '@/components/common/UserAvatar'
import { PageHeader } from '@/components/layout/Heading/PageHeader'
import useIsUserOnLeave from '@/hooks/fetchers/useIsUserOnLeave'
import { useGetUser } from '@/hooks/useGetUser'
import { useIsUserActive } from '@/hooks/useIsUserActive'
import { useIsDesktop, useIsTablet } from '@/hooks/useMediaQuery'
import { UserContext } from '@/utils/auth/UserProvider'
import { sortedChannelsAtom, useEnrichedSortedChannels } from '@/utils/channel/ChannelAtom'
import { DMChannelListItem } from '@/utils/channel/ChannelListProvider'
import { replaceCurrentUserFromDMChannelName } from '@/utils/operations'
import { Badge, Flex, Heading } from '@radix-ui/themes'
import { Key, useContext, useMemo } from 'react'
import { BiChevronLeft } from 'react-icons/bi'
import { Link } from 'react-router-dom'
import ChannelLabelBadge from '../channels/ChannelLabelBadge'
import { ViewPinnedMessagesButton } from '../pinned-messages/ViewPinnedMessagesButton'
import ChannelHeaderMenu from './ChannelHeaderMenu'
import { useAtomValue } from 'jotai'

interface DMChannelHeaderProps {
  channelData: DMChannelListItem
}

export const DMChannelHeader = ({ channelData }: DMChannelHeaderProps) => {
  const { currentUser } = useContext(UserContext)
  const isTablet = useIsTablet()

  const peerUserId = channelData.peer_user_id
  const peerUser = useGetUser(peerUserId || '')
  const isActive = useIsUserActive(peerUserId)
  const isUserOnLeave = useIsUserOnLeave(peerUserId)
  const isBot = peerUser?.type === 'Bot'
  const isDesktop = useIsDesktop()

  const userImage = peerUser?.user_image ?? ''
  const userName = peerUser?.full_name ?? replaceCurrentUserFromDMChannelName(channelData.channel_name, currentUser)

  const lastWorkspace = localStorage.getItem('ravenLastWorkspace')

  const enrichedChannels = useEnrichedSortedChannels()
  const currentChannel = useMemo(
    () => enrichedChannels.find((ch) => ch.name === channelData.name),
    [enrichedChannels, channelData.name]
  )

  const userLabels = currentChannel?.user_labels || []

  return (
    <PageHeader>
      <Flex gap='3' align='center'>
        <Link
          to={`/${lastWorkspace}`}
          className='block bg-transparent hover:bg-transparent active:bg-transparent sm:hidden'
        >
          <BiChevronLeft size='24' className='block text-gray-12' />
        </Link>

        <UserAvatar
          key={peerUserId}
          alt={userName}
          src={userImage}
          isActive={isActive}
          availabilityStatus={peerUser?.availability_status}
          skeletonSize='6'
          isBot={isBot}
          size={isDesktop ? '2' : '1'}
        />

        <Heading
          size={{
            initial: '4',
            sm: '5'
          }}
        >
          <div className='flex flex-wrap items-center gap-2'>
            <span>{userName}</span>

            {!isTablet &&
              Array.isArray(channelData.user_labels) &&
              userLabels.map((label: { label_id: Key | null | undefined; label: string }) => (
                <ChannelLabelBadge
                  key={label.label_id}
                  channelID={channelData.name}
                  labelID={label.label_id as string}
                  labelName={label.label}
                />
              ))}

            {!peerUser && (
              <Badge color='gray' variant='soft'>
                Deleted
              </Badge>
            )}
            {peerUser?.enabled === 0 && (
              <Badge color='gray' variant='soft'>
                Disabled
              </Badge>
            )}
            {peerUser?.custom_status && (
              <Badge color='gray' className='font-semibold px-1.5 py-0.5'>
                {peerUser.custom_status}
              </Badge>
            )}
            {isUserOnLeave && (
              <Badge color='yellow' variant='surface'>
                On Leave
              </Badge>
            )}
            {isBot && (
              <Badge color='gray' className='font-semibold px-1.5 py-0.5'>
                Bot
              </Badge>
            )}
          </div>
        </Heading>

        <ViewPinnedMessagesButton pinnedMessagesString={channelData.pinned_messages_string ?? ''} />
      </Flex>

      <Flex className='mr-3' gap='4' align='center'>
        <ChannelHeaderMenu channelData={channelData} />
      </Flex>
    </PageHeader>
  )
}
