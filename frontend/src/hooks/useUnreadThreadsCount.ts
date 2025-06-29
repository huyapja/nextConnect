import { FrappeConfig, FrappeContext, useFrappeGetCall, useSWRConfig } from 'frappe-react-sdk'
import { useCallback, useContext } from 'react'
import { useParams } from 'react-router-dom'

// --- Kiểu dữ liệu ---
export type UnreadThread = { name: string; unread_count: number }

export interface UnreadThreadResponse {
  threads: UnreadThread[]
  total_unread_threads: number
}

// --- Hook chính để fetch và mutate ---
const useUnreadThreadsCount = () => {
  const { workspaceID } = useParams()
  const swrKey = ['unread_thread_count', workspaceID]

  const { data, isValidating, error, mutate } = useFrappeGetCall<{ message: UnreadThreadResponse }>(
    'raven.api.threads.get_unread_threads',
    { workspace: workspaceID },
    swrKey
  )

  // ✅ Hàm để mark thread là đã đọc (xóa khỏi danh sách local)
  const markThreadAsRead = useCallback(
    (threadID: string) => {
      mutate(
        (currentData?: { message: UnreadThreadResponse }) => {
          const existing = currentData?.message?.threads ?? []

          const updatedThreads = existing.filter((t) => t.name !== threadID)

          const total = updatedThreads.reduce((sum, t) => sum + t.unread_count, 0)

          return {
            message: {
              threads: updatedThreads,
              total_unread_threads: total
            }
          }
        },
        { revalidate: false }
      )
    },
    [mutate]
  )

  return {
    data,
    isValidating,
    error,
    markThreadAsRead,
    mutateUnreadThreads: mutate
  }
}

// --- Hook dùng cho sự kiện reply vào thread ---
export const useUnreadThreadsCountEventListener = () => {
  const { workspaceID } = useParams()
  const { call } = useContext(FrappeContext) as FrappeConfig
  const { mutate } = useSWRConfig()

  const onThreadReplyEvent = useCallback(
    (threadID: string) => {
      mutate(
        ['unread_thread_count', workspaceID],
        async (data?: { message: UnreadThreadResponse }) => {
          try {
            const res = await call.get<{ message: UnreadThreadResponse }>('raven.api.threads.get_unread_threads', {
              workspace: workspaceID,
              thread_id: threadID
            })

            const fetched = res.message?.threads?.[0]
            if (!fetched) return data

            const existing = data?.message?.threads ?? []

            const updatedThreads = (() => {
              const idx = existing.findIndex((t) => t.name === threadID)
              if (idx !== -1) {
                const copy = [...existing]
                copy[idx] = fetched
                return copy
              } else {
                return [...existing, fetched]
              }
            })()

            const total = updatedThreads.reduce((sum, t) => sum + t.unread_count, 0)

            return {
              message: {
                threads: updatedThreads,
                total_unread_threads: total
              }
            }
          } catch (err) {
            console.error(err)
            return data
          }
        },
        { revalidate: false }
      )
    },
    [workspaceID]
  )

  return onThreadReplyEvent
}

export default useUnreadThreadsCount
