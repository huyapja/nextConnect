import { useSWRConfig } from 'frappe-react-sdk'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { UnreadThread } from './useUnreadThreadsCount'

/** Whenever a thread is opened/closed, this hook will reset it's unread count to 0 */
const useThreadPageActive = (threadID?: string) => {
  const { mutate } = useSWRConfig()
  const { workspaceID } = useParams()

  useEffect(() => {
    const updateThreadCountToZero = (threadID?: string) => {
      if (!threadID) return

      mutate(
        ['unread_thread_count', workspaceID],
        (data?: { message?: UnreadThread[] }) => {
          if (data && Array.isArray(data.message)) {
            const unreadThreads = [...data.message]
            const threadIndex = unreadThreads.findIndex((thread) => thread.name === threadID)

            if (threadIndex !== -1) {
              unreadThreads.splice(threadIndex, 1)
            }

            return { message: unreadThreads }
          }

          return data
        },
        { revalidate: false }
      )
    }

    updateThreadCountToZero(threadID)

    return () => {
      updateThreadCountToZero(threadID)
    }
  }, [threadID, workspaceID])
}

export default useThreadPageActive
