import { StandardDate } from '@/utils/dateConversions'
import { formatBytes } from '@/utils/operations'
import { HoverCard, Inset, Text } from '@radix-ui/themes'
import clsx from 'clsx'
import { useCallback } from 'react'
import { BsDownload, BsPlayFill } from 'react-icons/bs'

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
  onMediaClick?: (media: SearchMedia) => void
  onDownload?: (media: SearchMedia) => void
}

const ImagePreview = ({ file, name, messageType }: { file: string; name: string; messageType: string }) => {
  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <div className='relative w-full h-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800'>
          <img src={file} alt={name} className='object-cover w-full h-full' loading='lazy' />
          {messageType === 'Video' && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/20'>
              <BsPlayFill className='w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-lg' />
            </div>
          )}
        </div>
      </HoverCard.Trigger>
      <HoverCard.Content size='3' className='hidden sm:block'>
        <Inset side='all' mb='0'>
          <div className='relative'>
            <img src={file} alt={name} className='object-contain max-w-[400px] max-h-[300px] rounded' loading='lazy' />
            <div className='absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 rounded-b'>
              <Text size='1' className='truncate'>
                {name}
              </Text>
            </div>
          </div>
        </Inset>
      </HoverCard.Content>
    </HoverCard.Root>
  )
}

const truncateFileName = (name: string, maxLength: number = 30): string => {
  if (!name || name.length <= maxLength) return name || 'Untitled'

  const extension = name.split('.').pop()?.toUpperCase() || ''
  const nameWithoutExt = name.substring(0, name.lastIndexOf('.')) || name
  const maxNameLength = maxLength - extension.length - 4

  if (maxNameLength <= 0) return `...${extension}`

  return `${nameWithoutExt.substring(0, maxNameLength)}...${extension}`
}

export const MediaResult = ({ media, onMediaClick, onDownload }: MediaResultProps) => {
  const handleContainerClick = useCallback(() => {
    if (onMediaClick) {
      onMediaClick(media)
    } else {
      window.open(media.file, '_blank', 'noopener,noreferrer')
    }
  }, [media, onMediaClick])

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()

      if (onDownload) {
        onDownload(media)
      } else {
        const link = document.createElement('a')
        link.href = media.file
        link.download = media.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    },
    [media, onDownload]
  )

  const truncatedName = truncateFileName(media.content || media.name)

  return (
    <div
      className='group p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-900'
      onClick={handleContainerClick}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleContainerClick()
        }
      }}
    >
      <div className='flex gap-3 sm:gap-4'>
        {/* Thumbnail - responsive sizing */}
        <div className='w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0'>
          <ImagePreview file={media.file} name={media.name} messageType={media.message_type} />
        </div>

        {/* Content */}
        <div className='flex-1 min-w-0 space-y-1.5 sm:space-y-2'>
          {/* File name and download button */}
          <div className='flex items-start justify-between gap-2'>
            <Text
              className='font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base leading-tight break-words'
              title={media.name}
            >
              {truncatedName}
            </Text>

            <button
              className='opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity duration-200 p-1.5 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0'
              onClick={handleDownload}
              title='Download'
              aria-label={`Download ${media.name}`}
            >
              <BsDownload className='w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400' />
            </button>
          </div>

          {/* Meta information */}
          <div className='flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500 dark:text-gray-400'>
            <span
              className={clsx(
                'px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium',
                media.message_type === 'Image'
                  ? 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30'
                  : 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30'
              )}
            >
              {media.message_type}
            </span>

            <span className='hidden sm:inline'>•</span>
            <span>{formatBytes(media.file_size)}</span>

            {media.owner && (
              <>
                <span className='hidden sm:inline'>•</span>
                <span className='font-medium truncate max-w-20 sm:max-w-none'>{media.owner}</span>
              </>
            )}

            <span className='hidden sm:inline'>•</span>
            <StandardDate date={media.creation} />
          </div>
        </div>
      </div>
    </div>
  )
}
