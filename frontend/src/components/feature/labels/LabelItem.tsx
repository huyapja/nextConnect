import { truncateText } from '@/utils/textUtils/truncateText'
import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery'
import { useMemo, useState } from 'react'
import { HiChevronDown, HiChevronRight } from 'react-icons/hi'
import { MdLabelOutline } from 'react-icons/md'
import LabelItemList from './LabelItemList'
import LabelItemMenu from './LabelItemMenu'
<<<<<<< HEAD
import { ChannelWithGroupType, sortedChannelsAtom, useEnrichedLabelChannels, useEnrichedSortedChannels } from '@/utils/channel/ChannelAtom'
import { useAtomValue } from 'jotai'
import { labelListAtom } from './conversations/atoms/labelAtom'
import { useUnreadCount } from '@/utils/layout/sidebar'

interface LabelItemProps {
  label: string
  name: string
  channels: any[]
}

=======
import { useEnrichedLabelChannels } from '@/utils/channel/ChannelAtom'

>>>>>>> upstream/hotfix-production
const LabelItem: React.FC<{ label: string; name: string }> = ({ label, name }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const labelChannels = useEnrichedLabelChannels(name)

  const totalCount = useMemo(() => labelChannels.reduce((sum, ch) => sum + (ch.unread_count ?? 0), 0), [labelChannels])

  const toggle = () => setIsExpanded((prev) => !prev)
  const isTablet = useIsTablet()
  const isMobile = useIsMobile()
  const maxLength = isTablet || isMobile ? 18 : 20

  return (
    <div className='space-y-1'>
      <div className='relative'>
        <div onClick={toggle} className='px-3 py-2 rounded-md hover:bg-gray-3 transition-colors cursor-pointer'>
          <div className='flex items-center gap-2 text-sm text-gray-12'>
            {isExpanded ? <HiChevronDown className='w-4 h-4 text-gray-11 shrink-0' /> : <HiChevronRight className='w-4 h-4 text-gray-11 shrink-0' />}
            <MdLabelOutline className='w-4 h-4 text-gray-11 shrink-0' />
            <span className='truncate'>{truncateText(label, maxLength)}</span>
            {!isExpanded && totalCount > 0 && (
              <span className='ml-auto bg-red-500 text-white text-[10px] rounded-full w-[18px] h-[18px] flex items-center justify-center'>
                {totalCount > 99 ? '99+' : totalCount}
              </span>
            )}
          </div>
        </div>

        {!(totalCount > 0 && !isExpanded) && (
          <LabelItemMenu
            channels={labelChannels.map((ch) => ({
              channel_id: ch.name,
              channel_name: ch.channel_name,
              is_direct_message: ch.is_direct_message === 1
            }))}
            name={name}
            label={label}
          />
        )}
      </div>

      {isExpanded && labelChannels?.length > 0 && (
        <div className='ml-4 space-y-1'>
          {labelChannels?.map((channel) => (
            <LabelItemList
              key={channel.name}
              channelID={channel.name}
              channelName={channel.channel_name}
              labelID={name}
              isDirectMessage={channel.is_direct_message === 1}
              unreadCount={channel.unread_count}
            />
          ))}
        </div>
      )}
    </div>
  )
}


export default LabelItem