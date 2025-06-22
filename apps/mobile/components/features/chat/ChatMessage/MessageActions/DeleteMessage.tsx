import { Message } from '@raven/types/common/Message'
import { useFrappeDeleteDoc, useFrappePostCall, useSWRConfig } from 'frappe-react-sdk'
import { useCallback } from 'react'
import { Alert } from 'react-native'
import { toast } from 'sonner-native'
import TrashIcon from "@assets/icons/TrashIcon.svg"
import { useColorScheme } from '@hooks/useColorScheme'
import { GetMessagesResponse } from '@raven/types/common/ChatStream'
import ActionButton from '@components/common/Buttons/ActionButton'

interface DeleteMessageProps {
    message: Message
    onClose: () => void
}

const DeleteMessage = ({ message, onClose }: DeleteMessageProps) => {

    // const { deleteMessage, loading } = useMessageDelete(message, onClose)
    const { onRetract, loading } = useRetractMessage(message, onClose)

    const onDelete = () => {
        onRetract()
    }

    const onMessageDelete = useCallback(() => {
        Alert.alert('Thu hồi tin nhắn?', 'Bạn chắc chắn muốn thu hồi tin nhắn này với tất cả mọi người không?.', [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Thu hồi', style: 'destructive', onPress: onDelete },
        ])
    }, [])

    const { isDarkColorScheme } = useColorScheme()

    return (
        <ActionButton
            onPress={onMessageDelete}
            icon={<TrashIcon width={18} height={18} fill={isDarkColorScheme ? '#f87171' : '#dc2626'} />}
            text='Thu hồi'
            isDestructive={true}
            disabled={loading}
        />
    )
}

export default DeleteMessage

const useRetractMessage = (message: Message, onDelete: Function) => {
    const messageID = message.name;
    const { call, error, loading: isCalling } = useFrappePostCall('raven.api.raven_message.retract_message');

    const removeMessageFromCache = (data?: GetMessagesResponse): GetMessagesResponse => {
        const existingMessages = data?.message.messages ?? []
        const newMessages = existingMessages.map(msg => {
            if (msg.name === messageID) {
                msg.is_retracted = true;
            }
            return msg;
        });
        return {
            message: {
                has_old_messages: data?.message.has_old_messages ?? true,
                has_new_messages: data?.message.has_new_messages ?? false,
                messages: newMessages
            }
        }
    }

    const onRetract = async () => {
        try {
            onDelete();
            removeMessageFromCache();
            await call({ message_id: message.name });
            toast.success('Đã thu hồi tin nhắn', {
                duration: 500,
            })
        } catch (error) {
            toast.error("Thu hồi tin nhắn thất bại.")
        }
    }

    return { onRetract, loading: isCalling }
}

const useMessageDelete = (message: Message, onDelete: () => void) => {

    const { mutate } = useSWRConfig()

    const { deleteDoc, loading } = useFrappeDeleteDoc()

    const deleteMessage = async () => {

        const messageID = message.name
        const channelID = message.channel_id

        const removeMessageFromCache = (data?: GetMessagesResponse): GetMessagesResponse => {

            const existingMessages = data?.message.messages ?? []

            const newMessages = existingMessages.filter((m) => m.name !== messageID)

            return {
                message: {
                    has_old_messages: data?.message.has_old_messages ?? true,
                    has_new_messages: data?.message.has_new_messages ?? false,
                    messages: newMessages
                }
            }
        }

        // Delete the message optimistically
        return mutate({ path: `get_messages_for_channel_${channelID}` }, async (data?: GetMessagesResponse) => {
            // Make the request
            // Call the onDelete callback after the request is made
            // This is because we can close the bottom sheet since we have optimistic updates anyway
            onDelete()
            return deleteDoc('Raven Message', messageID).then(() => {
                toast.success('Đã thu hồi tin nhắn', {
                    duration: 500,
                })
            }).then(() => {
                return removeMessageFromCache(data)
            })
        }, {
            optimisticData: removeMessageFromCache,
            rollbackOnError: true,
            revalidate: false
        }).catch(() => {
            toast.error("Thu hồi tin nhắn thất bại.")
        })
    }
    return { deleteMessage, loading }
}
