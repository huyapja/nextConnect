/* eslint-disable no-unsafe-optional-chaining */
import { __ } from '@/utils/translations'
import { Flex, FlexProps, Text } from '@radix-ui/themes'
import clsx from 'clsx'
import { forwardRef, useImperativeHandle, useState } from 'react'
import { Accept, useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

export interface CustomFile extends File {
  fileID: string
  uploading?: boolean
  uploadProgress?: number
}

export type FileDropProps = FlexProps & {
  /** Array of files */
  files: CustomFile[]
  /** Function to set files in parent */
  onFileChange: (files: CustomFile[]) => void
  /** Maximum no. of files that can be selected */
  maxFiles?: number
  /** Takes input MIME type as 'key' & array of extensions as 'value'; empty array - all extensions supported */
  accept?: Accept
  /** Maximum file size in mb that can be selected */
  maxFileSize?: number
  children?: React.ReactNode
  /** This is used inside a style prop for the outer div */
  height?: string
  width?: string
  /** This is a Tailwind class that is applied to the area inside the dropzone */
  areaHeight?: string
}

/**
 * File uploader component that allows users to drag and drop files or select files from their computer.
 * It encompasses Box component, so all Box props can be used.
 */
export const FileDrop = forwardRef((props: FileDropProps, ref) => {
  const { files, onFileChange, maxFiles, accept, maxFileSize, children, height, width, areaHeight, ...compProps } =
    props

  const [onDragEnter, setOnDragEnter] = useState(false)

  const fileSizeValidator = (file: any) => {
    if (maxFileSize && file.size > maxFileSize * 1000000) {
      toast.error(__('File "{0}" có kích thước quá lớn! Giới hạn tối đa là {1}MB.', [file.name, maxFileSize]))
      return {
        code: 'size-too-large',
        message: __('Kích thước file vượt quá giới hạn cho phép.')
      }
    } else return null
  }

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop: (receivedFiles, fileRejections) => {
      onFileChange([
        ...files,
        ...receivedFiles?.map((file) =>
          Object.assign(file, {
            fileID: file.name + Date.now(),
            uploadProgress: 0
          })
        )
      ])

      if (maxFiles && maxFiles < fileRejections?.length) {
        toast.error(__('Chỉ được tải lên tối đa {0} file. Vui lòng thử lại.', [maxFiles]))
      }
    },
    maxFiles: maxFiles ? maxFiles : 0,
    accept: accept ? accept : undefined,
    validator: fileSizeValidator,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setOnDragEnter(true),
    onDragLeave: () => setOnDragEnter(false),
    onDropAccepted: () => setOnDragEnter(false),
    onDropRejected: () => setOnDragEnter(false)
  })

  useImperativeHandle(ref, () => ({
    openFileInput() {
      open()
    }
  }))

  return (
    <Flex
      direction='column'
      style={{
        height: height ?? 'calc(100vh - 65px)'
      }}
      width='100%'
      {...getRootProps()}
      {...compProps}
    >
      {children}

      {(maxFiles === undefined || files?.length < maxFiles) && (
        <Flex
          align='center'
          justify='center'
          className={clsx(
            'fixed top-14 border-2 border-dashed rounded-md border-gray-6 dark:bg-[#171923AA] bg-[#F7FAFCAA]',
            areaHeight ?? 'h-[calc(100vh-72px)]',
            width ?? 'w-[calc(100vw-var(--sidebar-width)-var(--space-8))]'
          )}
          style={{
            zIndex: 9999
          }}
          display={onDragEnter ? 'flex' : 'none'}
        >
          <Text as='span' size='2' color='gray'>
            {__('Thả file của bạn vào đây để tải lên.')}
          </Text>
          <input type='file' style={{ display: 'none' }} {...getInputProps()} />
        </Flex>
      )}
    </Flex>
  )
})
