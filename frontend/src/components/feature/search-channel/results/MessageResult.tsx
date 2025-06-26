interface MessageResultProps {
  message: SearchMessage
}

export interface SearchMessage {
  id: number
  sender: string
  content: string
  time: string
  avatar: string
  channel: string
}

export const MessageResult = ({ message }: MessageResultProps) => {
  return (
    <div className='group p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-900'>
      <div className='flex items-start gap-3'>
        <div className='w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0'>
          {message.avatar}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <h4 className='font-medium text-gray-900 dark:text-white text-sm'>{message.sender}</h4>
            <span className='text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full'>
              {message.channel}
            </span>
            <span className='text-xs text-gray-400 dark:text-gray-500 ml-auto'>{message.time}</span>
          </div>
          <p className='text-sm text-gray-700 dark:text-gray-300 line-clamp-2'>{message.content}</p>
        </div>
      </div>
    </div>
  )
}
