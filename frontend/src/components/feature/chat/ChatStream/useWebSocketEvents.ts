import { UserContext } from '@/utils/auth/UserProvider'
import { useChannelList, useUpdateLastMessageDetails } from '@/utils/channel/ChannelListProvider'
import { useFrappeDocumentEventListener } from 'frappe-react-sdk'
import { useContext } from 'react'
import { useSocketEventManager } from '@/hooks/useSocketEventManager'

export const useWebSocketEvents = (
  channelID: string,
  mutate: any,
  scrollToBottom: (behavior?: 'smooth' | 'auto') => void,
  setHasNewMessages: (hasNew: boolean) => void,
  setNewMessageCount: (count: number | ((prev: number) => number)) => void,
  // Thêm callback để track tin nhắn mới
  onNewMessageAdded?: (messageId: string) => void,
  isAtBottom?: boolean
) => {
  const { currentUser } = useContext(UserContext)
  const { updateLastMessageForChannel } = useUpdateLastMessageDetails()
  const { channels, dm_channels } = useChannelList()

  // Legacy document event listener - giữ nguyên cho compatibility
  useFrappeDocumentEventListener('Raven Channel', channelID ?? '', () => {
    console.debug(`Raven Channel event received for channel: ${channelID}`)
  })

  // Sử dụng Socket Event Manager mới
  useSocketEventManager(
    channelID,
    {
      onMessageCreated: (event) => {
        console.debug(`Processing message_created event for channel: ${channelID}`, event)

        mutate(
          (d: any) => {
            if (!d) return d

            const existingMessages = d.message.messages ?? []
            const newMessages = [...existingMessages]

            if (event.message_details) {
              const messageIndex = existingMessages.findIndex((msg: any) => msg.name === event.message_details.name)

              if (messageIndex !== -1) {
                // Cập nhật tin nhắn đã tồn tại
                newMessages[messageIndex] = event.message_details
              } else {
                // Thêm tin nhắn mới
                newMessages.push(event.message_details)
              }
            }

            // Sắp xếp theo thời gian tạo
            newMessages.sort((a: any, b: any) => new Date(b.creation).getTime() - new Date(a.creation).getTime())

            return {
              message: {
                messages: newMessages,
                has_old_messages: d.message.has_old_messages ?? false,
                has_new_messages: d.message.has_new_messages ?? false
              }
            }
          },
          { revalidate: false }
        ).then(() => {
          const isFromOtherUser = event.message_details?.owner !== currentUser

          // Tự động scroll nếu là tin nhắn của người dùng hiện tại
          if (!isFromOtherUser) {
            scrollToBottom('auto')
          }

          // Chỉ hiển thị notification cho tin nhắn từ người khác và khi không ở bottom
          if (isFromOtherUser && !isAtBottom) {
            setNewMessageCount((count) => count + 1)
            setHasNewMessages(true)
            onNewMessageAdded?.(event.message_details.name)
          }
        })
      },

      onMessageEdited: (event) => {
        mutate(
          (d: any) => {
            if (event.message_id && d) {
              const newMessages = d.message.messages?.map((message: any) => {
                if (message.name === event.message_id) {
                  return { ...message, ...event.message_details }
                }
                return message
              })

              return {
                message: {
                  messages: newMessages,
                  has_old_messages: d.message.has_old_messages,
                  has_new_messages: d.message.has_new_messages
                }
              }
            }
            return d
          },
          { revalidate: false }
        )
      },

      onMessageDeleted: (event) => {
        mutate(
          (d: any) => {
            if (d) {
              const newMessages = d.message.messages.filter((message: any) => message.name !== event.message_id)
              return {
                message: {
                  messages: newMessages,
                  has_old_messages: d.message.has_old_messages,
                  has_new_messages: d.message.has_new_messages
                }
              }
            }
            return d
          },
          { revalidate: false }
        )
      },

      onMessageReacted: (event) => {
        mutate(
          (d: any) => {
            if (event.message_id && d) {
              const newMessages = d.message.messages?.map((message: any) => {
                if (message.name === event.message_id) {
                  return { ...message, message_reactions: event.reactions }
                }
                return message
              })

              return {
                message: {
                  messages: newMessages,
                  has_old_messages: d.message.has_old_messages,
                  has_new_messages: d.message.has_new_messages
                }
              }
            }
            return d
          },
          { revalidate: false }
        )
      },

      onMessageSaved: (event) => {
        mutate(
          (d: any) => {
            if (event.message_id && d) {
              const newMessages = d.message.messages?.map((message: any) => {
                if (message.name === event.message_id) {
                  return { ...message, _liked_by: event.liked_by }
                }
                return message
              })

              return {
                message: {
                  messages: newMessages,
                  has_old_messages: d.message.has_old_messages,
                  has_new_messages: d.message.has_new_messages
                }
              }
            }
            return d
          },
          { revalidate: false }
        )
      },

      onMessageRetracted: (event) => {
        const { message_id, channel_id, is_last_message, owner, message_type, is_bot_message, bot, timestamp } = event

        const isKnownChannel = [...channels, ...dm_channels].some((c) => c.name === channel_id)

        if (is_last_message && isKnownChannel) {
          console.log('updateLastMessageForChannel')
          updateLastMessageForChannel(channel_id, {
            message_id,
            content: 'Tin nhắn đã được thu hồi',
            owner,
            message_type,
            is_bot_message,
            bot: bot || null,
            timestamp
          })
        }

        console.log('mutate message retracted')

        mutate(
          (data: any) => {
            if (!message_id || !data?.message?.messages) return data

            const updatedMessages = data.message.messages.map((msg: any) =>
              msg.name === message_id ? { ...msg, is_retracted: 1 } : msg
            )

            return {
              ...data,
              message: {
                ...data.message,
                messages: updatedMessages
              }
            }
          },
          { revalidate: false }
        )
      }
    },
    {
      enableLogging: process.env.NODE_ENV === 'development',
      debugMode: false // Set to true để debug chi tiết
    }
  )
}
