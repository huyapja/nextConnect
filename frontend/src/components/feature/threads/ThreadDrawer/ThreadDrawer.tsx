import { Box, Flex } from '@radix-ui/themes'
import { useParams, useNavigate } from 'react-router-dom'
import { ThreadMessages } from './ThreadMessages'
import { useFrappeGetDoc, useFrappeEventListener } from 'frappe-react-sdk'
import { ErrorBanner } from '@/components/layout/AlertBanner/ErrorBanner'
import { FullPageLoader } from '@/components/layout/Loaders/FullPageLoader'
import { ThreadHeader } from './ThreadHeader'
import { Message } from '../../../../../../types/Messaging/Message'
import useThreadPageActive from '@/hooks/useThreadPageActive'

const ThreadDrawer = () => {
  const { workspaceID, channelID, threadID } = useParams<{ workspaceID: string; channelID: string; threadID: string }>()
  const navigate = useNavigate()

  const { data, error, isLoading } = useFrappeGetDoc<Message>('Raven Message', threadID, threadID, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    keepPreviousData: false
  })

  useFrappeEventListener('thread_deleted', (event) => {
    if (event.thread_id === threadID && workspaceID && channelID) {
      navigate(`/${workspaceID}/${channelID}`)
    }
  })

  useThreadPageActive(threadID)

  return (
    <div>
      <Flex direction='column' gap='0' className='relative h-[100vh] border-l border-gray-4 sm:dark:border-gray-6'>
        <ThreadHeader />
        {isLoading && <FullPageLoader />}
        {error && (
          <Box p='4'>
            <ErrorBanner error={error} />
          </Box>
        )}
        {data && <ThreadMessages threadMessage={data} key={threadID} />}
      </Flex>
    </div>
  )
}

export const Component = ThreadDrawer
