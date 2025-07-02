import { PageHeader } from '@/components/layout/Heading/PageHeader'
import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery'
import { useEnrichedSortedChannels } from '@/utils/channel/ChannelAtom'
import { ChannelListItem } from '@/utils/channel/ChannelListProvider'
import { ChannelIcon } from '@/utils/layout/channelIcon'
import { Flex, Heading } from '@radix-ui/themes'
import { useContext, useMemo, useState } from 'react'
import { BiChevronLeft } from 'react-icons/bi'
import { Link, useParams } from 'react-router-dom'
import { EditChannelNameButton } from '../channel-details/rename-channel/EditChannelNameButton'
import ChannelLabelBadge from '../channels/ChannelLabelBadge'
import ViewChannelDetailsModal from '../channels/ViewChannelDetailsModal'
import { ViewPinnedMessagesButton } from '../pinned-messages/ViewPinnedMessagesButton'
import ChannelHeaderMenu from './ChannelHeaderMenu'
import { ViewChannelMemberAvatars } from './ViewChannelMemberAvatars'
// import { GroupCallButton } from './GroupCallButton'
import { useAtomValue } from 'jotai'
import { channelMembersAtom } from '@/hooks/fetchers/useFetchChannelMembers'
import { UserContext } from '@/utils/auth/UserProvider'
import clsx from 'clsx'

interface ChannelHeaderProps {
  channelData: ChannelListItem
}
export const ChannelHeader = ({ channelData }: ChannelHeaderProps) => {
  const { channelID } = useParams()
  const lastWorkspace = localStorage.getItem('ravenLastWorkspace')
  const members = useAtomValue(channelMembersAtom)[channelID]
  const { currentUser } = useContext(UserContext)

  const [open, setOpen] = useState(false)

  const isTablet = useIsTablet()
  const isMobile = useIsMobile()

  const enrichedChannels = useEnrichedSortedChannels()
  const enrichedChannel = useMemo(
    () => enrichedChannels.find((ch) => ch.name === channelData.name),
    [enrichedChannels, channelData.name]
  )

  const userLabels = enrichedChannel?.user_labels || []

  const allowSettingChange = members?.[currentUser]?.is_admin === 1 || false
  return (
    <PageHeader>
      <Flex align='center'>
        <Link
          to={`/${lastWorkspace}`}
          className='block bg-transparent hover:bg-transparent active:bg-transparent sm:hidden'
        >
          <BiChevronLeft size='24' className='block text-gray-12' />
        </Link>

        <Flex gap='4' align={'center'} className='group animate-fadein pr-4'>
          <Flex gap='3' align={'center'}>
            <ChannelIcon
              canUserView={true}
              isInDetails={true}
              groupImage={channelData.group_image}
              type={channelData.type}
              allowSettingChange={allowSettingChange}
            />
            <Heading
              size={{
                initial: '4',
                sm: '5'
              }}
              className='text-ellipsis line-clamp-1'
            >
              <div className='flex flex-wrap items-center gap-2'>
                <span
                  className={clsx(
                    (isTablet || isMobile) && 'truncate text-sm',
                    isTablet && 'max-w-[350px]',
                    isMobile && 'max-w-[150px]'
                  )}
                >
                  {channelData.channel_name}
                </span>

                {!isTablet &&
                  Array.isArray(userLabels) &&
                  userLabels.map((label) => (
                    <ChannelLabelBadge
                      key={label.label_id}
                      channelID={channelData.name}
                      labelID={label.label_id}
                      labelName={label.label}
                    />
                  ))}
              </div>
            </Heading>
          </Flex>

          {allowSettingChange && (
            <EditChannelNameButton
              channelID={channelData.name}
              channel_name={channelData.channel_name}
              channelType={channelData.type}
              disabled={channelData.is_archived == 1}
              buttonVisible={!!channelData.pinned_messages_string}
            />
          )}
          <ViewPinnedMessagesButton pinnedMessagesString={channelData.pinned_messages_string ?? ''} />
        </Flex>
      </Flex>

      <Flex gap='2' align='center' className='animate-fadein'>
        {/* <GroupCallButton channelId={channelData.name} isDisabled={channelData.is_archived == 1} /> */}
        <div onClick={() => setOpen(true)}>
          <ViewChannelMemberAvatars channelData={channelData} />
        </div>
        <ChannelHeaderMenu channelData={channelData} />
      </Flex>

      <ViewChannelDetailsModal open={open} setOpen={setOpen} channelData={channelData} defaultTab='Members' />
    </PageHeader>
  )
}
