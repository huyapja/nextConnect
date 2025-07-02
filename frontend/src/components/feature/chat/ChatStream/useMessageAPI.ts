import { useIsMobile } from '@/hooks/useMediaQuery'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { MutableRefObject, useMemo } from 'react'
import { Message } from '../../../../../../types/Messaging/Message'

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

  // Kiểm tra xem có phải là draft channel không
  const isDraftChannel = channelID.startsWith('_')

  // Tạo fake data cho draft channels
  const draftChannelData: GetMessagesResponse = useMemo(
    () => ({
      message: {
        messages: [],
        has_old_messages: false,
        has_new_messages: false
      }
    }),
    []
  )

  // Hook cho channels thực sự - chỉ gọi khi không phải draft channel
  const realChannelAPI = useFrappeGetCall<GetMessagesResponse>(
    'raven.api.chat_stream.get_messages',
    isDraftChannel
      ? undefined
      : {
          channel_id: channelID,
          base_message: selected_message ? selected_message : undefined
        },
    isDraftChannel
      ? `draft_channel_${channelID}`
      : {
          path: `get_messages_for_channel_${channelID}`,
          baseMessage: selected_message ? selected_message : undefined
        },
    isDraftChannel
      ? {
          fallbackData: draftChannelData,
          revalidateOnFocus: false,
          revalidateOnMount: false
        }
      : {
          revalidateOnFocus: isMobile ? true : false,
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

  const { call: fetchOlderMessages, loading: loadingOlderMessages } = useFrappePostCall(
    'raven.api.chat_stream.get_older_messages'
  )

  const { call: fetchNewerMessages, loading: loadingNewerMessages } = useFrappePostCall(
    'raven.api.chat_stream.get_newer_messages'
  )

  const { call: trackVisit } = useFrappePostCall('raven.api.raven_channel_member.track_visit')

  // Trả về dữ liệu thích hợp dựa trên loại channel
  if (isDraftChannel) {
    return {
      data: draftChannelData,
      isLoading: false,
      error: null,
      mutate: () => Promise.resolve(draftChannelData),
      fetchOlderMessages,
      loadingOlderMessages,
      fetchNewerMessages,
      loadingNewerMessages,
      trackVisit
    }
  }

  return {
    data: realChannelAPI.data,
    isLoading: realChannelAPI.isLoading,
    error: realChannelAPI.error,
    mutate: realChannelAPI.mutate,
    fetchOlderMessages,
    loadingOlderMessages,
    fetchNewerMessages,
    loadingNewerMessages,
    trackVisit
  }
}
