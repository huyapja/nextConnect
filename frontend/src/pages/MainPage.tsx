import { Flex, Box } from '@radix-ui/themes'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { lazy, Suspense, useContext, useEffect } from 'react'
import { Sidebar } from '../components/layout/Sidebar/Sidebar'
import { ChannelListProvider } from '../utils/channel/ChannelListProvider'
import { UserListProvider } from '@/utils/users/UserListProvider'
import { hasRavenUserRole } from '@/utils/roles'
import { FullPageLoader } from '@/components/layout/Loaders/FullPageLoader'
import CommandMenu from '@/components/feature/CommandMenu/CommandMenu'
import { useFetchActiveUsersRealtime } from '@/hooks/fetchers/useFetchActiveUsers'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { showNotification } from '@/utils/pushNotifications'
import MessageActionController from '@/components/feature/message-actions/MessageActionController'
import { useActiveSocketConnection } from '@/hooks/useActiveSocketConnection'
import { useFrappeEventListener, useSWRConfig } from 'frappe-react-sdk'
import { useUnreadThreadsCountEventListener } from '@/hooks/useUnreadThreadsCount'
import { UserContext } from '@/utils/auth/UserProvider'
import { SidebarModeProvider } from '@/utils/layout/sidebar'
import { CircleUserListProvider } from '@/utils/users/CircleUserListProvider'

const AddRavenUsersPage = lazy(() => import('@/pages/AddRavenUsersPage'))

export const MainPage = () => {
  const isRavenUser = hasRavenUserRole()
  if (isRavenUser) {
    return <MainPageContent />
  } else {
    // If the user does not have the Raven User role, then show an error message if the user cannot add more people.
    // Else, show the page to add people to Raven
    return (
      <Suspense fallback={<FullPageLoader />}>
        <AddRavenUsersPage />
      </Suspense>
    )
  }
}

const MainPageContent = () => {
  const { currentUser } = useContext(UserContext)
  const navigate = useNavigate()

  useFetchActiveUsersRealtime()

  useEffect(() => {
    //@ts-expect-error
    window?.frappePushNotification?.onMessage((payload) => {
      showNotification(payload)
    })
  }, [])

  const isMobile = useIsMobile()

  useActiveSocketConnection()

  // Listen to channel members updated events and invalidate the channel members cache
  const { mutate } = useSWRConfig()

  useFrappeEventListener('channel_members_updated', (payload) => {
    mutate(['channel_members', payload.channel_id])
  })

  const onThreadReplyEvent = useUnreadThreadsCountEventListener()

  const { threadID, workspaceID } = useParams()

  // ✅ Listen cho thread_deleted event để redirect user
  useFrappeEventListener('thread_deleted', (event) => {
    console.log('🔥 Thread deleted event received:', event)
    // Nếu user đang ở trong thread bị xóa, redirect ra ngoài
    if (threadID && threadID === event.thread_id) {
      console.log('🔥 Redirecting user out of deleted thread:', threadID)
      navigate(`/${workspaceID}/threads`, { replace: true })
    }
    
    // ✅ Cũng invalidate thread-related caches
    mutate((key) => {
      return typeof key === 'string' && key.includes('raven.api.threads')
    }, undefined, { revalidate: true })
  })

  // Listen to realtime event for new message count
  useFrappeEventListener('thread_reply', (event) => {
    if (event.channel_id) {
      mutate(
        ['thread_reply_count', event.channel_id],
        {
          message: event.number_of_replies
        },
        {
          revalidate: false
        }
      )

      // Dispatch a custom event that ThreadsList can listen to if it's mounted
      window.dispatchEvent(
        new CustomEvent('thread_updated', {
          detail: {
            threadId: event.channel_id,
            sentBy: event.sent_by,
            lastMessageTimestamp: event.last_message_timestamp,
            numberOfReplies: event.number_of_replies
          }
        })
      )
    }

    // Unread count only needs to be fetched for certain conditions

    // Ignore the event if the message is sent by the current user
    if (event.sent_by === currentUser) return

    // Ignore the event if the message is in the current open thread
    if (threadID === event.channel_id) return

    onThreadReplyEvent(event.channel_id)
  })

  return (
    <UserListProvider>
      <ChannelListProvider>
        <SidebarModeProvider>
          <CircleUserListProvider>
            <Flex>
              {!isMobile && (
                <Box className={`w-90 bg-gray-2 border-r-gray-3 dark:bg-gray-1`}>
                  <Sidebar />
                </Box>
              )}
              <Box className='w-[calc(100vw-var(--sidebar-width)-0rem)] dark:bg-gray-2'>
                <Outlet />
              </Box>
            </Flex>
          </CircleUserListProvider>
        </SidebarModeProvider>
        <CommandMenu />
        <MessageActionController />
      </ChannelListProvider>
    </UserListProvider>
  )
}