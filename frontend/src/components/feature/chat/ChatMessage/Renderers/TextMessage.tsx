import { Box, Flex, Text } from '@radix-ui/themes'
import { memo } from 'react'
import { TextMessage } from '../../../../../../../types/Messaging/Message'
import { UserFields } from '@/utils/users/UserListProvider'
import { TiptapRenderer } from './TiptapRenderer/TiptapRenderer'
import { RetryStatusIcon } from '@/components/common/RetryStatusIcon'
import { RetryActionButtons } from '@/components/common/RetryActionButton'

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
    // @ts-ignore
    const CHAT_STYLE = window.frappe?.boot?.chat_style ?? 'Simple' // Lấy kiểu chat từ cấu hình

    return (
      <Box className='relative flex items-center gap-2'>
        {showRetryButton && <RetryStatusIcon chatStyle={CHAT_STYLE} />}

        <Flex className={`relative ${CHAT_STYLE === 'Left-Right' ? 'order-2' : 'order-1'}`} direction='column' gap='1'>
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
            <RetryActionButtons
              onRetry={() => {
                onRetry?.(message.name ?? message.id)
              }}
              onRemove={() => {
                onRemove?.(message.name ?? message.id)
              }}
            />
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
