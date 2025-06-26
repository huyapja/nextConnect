import { CustomFile } from '@/components/feature/file-upload/FileDrop'
import { getErrorMessage } from '@/components/layout/AlertBanner/ErrorBanner'
import { RavenMessage } from '@/types/RavenMessaging/RavenMessage'
import { FrappeConfig, FrappeContext } from 'frappe-react-sdk'
import { useContext, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Message } from '../../../../../../../types/Messaging/Message'
// import { useOnlineStatus } from '@/components/feature/network/useNetworkStatus'

export const fileExt = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG', 'gif', 'GIF']
export interface FileUploadProgress {
  progress: number
  isComplete: boolean
}
export default function useFileUploadV2(channelID: string) {
  const { file } = useContext(FrappeContext) as FrappeConfig

  const fileInputRef = useRef<any>(null)
  const filesStateRef = useRef<CustomFile[]>([])

  const [files, setFiles] = useState<CustomFile[]>([])
  const [compressImages, setCompressImages] = useState(true)
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, FileUploadProgress>>({})

  filesStateRef.current = files

  const createClientId = () => `${Date.now()}-${Math.random()}`

  const addFile = (file: File) => {
    const newFile: CustomFile = file as CustomFile
    newFile.fileID = file.name + Date.now()
    newFile.uploadProgress = 0
    setFiles((f) => [...f, newFile])
  }

  const removeFile = (id: string) => {
    const newFiles = files.filter((file) => file.fileID !== id)
    setFiles(newFiles)
    setFileUploadProgress((p) => {
      const newProgress = { ...p }
      delete newProgress[id]
      return newProgress
    })
  }

  const uploadOneFile = async (f: CustomFile, selectedMessage?: Message | null) => {
    const client_id = createClientId()
    const isVideo = f.type.startsWith('video/')

    try {
      const res = await file.uploadFile(
        f,
        {
          isPrivate: isVideo ? false : true, // Video để public, image/file giữ private
          doctype: 'Raven Message',
          otherData: {
            channelID: channelID,
            compressImages: isVideo ? false : compressImages,
            is_reply: selectedMessage ? 1 : 0,
            linked_message: selectedMessage ? selectedMessage.name : null,
            text: '',
            fileType: f.type
          },
          fieldname: 'file'
        },
        (bytesUploaded, totalBytes) => {
          const percentage = Math.round((bytesUploaded / (totalBytes ?? f.size)) * 100)

          setFileUploadProgress((p) => ({
            ...p,
            [f.fileID]: {
              progress: percentage,
              isComplete: false
            }
          }))
        },
        'raven.api.upload_file.upload_file_with_message'
      )

      setFiles((prev) => prev.filter((file) => file.fileID !== f.fileID))
      setFileUploadProgress((p) => ({
        ...p,
        [f.fileID]: {
          progress: 100,
          isComplete: true
        }
      }))

      return { client_id, message: res.data.message, file: f }
    } catch (e) {
      console.error('uploadFile error', e)

      toast.error('Hãy kiểm tra lại internet của bạn hoặc thử lại sau')

      return {
        client_id,
        message: null,
        file: f
      }
    }
  }

  const uploadFiles = async (
    selectedMessage?: Message | null
  ): Promise<{ client_id: string; message: RavenMessage | null; file: CustomFile }[]> => {
    const newFiles = [...filesStateRef.current]
    if (newFiles?.length === 0) return []

    const promises = newFiles.map((f) => uploadOneFile(f, selectedMessage))

    return Promise.all(promises).finally(() => {
      setFiles([])
    })
  }

  return {
    fileInputRef,
    files,
    setFiles,
    removeFile,
    addFile,
    compressImages,
    setCompressImages,
    uploadFiles,
    uploadOneFile,
    fileUploadProgress
  }
}
