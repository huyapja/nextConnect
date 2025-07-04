import { memo } from 'react'
import { FiArrowDown, FiMessageCircle } from 'react-icons/fi'

interface ScrollToBottomButtonsProps {
  hasNewMessages: boolean
  newMessageCount: number
  onGoToLatestMessages: () => void
  onScrollToBottom: () => void
  isAtBottom?: boolean
  hasMessageId?: boolean
}

const ScrollToBottomButtons = ({
  newMessageCount,
  onGoToLatestMessages,
  onScrollToBottom,
  isAtBottom,
  hasMessageId = false
}: ScrollToBottomButtonsProps) => {
  const shouldShowNewMessageButton = newMessageCount > 0

  const shouldShowScrollToBottom = !shouldShowNewMessageButton && !isAtBottom

  return (
    <>
      {/* Button cho tin nhắn mới - hiển thị khi có tin nhắn mới (ưu tiên cao nhất) */}
      {shouldShowNewMessageButton && (
        <div className='fixed bottom-40 z-50 right-4 sm:right-10'>
          <div
            className='
              relative flex items-center gap-3 px-4 py-3 rounded-full border shadow-md cursor-pointer group active:scale-95 transition-all
              bg-white border-gray-200 text-gray-800
              dark:bg-[#2a2f3a] dark:border-[#39424f] dark:text-white
            '
            onClick={onGoToLatestMessages}
          >
            <div className='w-6 h-6 flex items-center justify-center rounded-full bg-[#2a9df4] text-white flex-shrink-0'>
              <FiMessageCircle size={12} />
            </div>

            <span className='text-sm font-medium whitespace-nowrap'>
              {newMessageCount === 1 ? '1 tin nhắn mới' : `${newMessageCount} tin nhắn mới`}
            </span>

            <div className='w-6 h-6 flex items-center justify-center text-gray-500 group-hover:text-black dark:text-[#b0b8c4] dark:group-hover:text-white transition-colors'>
              <FiArrowDown size={14} />
            </div>

            {newMessageCount > 1 && (
              <div className='absolute -top-2 -right-2 bg-[#2a9df4] text-white text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-bold shadow'>
                {newMessageCount > 99 ? '99+' : newMessageCount}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Button scroll to bottom - hiển thị khi không có tin nhắn mới và không ở đáy */}
      {shouldShowScrollToBottom && (
        <div className='fixed bottom-40 z-50 right-4 sm:right-10'>
          <div
            className='
              w-12 h-12 flex items-center justify-center rounded-full border shadow-md cursor-pointer active:scale-95 group transition-all
              bg-white border-gray-200 text-gray-600
              dark:bg-[#2a2f3a] dark:border-[#39424f] dark:text-[#b0b8c4] dark:group-hover:text-white
            '
            onClick={hasMessageId ? onGoToLatestMessages : onScrollToBottom}
          >
            <FiArrowDown size={20} />
          </div>
        </div>
      )}
    </>
  )
}

export default memo(ScrollToBottomButtons)
