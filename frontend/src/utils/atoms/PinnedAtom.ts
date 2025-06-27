import { atom } from 'jotai'

const LOCAL_STORAGE_KEY = 'raven_pinned_channels'

/** Đọc danh sách pin từ localStorage khi app khởi động */
const getInitialPinned = (): string[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Danh sách kênh đã ghim */
export const pinnedChannelsAtom = atom<string[]>(getInitialPinned())

/** Toggle ghim / bỏ ghim 1 channel */
export const togglePinnedChannelAtom = atom(null, (get, set, channelName: string) => {
  const current = get(pinnedChannelsAtom)
  const exists = current.includes(channelName)
  const updated = exists ? current.filter((id) => id !== channelName) : [...current, channelName]

  set(pinnedChannelsAtom, updated)
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
})
