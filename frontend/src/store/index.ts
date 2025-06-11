// store/index.ts
import { configureStore } from '@reduxjs/toolkit'
import channelReducer from './slices/channelSlice'
import unreadReducer from './slices/unreadSlice'
import localChannelReducer from './slices/localChannelSlice'

export const store = configureStore({
  reducer: {
    channel: channelReducer,
    unread: unreadReducer,
    localChannel: localChannelReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
