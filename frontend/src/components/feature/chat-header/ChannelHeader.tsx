import { PageHeader } from '@/components/layout/Heading/PageHeader'
import { useIsTablet } from '@/hooks/useMediaQuery'
import { useEnrichedSortedChannels } from '@/utils/channel/ChannelAtom'
import { ChannelListItem } from '@/utils/channel/ChannelListProvider'
import { ChannelIcon } from '@/utils/layout/channelIcon'
import { Flex, Heading } from '@radix-ui/themes'
import { useMemo, useState } from 'react'
import { BiChevronLeft } from 'react-icons/bi'
import { Link } from 'react-router-dom'
import { EditChannelNameButton } from '../channel-details/rename-channel/EditChannelNameButton'
import ChannelLabelBadge from '../channels/ChannelLabelBadge'
import ViewChannelDetailsModal from '../channels/ViewChannelDetailsModal'
import { ViewPinnedMessagesButton } from '../pinned-messages/ViewPinnedMessagesButton'
import ChannelHeaderMenu from './ChannelHeaderMenu'
import { ViewChannelMemberAvatars } from './ViewChannelMemberAvatars'

interface ChannelHeaderProps {
  channelData: ChannelListItem
}
export const ChannelHeader = ({ channelData }: ChannelHeaderProps) => {
  const lastWorkspace = localStorage.getItem('ravenLastWorkspace')
  const [open, setOpen] = useState(false)

  const isTablet = useIsTablet()

  const enrichedChannels = useEnrichedSortedChannels()
  const enrichedChannel = useMemo(
    () => enrichedChannels.find((ch) => ch.name === channelData.name),
    [enrichedChannels, channelData.name]
  )

  const userLabels = enrichedChannel?.user_labels || []

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
          <Flex gap='1' align={'center'}>
            <ChannelIcon type={channelData.type} size='18' />
            <Heading
              size={{
                initial: '4',
                sm: '5'
              }}
              className='mb-0.5 text-ellipsis line-clamp-1'
            >
              <div className='flex flex-wrap items-center gap-2'>
                <span>{channelData.channel_name}</span>

                {/* ✅ Hiển thị nhãn user_labels */}
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

          <EditChannelNameButton
            channelID={channelData.name}
            channel_name={channelData.channel_name}
            channelType={channelData.type}
            disabled={channelData.is_archived == 1}
            buttonVisible={!!channelData.pinned_messages_string}
          />
          <ViewPinnedMessagesButton pinnedMessagesString={channelData.pinned_messages_string ?? ''} />
        </Flex>
      </Flex>

      <Flex gap='2' align='center' className='animate-fadein'>
        <div onClick={() => setOpen(true)}>
          <ViewChannelMemberAvatars channelData={channelData} />
        </div>
        <ChannelHeaderMenu channelData={channelData} />
      </Flex>

      <ViewChannelDetailsModal open={open} setOpen={setOpen} channelData={channelData} defaultTab='Members' />
    </PageHeader>
  )
}

