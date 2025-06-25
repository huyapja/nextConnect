// RetryActionButtons.tsx

import { Button, Flex } from '@radix-ui/themes'

export function RetryActionButtons({ onRetry, onRemove }: { onRetry: () => void; onRemove: () => void }) {
  return (
    <Flex justify='end'>
      <Flex align='center' className='mt-1 rounded-[6px] w-fit'>
        <Button
          aria-label='Gửi lại tin nhắn'
          title='Gửi lại tin nhắn'
          size='1'
          variant='soft'
          color='gray'
          className='cursor-pointer text-[#5b5bd6] hover:text-variant-200 transition-colors'
          onClick={onRetry}
        >
          Gửi lại
        </Button>

        <Button
          size='1'
          variant='soft'
          color='red'
          className='cursor-pointer text-rose-400 hover:text-rose-500 transition-colors'
          onClick={onRemove}
        >
          Xoá
        </Button>
      </Flex>
    </Flex>
  )
}
