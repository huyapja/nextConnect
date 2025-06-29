import { CustomFile } from '@/components/feature/file-upload/FileDrop'
import { getErrorMessage } from '@/components/layout/AlertBanner/ErrorBanner'
import { FrappeConfig, FrappeContext } from 'frappe-react-sdk'
import { useContext, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface ChatbotFileUploadResult {
  message: string
  file_url: string
}

export interface FileUploadProgress {
  progress: number
  isComplete: boolean
}

const MAX_FILES = 5

export default function useUploadChatbotFile(conversation_id: string, messageText: string) {
  const { file, call } = useContext(FrappeContext) as FrappeConfig
  const fileInputRef = useRef<any>(null)

  const [files, setFiles] = useState<CustomFile[]>([])
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, FileUploadProgress>>({})

  const filesStateRef = useRef<CustomFile[]>([])
  filesStateRef.current = files

  // Giới hạn tối đa 5 file
  const addFile = (file: File) => {
    if (files.length >= MAX_FILES) {
      toast.error(`Tối đa chỉ được tải lên ${MAX_FILES} file cùng lúc`)
      return false
    }
    
    const newFile: CustomFile = file as CustomFile
    if (newFile) {
      newFile.fileID = file.name + Date.now()
      newFile.uploadProgress = 0
      setFiles((f) => [...f, newFile])
      return true
    }
    return false
  }

  // Thêm nhiều file cùng lúc
  const addFiles = (fileList: File[]) => {
    const currentCount = files.length
    const availableSlots = MAX_FILES - currentCount
    
    if (fileList.length > availableSlots) {
      toast.error(`Chỉ có thể thêm ${availableSlots} file nữa (tối đa ${MAX_FILES} file)`)
      return false
    }
    
    const newFiles: CustomFile[] = fileList.map((file) => {
      const customFile = file as CustomFile
      customFile.fileID = file.name + Date.now()
      customFile.uploadProgress = 0
      return customFile
    })
    
    setFiles((f) => [...f, ...newFiles])
    return true
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

  const uploadFiles = async (): Promise<ChatbotFileUploadResult[]> => {
    const currentFiles = [...filesStateRef.current]
    if (currentFiles?.length === 0) return []

    try {
      // Upload tất cả file song song với batch_upload flag để không gọi AI reply từng cái
      const promises = currentFiles?.map(async (f: CustomFile) => {
        return file
          .uploadFile(
            f,
            {
              isPrivate: true,
              doctype: 'ChatMessage',
              fieldname: 'file',
              otherData: {
                conversation_id,
                message: f.name, // Chỉ dùng filename cho files
                batch_upload: 'true' // Luôn set batch_upload để không gọi AI reply từng file
              }
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
            'raven.api.upload_chatbot_file.upload_file_with_message'
          )
          .then((res: { data: ChatbotFileUploadResult }) => {
            setFiles((files) => files.filter((file) => file.fileID !== f.fileID))
            setFileUploadProgress((p) => ({
              ...p,
              [f.fileID]: {
                progress: 100,
                isComplete: true
              }
            }))
            return res.data
          })
          .catch((e) => {
            setFileUploadProgress((p) => {
              const newProgress = { ...p }
              delete newProgress[f.fileID]
              return newProgress
            })

            toast.error('Upload file thất bại: ' + f.name, {
              description: getErrorMessage(e)
            })

            return null
          })
      })

      const results = await Promise.all(promises)
      const successResults = results.filter((r): r is ChatbotFileUploadResult => r !== null)

      if (successResults.length > 0) {
        toast.success(`Đã tải lên ${successResults.length} file thành công`)
      }

      return successResults
      
    } catch (e) {
      // Clear progress nếu lỗi
      setFileUploadProgress({})
      
      toast.error('Upload files thất bại', {
        description: getErrorMessage(e as any)
      })
      
      return []
    }
  }

  return {
    fileInputRef,
    files,
    setFiles,
    removeFile,
    addFile,
    addFiles,
    uploadFiles,
    fileUploadProgress,
    maxFiles: MAX_FILES,
    canAddMore: files.length < MAX_FILES
  }
}
