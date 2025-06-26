import { StandardDate } from '@/utils/dateConversions'
import { formatBytes } from '@/utils/operations'
import { Tooltip } from '@radix-ui/themes'
import { BiDownload, BiFile, BiLinkExternal } from 'react-icons/bi'
import { useScrollToMessage } from '../useScrollToMessage'

export interface SearchFile {
  id: string
  file: string
  file_size: number
  message_type: string
  owner: string
  creation: string
  content: string
  channel_id?: string
  name?: string
  workspace?: string
}

interface FileResultProps {
  file: SearchFile
  onClose: () => void
}

export const FileResult = ({ file, onClose }: FileResultProps) => {
  const { handleScrollToMessage } = useScrollToMessage(onClose)

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleScrollToMessage(file.name || file.id, file.channel_id || '', file.workspace)
  }

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = file.file
    link.download = file.content
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className='group p-4 rounded-xl border border-gray-3 dark:border-gray-7 hover:border-gray-6 dark:hover:border-gray-6 hover:shadow-md dark:hover:bg-gray-2 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-1'>
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0'>
          <BiFile className='w-5 h-5 text-white' />
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between gap-2'>
            <h4 className='font-medium text-gray-900 dark:text-white text-sm truncate'>{file.content}</h4>
            <div className='flex items-center gap-2'>
              <Tooltip content='Tải xuống'>
                <div onClick={handleDownloadClick}>
                  <BiDownload className='w-4 h-4' />
                </div>
              </Tooltip>
              <Tooltip content='Xem tin nhắn gốc'>
                <div onClick={handleIconClick}>
                  <BiLinkExternal className='w-4 h-4' />
                </div>
              </Tooltip>
            </div>
          </div>
          <div className='flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400'>
            <span className='bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full'>{file.message_type}</span>
            <span>{formatBytes(file.file_size)}</span>
            <span>•</span>
            <span className='truncate max-w-[120px] sm:max-w-none'>{file.owner}</span>
            <span>•</span>
            <StandardDate date={file.creation} />
          </div>
        </div>
      </div>
    </div>
  )
}
