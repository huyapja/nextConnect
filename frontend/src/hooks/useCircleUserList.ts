// hooks/useCircleUserList.ts
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store'
import {
  setSelectedChannels,
  pushSelectedChannel,
  removeSelectedChannel
} from '@/store/slices/channelSlice'
import { ChannelInfo } from '@/store/slices/channelSlice'

export const useCircleUserList = () => {
  const dispatch = useDispatch()
  const selectedChannels = useSelector((state: RootState) => state.channel.selectedChannels)

  return {
    selectedChannels,
    setSelectedChannels: (channels: ChannelInfo[]) => dispatch(setSelectedChannels(channels)),
    pushChannel: (channel: ChannelInfo) => dispatch(pushSelectedChannel(channel)),
    removeChannel: (channelId: string) => dispatch(removeSelectedChannel(channelId))
  }
}
