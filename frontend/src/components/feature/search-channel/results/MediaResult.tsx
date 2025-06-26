import clsx from 'clsx'
import { BiImage } from 'react-icons/bi'
import { BsPlayCircle } from 'react-icons/bs'
export interface SearchMedia {
  id: number
  name: string
  type: 'Image' | 'Video'
  size: string
  dimensions?: string
  duration?: string
  uploadDate: string
}

interface MediaResultProps {
  media: SearchMedia
}

export const MediaResult = ({ media }: MediaResultProps) => {
  return (
    <div className='group p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-900'>
      <div className='flex items-center gap-3'>
        <div
          className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            media.type === 'Video'
              ? 'bg-gradient-to-br from-red-400 to-red-600'
              : 'bg-gradient-to-br from-orange-400 to-orange-600'
          )}
        >
          {media.type === 'Video' ? (
            <BsPlayCircle className='w-5 h-5 text-white' />
          ) : (
            <BiImage className='w-5 h-5 text-white' />
          )}
        </div>
        <div className='flex-1 min-w-0'>
          <h4 className='font-medium text-gray-900 dark:text-white text-sm truncate mb-1'>{media.name}</h4>
          <div className='flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400'>
            <span className='bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full'>{media.type}</span>
            <span>{media.size}</span>
            {media.dimensions && <span>{media.dimensions}</span>}
            {media.duration && <span>{media.duration}</span>}
            <span>•</span>
            <span>{media.uploadDate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
