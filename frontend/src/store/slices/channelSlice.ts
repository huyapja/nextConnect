// store/slices/channelSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ChannelInfo {
  name: string
  channel_name: string
  type: string
  is_direct_message: number
  is_self_message: number
  last_message_timestamp: string | null
  last_message_details: string | null
  peer_user_id: string | null
  unread_count: number
  [key: string]: any
}

export interface ChannelWithGroupType extends ChannelInfo {
  group_type: 'channel' | 'dm'
}

interface ChannelState {
  sortedChannels: ChannelWithGroupType[]
  doneList: string[]
  selectedChannels: ChannelInfo[]
}


const initialState: ChannelState = {
  sortedChannels: [],
  doneList: [],
  selectedChannels: []
}

const channelSlice = createSlice({
  name: 'channel',
  initialState,
  reducers: {
    setSortedChannels(state, action: PayloadAction<ChannelWithGroupType[]>) {
      state.sortedChannels = action.payload
    },
    updateSortedChannels(state, action: PayloadAction<(prev: ChannelWithGroupType[]) => ChannelWithGroupType[]>) {
      state.sortedChannels = action.payload(state.sortedChannels)
    },
    setDoneList(state, action: PayloadAction<string[]>) {
      state.doneList = action.payload
    },
    addDone(state, action: PayloadAction<string>) {
      if (!state.doneList.includes(action.payload)) {
        state.doneList.push(action.payload)
      }
    },
    removeDone(state, action: PayloadAction<string>) {
      state.doneList = state.doneList.filter((name) => name !== action.payload)
    },

    // ✅ CircleUserList integration
    setSelectedChannels(state, action: PayloadAction<ChannelInfo[]>) {
      state.selectedChannels = action.payload
    },
    pushSelectedChannel(state, action: PayloadAction<ChannelInfo>) {
      const exists = state.selectedChannels.find((c) => c.name === action.payload.name)
      if (!exists) {
        state.selectedChannels.push(action.payload)
      }
    },
    removeSelectedChannel(state, action: PayloadAction<string>) {
      state.selectedChannels = state.selectedChannels.filter((c) => c.name !== action.payload)
    }
  }
})

export const {
  setSortedChannels,
  updateSortedChannels,
  setDoneList,
  addDone,
  removeDone,
  setSelectedChannels,
  pushSelectedChannel,
  removeSelectedChannel
} = channelSlice.actions

export default channelSlice.reducer
