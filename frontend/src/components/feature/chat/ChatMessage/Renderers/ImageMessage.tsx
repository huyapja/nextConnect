import { useIsMobile } from '@/hooks/useMediaQuery'
import { DateMonthAtHourMinuteAmPm } from '@/utils/dateConversions'
import { DIALOG_CONTENT_CLASS } from '@/utils/layout/dialog'
import { getFileName } from '@/utils/operations'
import { UserFields } from '@/utils/users/UserListProvider'
import { Box, Button, Dialog, Flex, IconButton, Link } from '@radix-ui/themes'
import { clsx } from 'clsx'
import { Suspense, lazy, memo, useMemo, useRef, useState } from 'react'
import { Blurhash } from 'react-blurhash'
import { BiChevronDown, BiChevronRight, BiDownload, BiX } from 'react-icons/bi'
import { ImageMessage } from '../../../../../../../types/Messaging/Message'
import { RetryActionButtons } from '@/components/common/RetryActionButton'
import { RetryStatusIcon } from '@/components/common/RetryStatusIcon'

const ImageViewer = lazy(() => import('@/components/common/ImageViewer'))

interface ImageMessageProps {
  message: ImageMessage
  user?: UserFields
  isScrolling?: boolean
  onRetry?: (id: string) => void
  onRemove?: (id: string) => void
}

// export const ImageMessageBlock = memo(({ message, isScrolling = false, user }: ImageMessageProps) => {
//   const [isOpen, setIsOpen] = useState(false)
//   // Show skeleton loader when image is loading

//   const isMobile = useIsMobile()

//   const fileName = getFileName(message.file)

//   const [isVisible, setIsVisible] = useState<boolean>(true)

//   const { height, width } = useMemo(() => {
//     if (!isVisible) {
//       return { height: '0', width: '0' }
//     }

//     let height = '200'
//     let width = '300'

//     if (message.thumbnail_height) {
//       height = isMobile ? String(message.thumbnail_height / 2) : String(message.thumbnail_height)
//     }

//     if (message.thumbnail_width) {
//       width = isMobile ? String(message.thumbnail_width / 2) : String(message.thumbnail_width)
//     }

//     return { height, width }
//   }, [message.thumbnail_height, message.thumbnail_width, isMobile, isVisible])

//   const contentRef = useRef<HTMLDivElement | null>(null)

//   const showImage = () => {
//     setIsVisible(true)
//     setTimeout(() => {
//       if (contentRef.current) {
//         contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
//       }
//     }, 200)
//   }

//   const [isImageLoaded, setIsImageLoaded] = useState(false)
//   const onLoad = () => {
//     setIsImageLoaded(true)
//   }

//   return (
//     <Flex direction='column' gap='1'>
//       <Flex className='py-1 items-center'>
//         <IconButton
//           size='1'
//           variant='ghost'
//           color='gray'
//           radius='large'
//           className='pl-0 pr-[6px] font-bold hover:bg-transparent text-accent-a11 hover:text-gray-12'
//           aria-label={`Click to ${isVisible ? 'hide' : 'show'} image`}
//           title={`${isVisible ? 'Hide' : 'Show'} image`}
//           onClick={() => (isVisible ? setIsVisible(false) : showImage())}
//         >
//           {isVisible ? (
//             <BiChevronDown size='20' className='pt-[1px]' />
//           ) : (
//             <BiChevronRight size='20' className='pt-[1px]' />
//           )}
//         </IconButton>
//         <Link href={message.file} size='1' color='gray' target='_blank'>
//           {fileName}
//         </Link>
//       </Flex>
//       <Box
//         ref={contentRef}
//         className={`relative rounded-md cursor-pointer transition-all duration-300 ease-ease-out-circ overflow-hidden`}
//         role='button'
//         onClick={() => setIsOpen(!isScrolling && true)}
//         style={{
//           height: height + 'px',
//           width: width + 'px'
//         }}
//       >
//         {/* Absolute positioned skeleton loader */}
//         <Box
//           className=' absolute top-0 z-0 left-0'
//           style={{
//             height: height + 'px',
//             width: width + 'px'
//           }}
//         >
//           {message.blurhash && message.blurhash?.length === 28 && !isImageLoaded ? (
//             <Blurhash hash={message.blurhash} width={width + 'px'} height={height + 'px'} />
//           ) : (
//             <Box
//               style={{
//                 height: height + 'px',
//                 width: width + 'px'
//               }}
//               className='bg-gray-3 z-0 dark:bg-gray-5 rounded-md'
//             ></Box>
//           )}
//         </Box>
//         {/* We are not hiding the image when scrolling because we already know the height and width of the image
//                 Hence no layout shift */}
//         <img
//           src={message.file}
//           loading='lazy'
//           className='z-50 absolute top-0 left-0 rounded-md shadow-md object-cover'
//           height={height}
//           style={{
//             maxHeight: height + 'px',
//             maxWidth: width + 'px',
//             minHeight: height + 'px',
//             minWidth: width + 'px'
//           }}
//           onLoad={onLoad}
//           width={width}
//           alt={`Image file sent by ${message.owner} at ${message.creation}`}
//           onContextMenu={(e) => {
//             e.stopPropagation()
//           }}
//         />
//       </Box>
//       {!isScrolling && (
//         <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
//           <Dialog.Content
//             className={clsx(
//               DIALOG_CONTENT_CLASS,
//               'sm:max-w-[88vw]',
//               isMobile && 'fixed inset-0 w-full h-full max-w-none p-0 rounded-none bg-black overflow-hidden'
//             )}
//           >
//             {isMobile && (
//               <IconButton
//                 size='3'
//                 variant='ghost'
//                 color='gray'
//                 className='fixed top-4 right-4 z-10 text-white'
//                 onClick={() => setIsOpen(false)}
//               >
//                 <BiX size='24' />
//               </IconButton>
//             )}

//             <Dialog.Title size='3' className='h-0 invisible sm:h-auto sm:visible'>
//               {fileName}
//             </Dialog.Title>
//             <Dialog.Description color='gray' size='1' className='h-0 invisible sm:h-auto sm:visible'>
//               {user?.full_name ?? message.owner} on <DateMonthAtHourMinuteAmPm date={message.creation} />
//             </Dialog.Description>
//             <Box
//               className={clsx(
//                 'w-full mx-auto items-center flex justify-center',
//                 isMobile ? 'h-[100dvh] absolute inset-0' : 'my-4'
//               )}
//             >
//               <Suspense
//                 fallback={
//                   <img
//                     src={message.file}
//                     loading='lazy'
//                     width='100%'
//                     className={clsx(
//                       'object-contain',
//                       isMobile ? 'h-[100dvh] w-full' : 'rounded-md shadow-md max-h-[90vh] sm:max-h-[600px]'
//                     )}
//                     alt={`Image file sent by ${message.owner} at ${message.creation}`}
//                   />
//                 }
//               >
//                 <ImageViewer>
//                   <img
//                     src={message.file}
//                     loading='lazy'
//                     width='100%'
//                     className={clsx(
//                       'object-contain',
//                       isMobile ? 'h-[100dvh] w-full' : 'rounded-md shadow-md max-h-[90vh] sm:max-h-[600px]'
//                     )}
//                     alt={`Image file sent by ${message.owner} at ${message.creation}`}
//                   />
//                 </ImageViewer>
//               </Suspense>
//             </Box>
//             {!isMobile && (
//               <Flex justify='end' gap='2' mt='3'>
//                 <Button variant='soft' color='gray' asChild>
//                   <Link className='no-underline' href={message.file} download>
//                     <BiDownload />
//                     Download
//                   </Link>
//                 </Button>
//                 <Dialog.Close>
//                   <Button color='gray' variant='soft'>
//                     Close
//                   </Button>
//                 </Dialog.Close>
//               </Flex>
//             )}
//           </Dialog.Content>
//         </Dialog.Root>
//       )}
//     </Flex>
//   )
// })

export const ImageMessageBlock = memo(
  ({ message, isScrolling = false, user, onRetry, onRemove }: ImageMessageProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const isMobile = useIsMobile()

    const isPending = message.is_pending
    const isError = message.is_error
    const showRetryButton = isError || (isPending && !!message.file)

    // @ts-ignore
    const CHAT_STYLE = window.frappe?.boot?.chat_style ?? 'Simple'

    const fileName = useMemo(() => {
      const file = message.file as File | string | undefined
      if (typeof file === 'string') return getFileName(file)
      if (message.fileMeta?.name) return message.fileMeta.name
      if (file instanceof File) return file.name
      return 'Unknown file'
    }, [message.file, message.fileMeta?.name])

    const imageSrc = useMemo(() => {
      const file = message.file as File | Blob | string | undefined
      if (typeof file === 'string') return file
      if (file instanceof File || file instanceof Blob) return URL.createObjectURL(file)
      return ''
    }, [message.file])

    const [isVisible, setIsVisible] = useState<boolean>(true)
    const [isImageLoaded, setIsImageLoaded] = useState(false)
    const onLoad = () => setIsImageLoaded(true)

    const { height, width } = useMemo(() => {
      if (!isVisible) return { height: '0', width: '0' }
      let height = '200',
        width = '300'
      if (message.thumbnail_height)
        height = isMobile ? String(message.thumbnail_height / 2) : String(message.thumbnail_height)
      if (message.thumbnail_width)
        width = isMobile ? String(message.thumbnail_width / 2) : String(message.thumbnail_width)
      return { height, width }
    }, [message.thumbnail_height, message.thumbnail_width, isMobile, isVisible])

    const contentRef = useRef<HTMLDivElement | null>(null)
    const showImage = () => {
      setIsVisible(true)
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
    }

    return (
      <Box className='relative flex items-center gap-2'>
        {showRetryButton && <RetryStatusIcon chatStyle={CHAT_STYLE} />}

        <Flex className={`relative ${CHAT_STYLE === 'Left-Right' ? 'order-2' : 'order-1'}`} direction='column' gap='1'>
          <Flex className='py-1 items-center'>
            <IconButton
              size='1'
              variant='ghost'
              color='gray'
              radius='large'
              className='pl-0 pr-[6px] font-bold hover:bg-transparent text-accent-a11 hover:text-gray-12'
              aria-label={`Click to ${isVisible ? 'hide' : 'show'} image`}
              title={`${isVisible ? 'Hide' : 'Show'} image`}
              onClick={() => (isVisible ? setIsVisible(false) : showImage())}
            >
              {isVisible ? <BiChevronDown size='20' /> : <BiChevronRight size='20' />}
            </IconButton>

            <Link href={imageSrc} size='1' color='gray' target='_blank'>
              {fileName}
            </Link>
          </Flex>

          {isVisible && (
            <Box
              ref={contentRef}
              className='relative rounded-md cursor-pointer transition-all duration-300 ease-ease-out-circ overflow-hidden'
              role='button'
              onClick={() => setIsOpen(!isScrolling && true)}
              style={{ height: height + 'px', width: width + 'px' }}
            >
              <Box className='absolute top-0 z-0 left-0' style={{ height: height + 'px', width: width + 'px' }}>
                {message.blurhash && message.blurhash.length === 28 && !isImageLoaded ? (
                  <Blurhash hash={message.blurhash} width={width + 'px'} height={height + 'px'} />
                ) : (
                  <Box
                    style={{ height: height + 'px', width: width + 'px' }}
                    className='bg-gray-3 dark:bg-gray-5 rounded-md'
                  ></Box>
                )}
              </Box>

              <img
                src={imageSrc}
                loading='lazy'
                onLoad={onLoad}
                className='z-50 absolute top-0 left-0 rounded-md shadow-md object-cover'
                height={height}
                width={width}
                alt={`Image file sent by ${message.owner}`}
                style={{
                  maxHeight: height + 'px',
                  maxWidth: width + 'px',
                  minHeight: height + 'px',
                  minWidth: width + 'px'
                }}
                onContextMenu={(e) => e.stopPropagation()}
              />
            </Box>
          )}

          {showRetryButton && (
            <RetryActionButtons
              onRetry={() => onRetry?.(message.name ?? message.id)}
              onRemove={() => onRemove?.(message.name ?? message.id)}
            />
          )}

          {!isScrolling && (
            <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
              <Dialog.Content
                className={clsx(
                  DIALOG_CONTENT_CLASS,
                  'sm:max-w-[88vw]',
                  isMobile && 'fixed inset-0 w-full h-full max-w-none p-0 rounded-none bg-black overflow-hidden'
                )}
              >
                {isMobile && (
                  <IconButton
                    size='3'
                    variant='ghost'
                    color='gray'
                    className='fixed top-4 right-4 z-10 text-white'
                    onClick={() => setIsOpen(false)}
                  >
                    <BiX size='24' />
                  </IconButton>
                )}

                <Dialog.Title size='3' className='h-0 invisible sm:h-auto sm:visible'>
                  {fileName}
                </Dialog.Title>
                <Dialog.Description color='gray' size='1' className='h-0 invisible sm:h-auto sm:visible'>
                  {user?.full_name ?? message.owner} on <DateMonthAtHourMinuteAmPm date={message.creation} />
                </Dialog.Description>

                <Box
                  className={clsx(
                    'w-full mx-auto items-center flex justify-center',
                    isMobile ? 'h-[100dvh] absolute inset-0' : 'my-4'
                  )}
                >
                  <Suspense
                    fallback={
                      <img
                        src={imageSrc}
                        loading='lazy'
                        width='100%'
                        className={clsx(
                          'object-contain',
                          isMobile ? 'h-[100dvh] w-full' : 'rounded-md shadow-md max-h-[90vh] sm:max-h-[600px]'
                        )}
                        alt={`Image file sent by ${message.owner}`}
                      />
                    }
                  >
                    <ImageViewer>
                      <img
                        src={imageSrc}
                        loading='lazy'
                        width='100%'
                        className={clsx(
                          'object-contain',
                          isMobile ? 'h-[100dvh] w-full' : 'rounded-md shadow-md max-h-[90vh] sm:max-h-[600px]'
                        )}
                        alt={`Image file sent by ${message.owner}`}
                      />
                    </ImageViewer>
                  </Suspense>
                </Box>

                {!isMobile && (
                  <Flex justify='end' gap='2' mt='3'>
                    <Button variant='soft' color='gray' asChild>
                      <Link className='no-underline' href={imageSrc} download>
                        <BiDownload />
                        Download
                      </Link>
                    </Button>
                    <Dialog.Close>
                      <Button color='gray' variant='soft'>
                        Close
                      </Button>
                    </Dialog.Close>
                  </Flex>
                )}
              </Dialog.Content>
            </Dialog.Root>
          )}
        </Flex>
      </Box>
    )
  }
)
