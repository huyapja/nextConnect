// store/selectors/channelSelectors.ts
import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '@/store'
import { ChannelWithGroupType } from '../slices/channelSlice'

export const sortedChannelsSelector = (state: RootState) => state.channel.sortedChannels
export const doneListSelector = (state: RootState) => state.channel.doneList

export const filteredChannelsSelector = createSelector(
  [sortedChannelsSelector, doneListSelector],
  (channels, doneList): ChannelWithGroupType[] => {
    return channels.filter((channel) => !doneList.includes(channel.name))
  }
)
