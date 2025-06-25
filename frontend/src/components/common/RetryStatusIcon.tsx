// RetryStatusIcon.tsx

import { PiWarningCircleLight } from 'react-icons/pi'

export function RetryStatusIcon({ chatStyle = 'Left-Right', onClick }: { chatStyle?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center flex-none group cursor-pointer text-red-500 ${chatStyle === 'Left-Right' ? 'order-1' : 'order-2'}`}
    >
      <PiWarningCircleLight size={22} />
      <div className='absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-10 pointer-events-none z-[99]'>
        Tin nhắn chưa được gửi do mất kết nối
      </div>
    </div>
  )
}
