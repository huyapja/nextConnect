import { useEffect, useState } from 'react'
import { CustomFile } from '../components/feature/file-upload/FileDrop'

/**
 * Hook takes in a file and returns a blob URL for previewing the file if image
 * @param file
 * @returns File url
 */
export const useGetFilePreviewUrl = (file: CustomFile): string => {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    let objectUrl = ''
    const validPreviewTypes = [
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'image/webp',
      'image/jpg'
    ]

    //Only create a URL for images
    if (validPreviewTypes.includes(file.type)) {
      // create the preview
      objectUrl = URL.createObjectURL(file)
      setUrl(objectUrl)
    } else {
      setUrl('')
    }

    // free memory when ever this component is unmounted
    return () => {
      objectUrl && URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  return url
}
