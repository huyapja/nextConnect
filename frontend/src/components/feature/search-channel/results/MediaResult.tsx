import { StandardDate } from '@/utils/dateConversions'
import { formatBytes } from '@/utils/operations'
import { HoverCard, Inset, Text } from '@radix-ui/themes'
import clsx from 'clsx'
import { useCallback } from 'react'
import { BsDownload } from 'react-icons/bs'

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

const mediaResultStyles = {
  container: `
    group
    p-4
    rounded-xl
    border
    border-gray-3
    dark:border-gray-7
    hover:border-gray-6
    dark:hover:border-gray-6
    hover:shadow-md
    dark:hover:bg-gray-2
    transition-all
    duration-200
    cursor-pointer
    bg-white
    dark:bg-gray-1
  `,
  thumbnail: `
    w-12
    h-12
    rounded-lg
    flex
    items-center
    justify-center
    flex-shrink-0
    overflow-hidden
    border
    border-gray-4
    dark:border-gray-6
  `,
  fileName: `
    font-medium
    text-gray-12
    dark:text-gray-12
    text-sm
    truncate
    max-w-[200px]
    sm:max-w-[300px]
  `,
  metaInfo: `
    text-xs
    text-gray-11
    dark:text-gray-11
    flex
    items-center
    gap-2
    flex-wrap
  `,
  badge: `
    bg-gray-4
    dark:bg-gray-6
    px-2
    py-0.5
    rounded-full
    text-xs
    font-medium
  `,
  downloadButton: `
    opacity-0
    group-hover:opacity-100
    transition-opacity
    duration-200
    p-1
    rounded
    hover:bg-gray-4
    dark:hover:bg-gray-6
  `
}

const ImagePreview = ({ file, name }: { file: string; name: string }) => {
  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <img src={file} alt={name} className='object-cover w-full h-full rounded' loading='lazy' />
      </HoverCard.Trigger>
      <HoverCard.Content size='3'>
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

const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toUpperCase() || ''
}

const truncateFileName = (name: string, maxLength: number = 25): string => {
  if (name.length <= maxLength) return name

  const extension = getFileExtension(name)
  const nameWithoutExt = name.substring(0, name.lastIndexOf('.'))
  const maxNameLength = maxLength - extension.length - 4 // 4 for "..." and "."

  return `${nameWithoutExt.substring(0, maxNameLength)}...${extension}`
}

export const MediaResult = ({ media, onMediaClick, onDownload }: MediaResultProps) => {
  const handleContainerClick = useCallback(() => {
    if (onMediaClick) {
      onMediaClick(media)
    } else {
      // Default: open media in new tab
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

  const truncatedName = truncateFileName(media.content as string)

  return (
    <div
      className={mediaResultStyles.container}
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
      <div className='flex items-start gap-4'>
        {/* Thumbnail */}
        <div className={mediaResultStyles.thumbnail}>
          <ImagePreview file={media.file} name={media.name} />
        </div>

        {/* Content */}
        <div className='flex-1 min-w-0 space-y-2'>
          {/* File name */}
          <div className='flex items-center justify-between'>
            <Text className={mediaResultStyles.fileName} title={media.name}>
              {truncatedName}
            </Text>

            {/* Download button */}
            <button
              className={mediaResultStyles.downloadButton}
              onClick={handleDownload}
              title='Download'
              aria-label={`Download ${media.name}`}
            >
              <BsDownload className='w-4 h-4' />
            </button>
          </div>

          {/* Meta information */}
          <div className={mediaResultStyles.metaInfo}>
            <span
              className={clsx(
                mediaResultStyles.badge,
                media.message_type === 'Image'
                  ? 'text-blue-11 bg-blue-3 dark:bg-blue-4'
                  : 'text-red-11 bg-red-3 dark:bg-red-4'
              )}
            >
              {media.message_type}
            </span>

            <span>{formatBytes(media.file_size)}</span>

            {media.owner && (
              <>
                <span>•</span>
                <span className='font-medium'>{media.owner}</span>
              </>
            )}

            <span>•</span>
            <StandardDate date={media.creation} />
          </div>
        </div>
      </div>
    </div>
  )
}
