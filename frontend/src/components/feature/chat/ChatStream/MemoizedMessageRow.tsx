import { memo, useMemo } from 'react'
import { MessageItemRenderer } from './MessageListRenderer'

export const MemoizedMessageRow = memo(
  ({
    message,
    highlightedMessage,
    showThreadButton,
    seenUsers,
    channel,
    callbacks
  }: {
    message: any
    index: number
    highlightedMessage: string | null
    showThreadButton: boolean
    seenUsers: any
    channel: any
    callbacks: any
  }) => {
    const isHighlighted = useMemo(() => highlightedMessage === message?.name, [highlightedMessage, message?.name])
    const isPending = !!message?.is_pending

    return (
      <MessageItemRenderer
        message={message}
        isHighlighted={isHighlighted}
        showThreadButton={showThreadButton}
        seenUsers={seenUsers}
        channel={channel}
        isPending={isPending}
        {...callbacks}
      />
    )
  }
)
MemoizedMessageRow.displayName = 'MemoizedMessageRow'
