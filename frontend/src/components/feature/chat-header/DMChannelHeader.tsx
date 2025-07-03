import { UserAvatar } from '@/components/common/UserAvatar'
import { PageHeader } from '@/components/layout/Heading/PageHeader'
import useIsUserOnLeave from '@/hooks/fetchers/useIsUserOnLeave'
import { useGetUser } from '@/hooks/useGetUser'
import { useIsUserActive } from '@/hooks/useIsUserActive'
import { useIsDesktop, useIsMobile, useIsTablet } from '@/hooks/useMediaQuery'
import { UserContext } from '@/utils/auth/UserProvider'
import { useEnrichedSortedChannels } from '@/utils/channel/ChannelAtom'
import { DMChannelListItem } from '@/utils/channel/ChannelListProvider'
import { replaceCurrentUserFromDMChannelName } from '@/utils/operations'
import { Badge, Flex, Heading } from '@radix-ui/themes'
import { Key, useContext, useMemo } from 'react'
import { BiChevronLeft } from 'react-icons/bi'
import { Link } from 'react-router-dom'
// import VideoCall from '../call-stringee/CallStringee'
import ChannelLabelBadge from '../channels/ChannelLabelBadge'
import { ViewPinnedMessagesButton } from '../pinned-messages/ViewPinnedMessagesButton'
import ChannelHeaderMenu from './ChannelHeaderMenu'
// import { useGlobalStringee } from '../call-stringee/GlobalStringeeProvider'
import clsx from 'clsx'
import { useStringee } from '@/utils/StringeeProvider'
import IncomingCallModal from '@/utils/stringee/ui/IncomingModalCall'
import { useStringeeToken } from '@/hooks/useStringeeToken'

interface DMChannelHeaderProps {
  channelData: DMChannelListItem
}

export const DMChannelHeader = ({ channelData }: DMChannelHeaderProps) => {
  const { currentUser } = useContext(UserContext)
  // const { client: globalClient } = useGlobalStringee()

  const peerUserId = channelData.peer_user_id
  const peerUser = useGetUser(peerUserId || '')
  const isActive = useIsUserActive(peerUserId)
  const isUserOnLeave = useIsUserOnLeave(peerUserId)
  const isBot = peerUser?.type === 'Bot'
  const isDesktop = useIsDesktop()
  const isTablet = useIsTablet()
  const isMobile = useIsMobile()

  const userImage = peerUser?.user_image ?? ''
  const userName = peerUser?.full_name ?? replaceCurrentUserFromDMChannelName(channelData.channel_name, currentUser)

  const lastWorkspace = localStorage.getItem('ravenLastWorkspace')

  const enrichedChannels = useEnrichedSortedChannels()
  const enrichedChannel = useMemo(
    () => enrichedChannels.find((ch) => ch.name === channelData.name),
    [enrichedChannels, channelData.name]
  )

  const userLabels = enrichedChannel?.user_labels || []

  const { makeCall } = useStringee()

  const { userId } = useStringeeToken()

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
          canUserView={true}
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
            <span
              className={clsx(
                (isTablet || isMobile) && 'truncate text-sm',
                isTablet && 'max-w-[350px]',
                isMobile && 'max-w-[180px]'
              )}
            >
              {userName}
            </span>

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
        {/* {peerUserId && <VideoCall toUserId={peerUserId} channelId={channelData.name} globalClient={globalClient} />} */}
        {peerUserId && (
          <div>
            <button
              onClick={() => {
                console.log('👤 userId:', userId)
                console.log('🎯 peerUserId:', peerUserId)

                if (!peerUserId || peerUserId === userId) {
                  console.warn('❌ Không thể gọi cho chính mình hoặc peerUserId không hợp lệ')
                  return
                }

                if (makeCall) {
                  makeCall(peerUserId)
                } else {
                  console.warn('makeCall not ready')
                }
              }}
            >
              📞 Gọi
            </button>
            {/* <button onClick={endCall}>🔚 Kết thúc</button> */}
          </div>
        )}
        <ChannelHeaderMenu channelData={channelData} />
      </Flex>
    </PageHeader>
  )
}
