// store/slices/unreadSlice.ts
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { FrappeConfig } from 'frappe-react-sdk'
import { RootState } from '@/store'

export interface UnreadItem {
  name: string
  unread_count: number
  last_message_timestamp?: string
  is_direct_message?: number
  last_message_content?: string
  last_message_sender_name?: string
  channel_name?: string
  peer_user_id?: string
}

interface UnreadState {
  message: UnreadItem[]
  loading: boolean
  error: string | null
}

const initialState: UnreadState = {
  message: [],
  loading: false,
  error: null
}

// ✅ Async thunk để fetch toàn bộ unread count
export const fetchUnreadCount = createAsyncThunk<
  UnreadItem[],
  void,
  { state: RootState; extra: { call: FrappeConfig['call'] } }
>('unread/fetchUnreadCount', async (_, { extra }) => {
  const res = await extra.call.get('raven.api.raven_message.get_unread_count_for_channels')
  return res.message
})

const unreadSlice = createSlice({
  name: 'unread',
  initialState,
  reducers: {
    setUnreadMessages(state, action: PayloadAction<UnreadItem[]>) {
      state.message = action.payload
    },
    updateOrInsertUnread(state, action: PayloadAction<UnreadItem>) {
      const index = state.message.findIndex((c) => c.name === action.payload.name)
      if (index !== -1) {
        state.message[index] = { ...state.message[index], ...action.payload }
      } else {
        state.message.push(action.payload)
      }
    },
    resetUnreadCount(state, action: PayloadAction<string>) {
      const item = state.message.find((c) => c.name === action.payload)
      if (item) item.unread_count = 0
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnreadCount.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.message = action.payload
        state.loading = false
      })
      .addCase(fetchUnreadCount.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch unread messages'
      })
  }
})

export const {
  setUnreadMessages,
  updateOrInsertUnread,
  resetUnreadCount
} = unreadSlice.actions

export default unreadSlice.reducer

// ✅ Selector để lấy danh sách tin nhắn chưa đọc
export const selectUnreadMessages = (state: RootState) => state.unread.message

// ✅ Selector tính tổng `unread_count` bao gồm manuallyMarked
export const selectTotalUnreadCount = (
  state: RootState,
  manuallyMarked: Set<string>
): number => {
  const idsFromServer = new Set(state.unread.message.map((c) => c.name))
  const manualOnly = Array.from(manuallyMarked).filter((id) => !idsFromServer.has(id))
  const manualCount = manualOnly.length
  const serverCount = state.unread.message.reduce((sum, c) => sum + c.unread_count, 0)

  return manualCount + serverCount
}
