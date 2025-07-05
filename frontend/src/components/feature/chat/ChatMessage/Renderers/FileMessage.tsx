import { useIsDesktop } from '@/hooks/useMediaQuery'
import { DateMonthAtHourMinuteAmPm } from '@/utils/dateConversions'
import { DIALOG_CONTENT_CLASS } from '@/utils/layout/dialog'
import { FileExtensionIcon } from '@/utils/layout/FileExtIcon'
import { UserFields } from '@/utils/users/UserListProvider'
import { Box, BoxProps, Button, Dialog, Flex, IconButton, Link, Text } from '@radix-ui/themes'
import { clsx } from 'clsx'
import { useAtomValue } from 'jotai'
import { memo, useEffect, useState } from 'react'
import { BiDownload, BiLink, BiShow } from 'react-icons/bi'
import { toast } from 'sonner'
import { FileMessage } from '../../../../../../../types/Messaging/Message'
import { getFileExtension, getFileName, isVideoFile } from '../../../../../utils/operations'
import { messageProcessingIdsAtom } from '../../ChatInput/useSendMessage'
import { RetryActionButtons } from '@/components/common/RetryActionButton'
import { RetryStatusIcon } from '@/components/common/RetryStatusIcon'

type FileMessageBlockProps = BoxProps & {
  message: FileMessage
  user?: UserFields
}

// export const FileMessageBlock = memo(({ message, user, ...props }: FileMessageBlockProps) => {
//   const fileURL = message.file?.split('?')[0]

//   const fileExtension = getFileExtension(fileURL)

//   const fileName = getFileName(fileURL)

//   const isVideo = isVideoFile(fileExtension)

//   const isPDF = fileExtension === 'pdf'

//   const copyLink = () => {
//     if (fileURL.startsWith('http') || fileURL.startsWith('https')) {
//       navigator.clipboard.writeText(fileURL)
//     } else {
//       navigator.clipboard.writeText(window.location.origin + fileURL)
//     }

//     toast.success('Link copied')
//   }

//   const isDesktop = useIsDesktop()

//   return (
//     <Box {...props}>
//       {isVideo ? (
//         <Flex gap='2' direction='column'>
//           <Link href={message.file} size='1' download title='Download' color='gray' target='_blank'>
//             {fileName}
//           </Link>
//           <video src={message.file} controls className='rounded-md shadow-md max-h-96 max-w-[620px]'></video>
//         </Flex>
//       ) : (
//         <Flex
//           align='center'
//           gap='4'
//           p='4'
//           className='border bg-gray-1 dark:bg-gray-3 rounded-md border-gray-4 dark:border-gray-6 w-fit'
//         >
//           <Flex align='center' gap='2'>
//             <FileExtensionIcon ext={fileExtension} />
//             <Text as='span' size='2' className='text-ellipsis overflow-hidden line-clamp-1'>
//               {fileName}
//             </Text>
//           </Flex>

//           <Flex align='center' gap='2'>
//             {isPDF && isDesktop && <PDFPreviewButton message={message} user={user} />}
//             <IconButton
//               size={{
//                 md: '1',
//                 sm: '2'
//               }}
//               title='Copy link'
//               color='gray'
//               onClick={copyLink}
//               variant='soft'
//             >
//               <BiLink className='text-lg sm:text-base' />
//             </IconButton>
//             <IconButton
//               size={{
//                 md: '1',
//                 sm: '2'
//               }}
//               asChild
//               title='Download'
//               color='gray'
//               variant='soft'
//             >
//               <Link className='no-underline' href={message.file} download>
//                 {isDesktop ? (
//                   <BiDownload className='text-lg sm:text-base' />
//                 ) : (
//                   <BiShow className='text-lg sm:text-base' />
//                 )}
//               </Link>
//             </IconButton>
//           </Flex>
//         </Flex>
//       )}
//     </Box>
//   )
// })

// const PDFPreviewButton = ({ message, user }: { message: FileMessage; user?: UserFields }) => {
//   const fileName = getFileName(message.file)

//   return (
//     <Box>
//       <Dialog.Root>
//         <Dialog.Trigger>
//           <IconButton
//             size={{
//               md: '1',
//               sm: '2'
//             }}
//             color='gray'
//             variant='soft'
//             title='Preview'
//           >
//             <BiShow className='text-lg sm:text-base' />
//           </IconButton>
//         </Dialog.Trigger>
//         <Dialog.Content className={clsx(DIALOG_CONTENT_CLASS, 'min-w-[64rem]')} size='4'>
//           <Dialog.Title size='3'>{fileName}</Dialog.Title>
//           <Dialog.Description color='gray' size='1'>
//             {user?.full_name ?? message.owner} on <DateMonthAtHourMinuteAmPm date={message.creation} />
//           </Dialog.Description>
//           <Box my='4'>
//             <embed src={message.file} type='application/pdf' width='100%' height='680px' />
//           </Box>
//           <Flex justify='end' gap='2' mt='3'>
//             <Button variant='soft' color='gray' asChild>
//               <Link className='no-underline' href={message.file} download>
//                 <BiDownload size='18' />
//                 Download
//               </Link>
//             </Button>
//             <Dialog.Close>
//               <Button color='gray' variant='soft'>
//                 Close
//               </Button>
//             </Dialog.Close>
//           </Flex>
//         </Dialog.Content>
//       </Dialog.Root>
//     </Box>
//   )
// }
export const isImageFile = (ext: string) => ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext.toLowerCase())

export const FileMessageBlock = memo(
  ({
    message,
    user,
    onRetry,
    onRemove,
    ...props
  }: FileMessageBlockProps & {
    onRetry?: (id: string) => void
    onRemove?: (id: string) => void
  }) => {
    const isPending = message.is_pending
    const isError = message.is_error

    const [objectURL, setObjectURL] = useState<string>('')

    const processingIds = useAtomValue(messageProcessingIdsAtom)
    const isProcessing = processingIds.includes(message.id)

    useEffect(() => {
      if (message?.file && typeof message.file !== 'string') {
        const file = message.file as Blob | File
        if (file instanceof File || file instanceof Blob) {
          const url = URL.createObjectURL(file)
          setObjectURL(url)
          return () => {
            URL.revokeObjectURL(url)
          }
        }
      }
    }, [message?.file])

    const fileURL = typeof message.file === 'string' ? message.file?.split('?')[0] : objectURL

    const fileName = message.fileMeta?.name ? message.fileMeta.name : fileURL ? getFileName(fileURL) : 'Unknown file'

    const fileExtension = message.fileMeta?.name
      ? getFileExtension(message.fileMeta.name)
      : fileURL
        ? getFileExtension(fileURL)
        : ''

    const isVideo = isVideoFile(fileExtension, message.fileMeta?.type)
    const isImage = isImageFile(fileExtension)
    const isPDF = fileExtension === 'pdf'

    const isDesktop = useIsDesktop()

    const copyLink = () => {
      if (!fileURL) return
      const fullURL =
        fileURL.startsWith('http') || fileURL.startsWith('blob:') ? fileURL : window.location.origin + fileURL
      navigator.clipboard.writeText(fullURL)
      toast.success('Link copied')
    }

    const showRetryButton = isError || (isPending && !!fileURL)

    const [blobURL, setBlobURL] = useState<string>('')

    useEffect(() => {
      const loadBlobURL = async () => {
        try {
          const response = await fetch(fileURL, { credentials: 'include' })
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          setBlobURL(url)

          return () => {
            URL.revokeObjectURL(url)
          }
        } catch (err) {
          console.error('Failed to load video blob', err)
        }
      }

      if (isVideo && fileURL && !fileURL.startsWith('blob:')) {
        loadBlobURL()
      }
    }, [fileURL, isVideo])

    const RetryOrPendingOverlay = () => {
      if (showRetryButton) {
        return (
          <Box
            className='absolute top-2 right-2 flex gap-1 items-center'
            style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: '2px 6px',
              borderRadius: '6px'
            }}
          >
            <Button
              disabled={isProcessing}
              size='1'
              variant='soft'
              color='gray'
              onClick={() => onRetry?.(message.name ?? message.id)}
            >
              Gửi lại
            </Button>
            <Button
              disabled={isProcessing}
              size='1'
              variant='soft'
              color='red'
              onClick={() => onRemove?.(message.name ?? message.id)}
            >
              Xoá
            </Button>
          </Box>
        )
      }

      if (isPending && !fileURL) {
        return (
          <Box
            className='absolute top-2 right-2 flex items-center'
            style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: '2px 6px',
              borderRadius: '6px'
            }}
          >
            <Text size='1' color='red'>
              File lớn, không gửi lại được
            </Text>
          </Box>
        )
      }

      if (isPending) {
        return (
          <Box
            className='absolute top-2 right-2 flex items-center'
            style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: '2px 6px',
              borderRadius: '6px'
            }}
          >
            <Text size='1' color='gray'>
              Đang gửi...
            </Text>
          </Box>
        )
      }

      return null
    }

    const renderVideoBlock = () => (
      <Flex gap='2' direction='column'>
        <Link href={fileURL} size='1' download title='Download' color='gray' target='_blank'>
          {fileName}
        </Link>
        {fileURL || blobURL ? (
          <Box className='relative w-fit'>
            <video src={blobURL || fileURL} controls className='rounded-md shadow-md max-h-96 max-w-[620px]' />
            <RetryOrPendingOverlay />
          </Box>
        ) : (
          <Text size='1' color='red'>
            Không thể hiển thị video
          </Text>
        )}
      </Flex>
    )

    const renderImageBlock = () => (
      <Flex gap='2' direction='column'>
        <Link href={fileURL} size='1' download title='Download' color='gray' target='_blank'>
          {fileName}
        </Link>
        {fileURL ? (
          <Box className='relative w-fit'>
            <img src={fileURL} alt={fileName} className='rounded-md shadow-md max-w-full max-h-96 object-contain' />
            <RetryOrPendingOverlay />
          </Box>
        ) : (
          <Text size='1' color='red'>
            Không thể hiển thị ảnh
          </Text>
        )}
      </Flex>
    )

    const renderFileBlock = () => {
      const isPending = message.is_pending
      const isError = message.is_error
      const showRetryButton = isError || isPending

      // @ts-ignore
      const CHAT_STYLE = window.frappe?.boot?.chat_style ?? 'Simple'

      return (
        <Box className='relative flex items-center gap-2'>
          {showRetryButton && <RetryStatusIcon chatStyle={CHAT_STYLE} />}

          <Flex
            className={`relative ${CHAT_STYLE === 'Left-Right' ? 'order-2' : 'order-1'}`}
            direction='column'
            gap='1'
          >
            <Flex
              align='center'
              gap='4'
              p='4'
              className='border bg-gray-1 dark:bg-gray-3 rounded-md border-gray-4 dark:border-gray-6 w-fit'
            >
              <Flex align='center' gap='2'>
                <FileExtensionIcon ext={fileExtension} />
                <Text as='span' size='2' className='text-ellipsis overflow-hidden line-clamp-1'>
                  {fileName}
                </Text>
              </Flex>

              <Flex align='center' gap='2'>
                {isPDF && isDesktop && fileURL && (
                  <PDFPreviewButton fileURL={fileURL} fileName={fileName} message={message} user={user} />
                )}
                {fileURL && (
                  <>
                    <IconButton
                      size={{ md: '1', sm: '2' }}
                      title='Copy link'
                      color='gray'
                      onClick={copyLink}
                      variant='soft'
                    >
                      <BiLink className='text-lg sm:text-base' />
                    </IconButton>
                    <IconButton size={{ md: '1', sm: '2' }} asChild title='Download' color='gray' variant='soft'>
                      <Link className='no-underline' href={fileURL} download>
                        {isDesktop ? (
                          <BiDownload className='text-lg sm:text-base' />
                        ) : (
                          <BiShow className='text-lg sm:text-base' />
                        )}
                      </Link>
                    </IconButton>
                  </>
                )}
              </Flex>
            </Flex>

            {showRetryButton && (
              <RetryActionButtons
                onRetry={() => {
                  onRetry?.(message.name ?? message.id)
                }}
                onRemove={() => {
                  onRemove?.(message.name ?? message.id)
                }}
              />
            )}

            {isPending && !showRetryButton && (
              <Flex
                align='center'
                justify='end'
                className='mt-1 z-[999]'
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  width: 'fit-content'
                }}
              >
                <Text size='1' color='gray'>
                  Đang gửi...
                </Text>
              </Flex>
            )}
          </Flex>
        </Box>
      )
    }

    // --- MAIN RENDER ---
    return <Box {...props}>{isVideo ? renderVideoBlock() : isImage ? renderImageBlock() : renderFileBlock()}</Box>
  }
)

const PDFPreviewButton = ({
  fileURL,
  fileName,
  message,
  user
}: {
  fileURL: string
  fileName: string
  message: FileMessage
  user?: UserFields
}) => {
  return (
    <Box>
      <Dialog.Root>
        <Dialog.Trigger>
          <IconButton
            size={{
              md: '1',
              sm: '2'
            }}
            color='gray'
            variant='soft'
            title='Preview'
          >
            <BiShow className='text-lg sm:text-base' />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content className={clsx(DIALOG_CONTENT_CLASS, 'min-w-[64rem]')} size='4'>
          <Dialog.Title size='3'>{fileName}</Dialog.Title>
          <Dialog.Description color='gray' size='1'>
            {user?.full_name ?? message.owner} on <DateMonthAtHourMinuteAmPm date={message.creation} />
          </Dialog.Description>
          <Box my='4'>
            <embed src={fileURL} type='application/pdf' width='100%' height='680px' />
          </Box>
          <Flex justify='end' gap='2' mt='3'>
            <Button variant='soft' color='gray' asChild>
              <Link className='no-underline' href={fileURL} download>
                <BiDownload size='18' />
                Download
              </Link>
            </Button>
            <Dialog.Close>
              <Button color='gray' variant='soft'>
                Close
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  )
}