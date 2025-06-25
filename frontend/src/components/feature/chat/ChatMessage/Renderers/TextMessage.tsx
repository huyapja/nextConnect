import { Box, Button, Flex, Text } from '@radix-ui/themes'
import { memo } from 'react'
import { TextMessage } from '../../../../../../../types/Messaging/Message'
import { UserFields } from '@/utils/users/UserListProvider'
import { TiptapRenderer } from './TiptapRenderer/TiptapRenderer'
import { useAtomValue } from 'jotai'
import { messageProcessingIdsAtom } from '../../ChatInput/useSendMessage'

export const TextMessageBlock = memo(
  ({
    message,
    user,
    onRetry,
    onRemove
  }: {
    message: TextMessage
    user?: UserFields
    onRetry?: (id: string) => void
    onRemove?: (id: string) => void
  }) => {
    const isPending = message.is_pending
    const isError = message.is_error

    const showRetryButton = isError || isPending
    const processingIds = useAtomValue(messageProcessingIdsAtom)
    const isProcessing = processingIds.includes(message.id)

    return (
      <Box className='relative'>
        <Flex className='relative' direction='column' gap='1'>
          <TiptapRenderer
            message={{
              ...message,
              text: message.text || message.content || ''
            }}
            user={user}
            currentUser={user?.name}
            showLinkPreview={!message.hide_link_preview}
          />

          {showRetryButton && (
            <Flex justify='end'>
              <Flex
                align='center'
                className='mt-1 z-[999]'
                style={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  width: 'fit-content'
                }}
              >
                <Button  disabled={isProcessing} size='1' variant='soft' color='gray' onClick={() => onRetry?.(message.name ?? message.id)}>
                  Gửi lại
                </Button>
                <Button  disabled={isProcessing} size='1' variant='soft' color='red' onClick={() => onRemove?.(message.name ?? message.id)}>
                  Xoá
                </Button>
              </Flex>
            </Flex>
          )}

          {isPending && !showRetryButton && (
            <Flex
              align='center'
              justify='end'
              className='mt-1 z-[999]'
              style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: '2px 6px',
                borderRadius: '6px',
                width: 'fit-content'
              }}
            >
              <Text size='1' color='gray'>
                Đang gửi...
              </Text>
            </Flex>
          )}
        </Flex>
      </Box>
    )
  }
)
