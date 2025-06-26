import { StandardDate } from '@/utils/dateConversions'
import { formatBytes } from '@/utils/operations'
import { BiFile } from 'react-icons/bi'
export interface SearchFile {
  id: string
  file: string
  file_size: number
  message_type: string
  owner: string
  creation: string
  content: string
}

interface FileResultProps {
  file: SearchFile
}

export const FileResult = ({ file }: FileResultProps) => {
  return (
    <div className='group p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-900'>
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0'>
          <BiFile className='w-5 h-5 text-white' />
        </div>
        <div className='flex-1 min-w-0'>
          <h4 className='font-medium text-gray-900 dark:text-white text-sm truncate mb-1'>{file.content}</h4>
          <div className='flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400'>
            <span className='bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full'>{file.message_type}</span>
            <span>{formatBytes(file.file_size)}</span>
            <span>•</span>
            <span>{file.owner}</span>
            <span>•</span>
            <StandardDate date={file.creation} />
          </div>
        </div>
      </div>
    </div>
  )
}
