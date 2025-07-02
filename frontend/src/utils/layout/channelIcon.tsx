import { BiGlobe, BiHash, BiX } from 'react-icons/bi'
import { RavenChannel } from '../../../../types/RavenChannelManagement/RavenChannel'
import { IconBaseProps } from 'react-icons'
import { FaUsers } from 'react-icons/fa6'
import { Box, Button, Dialog, Flex, IconButton } from '@radix-ui/themes'

import { lazy, Suspense, useState } from 'react'
import clsx from 'clsx'
import { useSetAtom } from 'jotai'
import {
  groupImageUploadAtom,
  GroupImageUploadManager
} from '@/components/feature/channel-details/change-image-channel/ImageChannelUpload'
import { useParams } from 'react-router-dom'
import { CiCamera } from 'react-icons/ci'
import { useIsMobile } from '@/hooks/useMediaQuery'

const ImageViewer = lazy(() => import('@/components/common/ImageViewer'))

interface ChannelIconProps extends IconBaseProps {
  type: RavenChannel['type']
  groupImage?: string
  isInDetails?: boolean
  canUserView?: boolean
  allowSettingChange?: boolean
}

export const ChannelIcon = ({
  type,
  groupImage,
  isInDetails,
  allowSettingChange,
  canUserView = false,
  ...props
}: ChannelIconProps) => {
  const [open, setOpen] = useState(false)
  const size = isInDetails ? 32 : 26
  const setUploadState = useSetAtom(groupImageUploadAtom)
  const { channelID: groupID } = useParams()
  const isMobile = useIsMobile()

  const renderImage = (clickable = false) => (
    <img
      src={groupImage}
      alt='Channel'
      className={clsx('object-cover rounded-md shadow-sm', clickable && 'cursor-pointer')}
      style={{ width: size, height: size }}
      onClick={clickable ? () => setOpen(true) : undefined}
    />
  )

  if (type === 'Private') {
    if (groupImage) {
      return canUserView ? (
        <>
          {renderImage(true)}

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Content
              className={clsx(
                'p-0 rounded-md overflow-auto bg-white dark:backdrop-blur-[20px] dark:bg-[#151518CC] dark:border dark:border-[#ffffff1a] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_3px_16px_rgba(0,0,0,0.6)]',
                'w-full max-w-[100vw]',
                isMobile ? 'min-h-screen' : 'sm:max-w-[85vw] sm:max-h-[85vh]'
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

              <Box
                className={clsx(
                  'w-full flex flex-col items-center justify-center px-4 py-6',
                  isMobile ? 'min-h-screen' : 'my-4'
                )}
              >
                <Suspense
                  fallback={
                    <img
                      src={groupImage}
                      alt='Channel Preview'
                      className='object-contain w-full max-h-[80vh] rounded-md'
                    />
                  }
                >
                  <ImageViewer>
                    <img
                      src={groupImage}
                      alt='Channel Preview'
                      className='object-contain w-full max-h-[80vh] rounded-md'
                    />
                  </ImageViewer>
                </Suspense>

                {allowSettingChange && (
                  <div className='mt-4 flex justify-center'>
                    <Button
                      onClick={() => setUploadState({ open: true, groupID })}
                      variant='soft'
                      color='gray'
                      size='2'
                    >
                      <span className='inline-flex items-center gap-2 cursor-pointer'>
                        <CiCamera />
                        Cập nhật ảnh đại diện nhóm
                      </span>
                    </Button>
                    <GroupImageUploadManager setModalOpen={setOpen} />
                  </div>
                )}
              </Box>
            </Dialog.Content>
          </Dialog.Root>
        </>
      ) : (
        renderImage()
      )
    }

    // Không có groupImage
    return (
      <span
        className='border-2 border-teal-400 text-teal-600 rounded-full flex items-center justify-center'
        style={{ width: 24, height: 24 }}
      >
        <FaUsers className='w-[70%] h-[70%] text-teal-500' />
      </span>
    )
  }

  if (type === 'Open') return <BiGlobe {...props} />
  return <BiHash {...props} />
}
