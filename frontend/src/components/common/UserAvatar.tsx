/* eslint-disable @typescript-eslint/no-unused-vars */
import { Avatar, Dialog, IconButton, Theme } from '@radix-ui/themes'
import { AvatarProps } from '@radix-ui/themes/dist/cjs/components/avatar'
import { BoxProps } from '@radix-ui/themes/dist/cjs/components/box'
import { clsx } from 'clsx'
import { generateAvatarColor } from '../feature/selectDropdowns/GenerateAvatarColor'
import { RiRobot2Fill } from 'react-icons/ri'
import { Suspense, useMemo, useState } from 'react'
import { AvailabilityStatus } from '../feature/userSettings/AvailabilityStatus/SetUserAvailabilityMenu'
import { BiX } from 'react-icons/bi'
import ImageViewer from './ImageViewer'

interface UserAvatarProps extends Partial<AvatarProps> {
  alt?: string
  isActive?: boolean
  availabilityStatus?: AvailabilityStatus
  isBot?: boolean
  canUserView?: boolean
  skeletonSize?: BoxProps['width'] | BoxProps['height']
}

export const getInitials = (name?: string) => {
  if (!name) return ''
  const [firstName, lastName] = name.split(' ')
  return firstName[0] + (lastName?.[0] ?? '')
}

const getIconSize = (size: AvatarProps['size']) => {
  switch (size) {
    case '1':
      return '14px'
    case '2':
      return '16px'
    case '3':
      return '18px'
    case '4':
      return '20px'
    case '5':
      return '22px'
    case '6':
      return '24px'
    case '7':
      return '26px'
    case '8':
      return '28px'
    case '9':
      return '30px'
    default:
      return '16px'
  }
}

export const UserAvatar = ({
  src,
  alt,
  size = '1',
  radius = 'medium',
  isActive,
  availabilityStatus,
  skeletonSize = '5',
  fallback,
  isBot,
  canUserView = false,
  className,
  ...props
}: UserAvatarProps) => {
  const color = useMemo(() => generateAvatarColor(alt), [alt])
  const [open, setOpen] = useState(false)

  const avatar = (
    <Avatar
      src={src}
      alt={alt}
      loading='lazy'
      fallback={fallback ?? getInitials(alt)}
      size={size}
      radius={radius}
      className={clsx(className, canUserView && src && 'cursor-pointer')}
      onClick={canUserView && src ? () => setOpen(true) : undefined}
      {...props}
    />
  )

  return (
    <Theme accentColor={color}>
      <span className='relative inline-block'>
        {avatar}

        {availabilityStatus === 'Away' && (
          <span
            className={clsx(
              'absolute block translate-x-1/2 translate-y-1/2 transform rounded-full',
              radius === 'full' ? 'bottom-1 right-1' : 'bottom-0.5 right-0.5'
            )}
          >
            <span className='block h-2 w-2 rounded-full border border-slate-2 bg-[#FFAA33] shadow-md' />
          </span>
        )}

        {availabilityStatus === 'Do not disturb' && (
          <span
            className={clsx(
              'absolute block translate-x-1/2 translate-y-1/2 transform rounded-full',
              radius === 'full' ? 'bottom-1 right-1' : 'bottom-0.5 right-0.5'
            )}
          >
            <span className='block h-2 w-2 rounded-full border border-slate-2 bg-[#D22B2B] shadow-md' />
          </span>
        )}

        {availabilityStatus !== 'Away' && availabilityStatus !== 'Do not disturb' && isActive && (
          <span
            className={clsx(
              'absolute block translate-x-1/2 translate-y-1/2 transform rounded-full',
              radius === 'full' ? 'bottom-1 right-1' : 'bottom-0.5 right-0.5'
            )}
          >
            <span className='block h-2 w-2 rounded-full border border-slate-2 bg-green-600 shadow-md' />
          </span>
        )}

        {isBot && (
          <span
            className={clsx(
              'absolute block translate-x-1/2 translate-y-1/2 transform rounded-full',
              radius === 'full' ? 'bottom-1 right-1' : 'bottom-0.5 right-0.5'
            )}
          >
            <RiRobot2Fill className='text-accent-11 dark:text-accent-11' size={getIconSize(size)} />
          </span>
        )}
      </span>

      {/* Image viewer chỉ bật khi có ảnh và canUserView */}
      {canUserView && src && (
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Content
            className={clsx(
              'p-0 rounded-md overflow-auto bg-white dark:backdrop-blur-[20px] dark:bg-[#151518CC]',
              'dark:border dark:border-[#ffffff1a] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_3px_16px_rgba(0,0,0,0.6)]',
              'w-full max-w-[100vw] sm:max-w-[85vw] sm:max-h-[85vh]'
            )}
          >
            <IconButton
              size='3'
              variant='ghost'
              color='gray'
              className='fixed top-4 right-4 z-10 text-gray-11'
              onClick={() => setOpen(false)}
            >
              <BiX size='24' />
            </IconButton>

            <div className='w-full flex flex-col items-center justify-center px-4 py-6'>
              <Suspense
                fallback={
                  <img src={src} alt='Avatar Preview' className='object-contain w-full max-h-[80vh] rounded-md' />
                }
              >
                <ImageViewer>
                  <img src={src} alt='Avatar Preview' className='object-contain w-full max-h-[80vh] rounded-md' />
                </ImageViewer>
              </Suspense>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </Theme>
  )
}
