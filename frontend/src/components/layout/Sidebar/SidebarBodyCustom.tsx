import { useIsTablet } from '@/hooks/useMediaQuery'
import { prepareSortedChannels, setSortedChannelsAtom, sortedChannelsAtom } from '@/utils/channel/ChannelAtom'
import { channelIsDoneAtom } from '@/utils/channel/channelIsDoneAtom'
import { ChannelListContext, ChannelListContextType } from '@/utils/channel/ChannelListProvider'
import { Flex, ScrollArea } from '@radix-ui/themes'
import { useAtomValue, useSetAtom } from 'jotai'
import { useContext, useEffect } from 'react'
import { DirectMessageList } from '../../feature/direct-messages/DirectMessageListCustom'
import IsTabletSidebarNav from './IsTabletSidebarNav'
import { useSidebarMode } from '@/utils/layout/sidebar'
import { useLabelList } from '@/components/feature/labels/conversations/atoms/labelAtom'
import { FC } from 'react'
import { PinnedChannels } from './PinnedChannels'

// import BeatLoader from '../Loaders/BeatLoader'

export const SidebarBody: FC = () => {
  const { channels, dm_channels } = useContext(ChannelListContext) as ChannelListContextType

  const setSortedChannels = useSetAtom(setSortedChannelsAtom)

  const currentChannelIsDone = useAtomValue(channelIsDoneAtom)

  const { refreshLabelList } = useLabelList()
  const prev = useAtomValue(sortedChannelsAtom)

  useEffect(() => {
    if (channels?.length === 0 && dm_channels?.length === 0) return

    // Nếu đang trong Jotai write atom
    const sorted = prepareSortedChannels(channels, dm_channels, currentChannelIsDone, prev)

    setSortedChannels(sorted)
  }, [channels, dm_channels, setSortedChannels, currentChannelIsDone])

  useEffect(() => {
    refreshLabelList()
  }, [])

  const isTablet = useIsTablet()

  const { title } = useSidebarMode()

  const content = (
    <Flex direction='column' gap='2' className='overflow-hidden pb-12 sm:pb-0' px='2'>
      <Flex direction='column' gap='1' className='pb-0.5'></Flex>
      {/* <CircleUserList /> */}
      <PinnedChannels />
      {/* <p>hello</p> */}
      {isTablet && <IsTabletSidebarNav />}
      {/* <PinnedChannels unread_count={unread_count?.message} /> */}
      <DirectMessageList />
    </Flex>
  )

  if (title === 'Chủ đề') {
    return content
  }

  return (
    <ScrollArea type='hover' scrollbars='vertical' className='h-[calc(100vh-4rem)] sidebar-scroll'>
      {content}
    </ScrollArea>
  )
}
