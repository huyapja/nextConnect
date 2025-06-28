import { useIsMobile } from '@/hooks/useMediaQuery'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { MutableRefObject } from 'react'
import { Message } from '../../../../../../types/Messaging/Message'
import { useParams } from 'react-router-dom'

export interface GetMessagesResponse {
  message: {
    messages: Message[]
    has_old_messages: boolean
    has_new_messages: boolean
  }
}

export const useMessageAPI = (
  channelID: string,
  selected_message: string | null,
  highlightedMessage: string | null,
  scrollToBottom: () => void,
  scrollToMessageElement: (messageID: string) => void,
  latestMessagesLoadedRef: MutableRefObject<boolean>
) => {
  const isMobile = useIsMobile()
  const { workspaceID } = useParams<{ workspaceID: string }>()

  // Lấy tin nhắn chính
  const { data, isLoading, error, mutate } = useFrappeGetCall<GetMessagesResponse>(
    'raven.api.chat_stream.get_messages',
    {
      channel_id: channelID,
      workspace_id: workspaceID,
      base_message: selected_message || undefined
    },
    {
      path: `get_messages_${workspaceID}_${channelID}`,
      baseMessage: selected_message || undefined
    },
    {
      revalidateOnFocus: isMobile,
      revalidateOnMount: true,
      dedupingInterval: 0,
      keepPreviousData: false,
      onSuccess: (data) => {
        if (!highlightedMessage) {
          if (!data.message.has_new_messages) {
            requestAnimationFrame(() => {
              scrollToBottom()
            })
            latestMessagesLoadedRef.current = true
          }
        } else {
          scrollToMessageElement(highlightedMessage)
        }
      }
    }
  )

  // Tải thêm tin nhắn cũ
  const { call: fetchOlderMessages, loading: loadingOlderMessages } = useFrappePostCall(
    'raven.api.chat_stream.get_older_messages'
  )

  // Tải thêm tin nhắn mới
  const { call: fetchNewerMessages, loading: loadingNewerMessages } = useFrappePostCall(
    'raven.api.chat_stream.get_newer_messages'
  )

  // Gửi log truy cập channel
  const { call: trackVisit } = useFrappePostCall('raven.api.raven_channel_member.track_visit')

  return {
    data,
    isLoading,
    error,
    mutate,
    fetchOlderMessages: (args: any) => fetchOlderMessages({ ...args, workspace_id: workspaceID }),
    loadingOlderMessages,
    fetchNewerMessages: (args: any) => fetchNewerMessages({ ...args, workspace_id: workspaceID }),
    loadingNewerMessages,
    trackVisit: (args: any) => trackVisit({ ...args, workspace_id: workspaceID })
  }
}
