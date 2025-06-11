// src/components/sidebar/SidebarBody.tsx
import { useContext, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Flex, ScrollArea } from '@radix-ui/themes'

import { ChannelListContext, ChannelListContextType } from '@/utils/channel/ChannelListProvider'
import { setSortedChannels } from '@/store/slices/channelSlice'

import CircleUserList from './CircleUserList'
import IsTabletSidebarNav from './IsTabletSidebarNav'
import { useIsTablet } from '@/hooks/useMediaQuery'
import { DirectMessageList } from '../../feature/direct-messages/DirectMessageListCustom'
import { prepareSortedChannels } from '@/hooks/useEnrichedChannels'
import { useUnreadMessages } from '@/utils/layout/sidebar'
import { RootState } from '@/store'

export type SidebarBodyProps = {
  size: number
}

export const SidebarBody = () => {
  // khởi tạo danh sách channel -> rồi sort
  const dispatch = useDispatch()
  const { channels, dm_channels } = useContext(ChannelListContext) as ChannelListContextType
  const unreadList = useSelector((state: RootState) => state.unread.message)

  const isTablet = useIsTablet()

  useEffect(() => {
    if (channels && dm_channels) {
      const sorted = prepareSortedChannels(channels, dm_channels, unreadList ?? [])
      dispatch(setSortedChannels(sorted))
    }
  }, [channels, dm_channels, unreadList, dispatch])

  return (
    <ScrollArea type='hover' scrollbars='vertical' className='h-[calc(100vh-4rem)] sidebar-scroll'>
      <Flex direction='column' gap='2' className='overflow-x-hidden pb-12 sm:pb-0' px='2'>
        <Flex direction='column' gap='1' className='pb-0.5' />
        {/* <CircleUserList /> */}
        {isTablet && <IsTabletSidebarNav />}
        <DirectMessageList />
      </Flex>
    </ScrollArea>
  )
}
