import { FrappeConfig, FrappeContext, useFrappeGetCall, useSWRConfig } from 'frappe-react-sdk'
import { useCallback, useContext } from 'react'
import { useParams } from 'react-router-dom'

// Cấu trúc dữ liệu mới từ backend
export type UnreadThread = { name: string; unread_count: number }

export interface UnreadThreadResponse {
  threads: UnreadThread[]
  total_unread_threads: number
}

// Hook chính lấy tất cả unread thread
const useUnreadThreadsCount = () => {
  const { workspaceID } = useParams()

  return useFrappeGetCall<{ message: UnreadThreadResponse }>(
    'raven.api.threads.get_unread_threads',
    { workspace: workspaceID },
    ['unread_thread_count', workspaceID]
  )
}

/**
 * Hook lắng nghe sự kiện reply vào thread → cập nhật lại count cho thread tương ứng.
 */
export const useUnreadThreadsCountEventListener = () => {
  const { workspaceID } = useParams()
  const { call } = useContext(FrappeContext) as FrappeConfig
  const { mutate } = useSWRConfig()

  const onThreadReplyEvent = useCallback(
    (threadID: string) => {
      console.log('Thread reply event fired')
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

            const totalMessages = updatedThreads.reduce((sum, t) => sum + t.unread_count, 0)
            return {
              message: {
                threads: updatedThreads,
                total_unread_threads: totalMessages
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
