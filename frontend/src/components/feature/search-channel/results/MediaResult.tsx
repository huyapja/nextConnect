import { StandardDate } from '@/utils/dateConversions'
import { formatBytes } from '@/utils/operations'
import { HoverCard, Inset } from '@radix-ui/themes'
import clsx from 'clsx'
import { BsPlayCircle } from 'react-icons/bs'

export interface SearchMedia {
  id: number
  name: string
  message_type: 'Image' | 'Video'
  file: string
  file_size: number
  content?: string
  owner?: string
  creation: string
}

interface MediaResultProps {
  media: SearchMedia
}

const ImagePreview = ({ file }: { file: string }) => {
  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <img
          style={{ borderRadius: '4px' }}
          src={file}
          alt='media'
          className='object-cover w-8 h-8 sm:w-[25px] sm:h-[25px]'
        />
      </HoverCard.Trigger>
      <HoverCard.Content>
        <Inset side='all' mb='0' className='-mb-6'>
          <img src={file} alt='media-full' height={200} width={200} className='object-cover rounded' />
        </Inset>
      </HoverCard.Content>
    </HoverCard.Root>
  )
}

export const MediaResult = ({ media }: MediaResultProps) => {
  return (
    <div className='group p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-900'>
      <div className='flex items-center gap-3'>
        {/* Thumbnail hoặc icon */}
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0')}>
          {media.message_type === 'Image' ? (
            <ImagePreview file={media.file} />
          ) : (
            <div className='w-8 h-8 sm:w-[25px] sm:h-[25px] bg-gradient-to-br from-red-400 to-red-600 rounded flex items-center justify-center'>
              <BsPlayCircle className='w-5 h-5 text-white' />
            </div>
          )}
        </div>

        {/* Thông tin */}
        <div className='flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400'>
          <span className='bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full'>{media.message_type}</span>
          <span>{formatBytes(media.file_size)}</span>
          <span>•</span>
          <span>{media.owner}</span>
          <span>•</span>
          <StandardDate date={media.creation} />
        </div>
      </div>
    </div>
  )
}
