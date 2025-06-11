// store/slices/localChannelSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { DMChannelWithUnreadCount } from '@/components/layout/Sidebar/useGetChannelUnreadCounts'

interface State {
  localChannels: DMChannelWithUnreadCount[]
}

const initialState: State = {
  localChannels: []
}

const localChannelSlice = createSlice({
  name: 'localChannel',
  initialState,
  reducers: {
    setLocalChannels(state, action: PayloadAction<DMChannelWithUnreadCount[]>) {
      state.localChannels = action.payload
    },
    updateLocalChannel(state, action: PayloadAction<DMChannelWithUnreadCount>) {
      const index = state.localChannels.findIndex((c) => c.name === action.payload.name)
      if (index !== -1) {
        state.localChannels[index] = action.payload
      } else {
        state.localChannels.push(action.payload)
      }
    }
  }
})

export const { setLocalChannels, updateLocalChannel } = localChannelSlice.actions
export default localChannelSlice.reducer
