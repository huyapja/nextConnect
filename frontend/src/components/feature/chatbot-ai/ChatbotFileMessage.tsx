import { Box, Button, Dialog, Flex, IconButton, Link, Text, Tooltip } from '@radix-ui/themes'
import { clsx } from 'clsx'
import { BiDownload, BiShow } from 'react-icons/bi'
import { FiFile, FiFileText, FiImage, FiMusic, FiVideo } from 'react-icons/fi'
import { useState, useEffect } from 'react'

type Props = {
  fileUrl: string
  fileName: string
}

const getFileIcon = (ext: string) => {
  switch (ext) {
    case 'doc':
    case 'docx':
    case 'txt':
      return <FiFileText size={20} className='text-blue-500' />
    case 'xlsx':
    case 'xls':
      return <FiFileText size={20} className='text-green-500' />
    case 'pdf':
      return <FiFileText size={20} className='text-red-400' />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <FiImage size={20} className='text-green-500' />
    case 'mp4':
    case 'mov':
    case 'avi':
      return <FiVideo size={20} className='text-purple-500' />
    case 'mp3':
    case 'wav':
      return <FiMusic size={20} className='text-orange-500' />
    default:
      return <FiFile size={20} className='text-gray-500' />
  }
}

const PDFPreviewButton = ({ fileUrl, fileName }: { fileUrl: string; fileName: string }) => {
  return (
    <Dialog.Root>
      <Tooltip content='Xem trước PDF'>
      <Dialog.Trigger>
        <IconButton size='1' color='gray' variant='soft' title='Xem trước PDF'>
          <BiShow />
        </IconButton>
      </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content className={clsx('min-w-[64rem] bg-white dark:bg-gray-2 p-6 rounded-xl')}>
        <Dialog.Title>{fileName}</Dialog.Title>
        <Dialog.Description size='1' color='gray'>
          Xem nội dung file PDF
        </Dialog.Description>
        <Box my='4'>
          <embed src={fileUrl} type='application/pdf' width='100%' height='680px' />
        </Box>
        <Flex justify='end' gap='2' mt='3'>
          <Button variant='soft' color='gray' asChild>
            <Link href={fileUrl} download>
              <BiDownload />
              <span className='ml-1'>Tải xuống</span>
            </Link>
          </Button>
          <Dialog.Close>
            <Button color='gray' variant='soft'>
              Đóng
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

const ImagePreviewButton = ({ fileUrl, fileName }: { fileUrl: string; fileName: string }) => {
  return (
    <Dialog.Root>
      <Tooltip content='Xem trước hình ảnh'>
        <Dialog.Trigger>
          <IconButton size='1' color='gray' variant='soft' title='Xem trước hình ảnh'>
            <BiShow />
          </IconButton>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content className={clsx('max-w-[80vw] max-h-[80vh] bg-white dark:bg-gray-2 p-6 rounded-xl')}>
        <Dialog.Title>{fileName}</Dialog.Title>
        <Dialog.Description size='1' color='gray'>
          Xem trước hình ảnh
        </Dialog.Description>
        <Box my='4' className='flex justify-center'>
          <img 
            src={fileUrl} 
            alt={fileName}
            className='max-w-full max-h-[60vh] object-contain rounded-lg'
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<p class="text-red-500">Không thể tải hình ảnh</p>';
            }}
          />
        </Box>
        <Flex justify='end' gap='2' mt='3'>
          <Button variant='soft' color='gray' asChild>
            <Link href={fileUrl} download>
              <BiDownload />
              <span className='ml-1'>Tải xuống</span>
            </Link>
          </Button>
          <Dialog.Close>
            <Button color='gray' variant='soft'>
              Đóng
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

const TextPreviewButton = ({ fileUrl, fileName }: { fileUrl: string; fileName: string }) => {
  const [textContent, setTextContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const loadTextContent = async () => {
    if (textContent) return // Đã load rồi
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error('Không thể tải file')
      }
      
      // Kiểm tra content type
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/') && !fileUrl.startsWith('blob:')) {
        throw new Error('File không phải định dạng text')
      }
      
      const text = await response.text()
      
      // Kiểm tra nếu file quá lớn (> 1MB text)
      if (text.length > 1024 * 1024) {
        setTextContent(text.substring(0, 50000) + '\n\n... (File quá lớn, chỉ hiển thị 50,000 ký tự đầu)')
      } else {
        setTextContent(text)
      }
    } catch (err) {
      setError('Không thể đọc nội dung file. Có thể file không phải định dạng text hoặc bị lỗi.')
      console.error('Error loading text content:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root>
      <Tooltip content='Xem trước nội dung text'>
        <Dialog.Trigger>
          <IconButton 
            size='1' 
            color='gray' 
            variant='soft' 
            title='Xem trước nội dung text'
            onClick={loadTextContent}
          >
            <BiShow />
          </IconButton>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content className={clsx('min-w-[48rem] max-w-[80vw] bg-white dark:bg-gray-2 p-6 rounded-xl')}>
        <Dialog.Title>{fileName}</Dialog.Title>
        <Dialog.Description size='1' color='gray'>
          Xem nội dung file text
        </Dialog.Description>
        <Box my='4' className='max-h-[60vh] overflow-auto'>
          {loading && (
            <div className='flex justify-center items-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
              <span className='ml-2'>Đang tải...</span>
            </div>
          )}
          {error && (
            <div className='text-red-500 text-center py-4 bg-red-50 dark:bg-red-900/20 rounded p-4'>
              <div className='font-medium'>⚠️ Lỗi đọc file</div>
              <div className='text-sm mt-1'>{error}</div>
            </div>
          )}
          {textContent && (
            <div className='bg-gray-50 dark:bg-gray-8 rounded-md border'>
              <div className='p-2 border-b bg-gray-100 dark:bg-gray-7 text-xs text-gray-600 dark:text-gray-400'>
                📄 {fileName} • {textContent.length.toLocaleString()} ký tự
              </div>
              <pre className='whitespace-pre-wrap text-sm p-4 max-h-96 overflow-auto font-mono'>
                {textContent}
              </pre>
            </div>
          )}
        </Box>
        <Flex justify='end' gap='2' mt='3'>
          <Button variant='soft' color='gray' asChild>
            <Link href={fileUrl} download>
              <BiDownload />
              <span className='ml-1'>Tải xuống</span>
            </Link>
          </Button>
          <Dialog.Close>
            <Button color='gray' variant='soft'>
              Đóng
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

const NativeOfficePreviewButton = ({ fileUrl, fileName, fileType }: { fileUrl: string; fileName: string; fileType: string }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [previewContent, setPreviewContent] = useState<string>('')
  const [previewType, setPreviewType] = useState<'iframe' | 'excel' | 'word' | 'text'>('iframe')

  const loadOfficeFile = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error('Không thể tải file')
      }

      const arrayBuffer = await response.arrayBuffer()
      
      if (['xlsx', 'xls'].includes(fileType.toLowerCase())) {
        // Import SheetJS dynamically
        // @ts-ignore
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')
        const workbook = (XLSX as any).read(arrayBuffer, { type: 'array' })
        
        // Get first worksheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert to HTML table
        const htmlTable = (XLSX as any).utils.sheet_to_html(worksheet, { 
          id: 'excel-table',
          editable: false 
        })
        
        setPreviewContent(htmlTable)
        setPreviewType('excel')
        
      } else if (['docx'].includes(fileType.toLowerCase())) {
        // For DOCX files, try to extract text
        try {
          // @ts-ignore
          const mammoth = await import('https://cdn.skypack.dev/mammoth@1.6.0')
          const result = await (mammoth as any).convertToHtml({ arrayBuffer })
          setPreviewContent(result.value)
          setPreviewType('word')
        } catch (docError) {
          // Fallback to basic text extraction
          const text = new TextDecoder().decode(arrayBuffer)
          const cleanText = text.replace(/[^\x20-\x7E\n]/g, ' ').substring(0, 5000)
          setPreviewContent(`<pre style="white-space: pre-wrap; font-family: monospace;">${cleanText}</pre>`)
          setPreviewType('text')
        }
        
      } else if (['pptx'].includes(fileType.toLowerCase())) {
        // For PowerPoint, show basic info
        setPreviewContent(`
          <div style="text-align: center; padding: 2rem;">
            <h3>📊 PowerPoint Presentation</h3>
            <p><strong>File:</strong> ${fileName}</p>
            <p><strong>Size:</strong> ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB</p>
            <p>⚠️ Native preview cho PowerPoint chưa được hỗ trợ đầy đủ.</p>
            <p>💡 Dùng Microsoft hoặc Google viewer để xem presentation.</p>
          </div>
        `)
        setPreviewType('text')
        
      } else {
        // Other file types - try iframe
        setPreviewType('iframe')
      }
      
    } catch (err) {
      console.error('Office file load error:', err)
      setError(`Không thể parse file ${fileType.toUpperCase()}. ${(err as Error).message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleIframeLoad = () => {
    console.log('Native iframe loaded successfully')
    setLoading(false)
  }

  const handleIframeError = () => {
    console.log('Native iframe failed to load')
    setLoading(false)
    setError('Browser không thể preview file này. Thử download để xem hoặc dùng Microsoft/Google viewer.')
  }

  // Load content based on file type
  useEffect(() => {
    if (['xlsx', 'xls', 'docx', 'pptx'].includes(fileType.toLowerCase())) {
      loadOfficeFile()
    } else {
      // For other files, use iframe with timeout
      setLoading(true)
      setError('')
      setPreviewType('iframe')
      
      const timeout = setTimeout(() => {
        setLoading(false)
        setError('Preview timeout. File có thể quá lớn hoặc định dạng không hỗ trợ.')
      }, 10000)

      return () => clearTimeout(timeout)
    }
  }, [])

  return (
    <Dialog.Root>
      <Tooltip content={`Native Preview ${fileType.toUpperCase()} (Parsed)`}>
        <Dialog.Trigger>
          <IconButton size='1' color='blue' variant='soft' title={`Native Preview ${fileType.toUpperCase()} (Parsed)`}>
            <BiShow />
          </IconButton>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content className={clsx('min-w-[64rem] max-w-[90vw] max-h-[90vh] bg-white dark:bg-gray-2 p-6 rounded-xl')}>
        <Dialog.Title className='flex items-center justify-between'>
          <span>{fileName}</span>
          <div className='text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded'>
            Native Preview • Không cần cookies
          </div>
        </Dialog.Title>
        <Dialog.Description size='1' color='gray' className='mb-2'>
          Preview trực tiếp từ server (tương thích với mọi browser)
        </Dialog.Description>

                 <Box my='4' className='h-[60vh] overflow-hidden rounded border relative'>
           {loading && (
             <div className='absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-8 z-10'>
               <div className='flex flex-col items-center'>
                 <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2'></div>
                 <span className='text-sm text-gray-600 dark:text-gray-400'>
                   {['xlsx', 'xls', 'docx', 'pptx'].includes(fileType.toLowerCase()) 
                     ? 'Đang parse Office file...' 
                     : 'Đang tải preview...'
                   }
                 </span>
                 <span className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
                   {['xlsx', 'xls', 'docx', 'pptx'].includes(fileType.toLowerCase()) 
                     ? 'Sử dụng JavaScript libraries để parse file' 
                     : 'Native browser preview'
                   }
                 </span>
               </div>
             </div>
           )}
           
           {error && (
             <div className='flex items-center justify-center h-full bg-yellow-50 dark:bg-yellow-900/20'>
               <div className='text-center p-4'>
                 <div className='text-yellow-600 text-xl mb-2'>⚠️</div>
                 <div className='text-yellow-800 dark:text-yellow-200 font-medium mb-2'>Native Preview không hỗ trợ</div>
                 <div className='text-yellow-700 dark:text-yellow-300 text-sm mb-4'>{error}</div>
                 <div className='text-xs text-gray-600 dark:text-gray-400 space-y-2'>
                   <p>🔧 <strong>Thử ngay:</strong></p>
                   <div className='flex gap-2 justify-center mt-2'>
                     <button
                       onClick={() => window.open(fileUrl, '_blank')}
                       className='px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600'
                     >
                       Mở tab mới
                     </button>
                     <button
                       onClick={() => {
                         const link = document.createElement('a');
                         link.href = fileUrl;
                         link.download = fileName;
                         link.click();
                       }}
                       className='px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600'
                     >
                       Tải xuống
                     </button>
                   </div>
                 </div>
               </div>
             </div>
           )}

           {!error && previewType === 'iframe' && (
             <iframe
               src={fileUrl}
               className='w-full h-full border-0'
               onLoad={handleIframeLoad}
               onError={handleIframeError}
               title={`Native preview of ${fileName}`}
               sandbox="allow-scripts allow-same-origin allow-downloads"
             />
           )}

           {!error && previewType === 'excel' && (
             <div className='w-full h-full overflow-auto bg-white dark:bg-gray-8 p-4'>
               <div className='mb-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2'>
                 <span>📊</span>
                 <span><strong>Excel Spreadsheet:</strong> {fileName}</span>
               </div>
               <div 
                 dangerouslySetInnerHTML={{ __html: previewContent }}
                 className='excel-preview'
               />
               <style dangerouslySetInnerHTML={{
                 __html: `
                   .excel-preview table {
                     border-collapse: collapse;
                     width: 100%;
                     font-size: 12px;
                     border: 1px solid #e5e7eb;
                   }
                   .excel-preview th, .excel-preview td {
                     border: 1px solid #e5e7eb;
                     padding: 4px 8px;
                     text-align: left;
                   }
                   .excel-preview th {
                     background-color: #f3f4f6;
                     font-weight: bold;
                   }
                   .excel-preview tr:nth-child(even) {
                     background-color: #f9fafb;
                   }
                 `
               }} />
             </div>
           )}

           {!error && previewType === 'word' && (
             <div className='w-full h-full overflow-auto bg-white dark:bg-gray-8 p-4'>
               <div className='mb-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2'>
                 <span>📝</span>
                 <span><strong>Word Document:</strong> {fileName}</span>
               </div>
               <div 
                 dangerouslySetInnerHTML={{ __html: previewContent }}
                 className='word-preview prose prose-sm max-w-none'
               />
             </div>
           )}

           {!error && previewType === 'text' && (
             <div className='w-full h-full overflow-auto bg-white dark:bg-gray-8 p-4'>
               <div className='mb-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2'>
                 <span>📄</span>
                 <span><strong>Document Preview:</strong> {fileName}</span>
               </div>
               <div dangerouslySetInnerHTML={{ __html: previewContent }} />
             </div>
           )}
         </Box>

        <Flex justify='end' gap='2' mt='3'>
          <Button variant='soft' color='gray' asChild>
            <Link href={fileUrl} download>
              <BiDownload />
              <span className='ml-1'>Tải xuống</span>
            </Link>
          </Button>
          <Dialog.Close>
            <Button color='gray' variant='soft'>
              Đóng
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

const OfficePreviewButton = ({ fileUrl, fileName, fileType }: { fileUrl: string; fileName: string; fileType: string }) => {
  // Smart default: Native với JS parsing cho tất cả file types
  const getDefaultViewer = (fileType: string): 'native' | 'microsoft' | 'google' | 'info' => {
    // Native giờ hỗ trợ parse Office files với JS libraries
    return 'native'
  }
  
  const [viewerType, setViewerType] = useState<'native' | 'microsoft' | 'google' | 'info'>(getDefaultViewer(fileType))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showCookieHelp, setShowCookieHelp] = useState(false)
  const [cookiePermissionChecked, setCookiePermissionChecked] = useState(false)

  const getMicrosoftViewerUrl = (url: string) => {
    // Encode URL để tránh lỗi với special characters
    const encodedUrl = encodeURIComponent(url)
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`
  }

  const getGoogleViewerUrl = (url: string) => {
    // Encode URL để tránh lỗi với special characters  
    const encodedUrl = encodeURIComponent(url)
    return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`
  }

  // Check và request cookie permissions
  const checkCookiePermissions = async () => {
    if (cookiePermissionChecked) return true
    
    try {
      // Modern browsers có thể support Storage Access API
      if ('requestStorageAccess' in document) {
        try {
          await document.requestStorageAccess()
          setCookiePermissionChecked(true)
          return true
        } catch (err) {
          console.log('Storage Access API denied or not available')
        }
      }

      // Fallback: Check if cookies are enabled
      const testCookieName = 'test_cookie_' + Date.now()
      document.cookie = `${testCookieName}=test; SameSite=None; Secure`
      const cookieEnabled = document.cookie.indexOf(testCookieName) !== -1
      
      if (cookieEnabled) {
        // Clean up test cookie
        document.cookie = `${testCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`
        setCookiePermissionChecked(true)
        return true
      } else {
        return false
      }
    } catch (err) {
      console.log('Cookie permission check failed:', err)
      return false
    }
  }

  // Request cookie permission với user-friendly dialog
  const requestCookiePermission = async () => {
    const hasPermission = await checkCookiePermissions()
    
    if (!hasPermission) {
      // Show Chrome-specific permission request dialog
      const userConsent = window.confirm(
        `🍪 Chrome Cookie Permission Required\n\n` +
        `Để xem preview file Office, chúng tôi cần quyền sử dụng third-party cookies.\n\n` +
        `Click "OK" để:\n` +
        `• Mở Chrome Settings\n` +
        `• Enable cookies cho site này\n\n` +
        `Hoặc "Cancel" để xem hướng dẫn chi tiết.`
      )
      
      if (userConsent) {
        // Attempt to open Chrome cookie settings
        try {
          window.open('chrome://settings/cookies', '_blank')
        } catch (err) {
          // Fallback to show manual guide
          setShowCookieHelp(true)
        }
      } else {
        setShowCookieHelp(true)
      }
      
      return false
    }
    
    return true
  }

  const handleViewerSwitch = async (type: 'native' | 'microsoft' | 'google' | 'info') => {
    setViewerType(type)
    setError('')
    setShowCookieHelp(false)
    
    if (type === 'native') {
      // Native preview không cần cookie permissions
      setLoading(true)
    } else if (type !== 'info') {
      // Check cookie permissions before loading viewer
      const hasPermission = await requestCookiePermission()
      
      if (hasPermission) {
        setLoading(true)
      } else {
        // Don't load viewer if no permission
        setError('Cần quyền cookies để xem preview. Vui lòng enable cookies và thử lại.')
        return
      }
    }
  }

  // Auto-check permissions on first load
  useEffect(() => {
    if (viewerType === 'native') {
      // Native preview không cần permission check
      setLoading(true)
    } else if (viewerType !== 'info' && !cookiePermissionChecked) {
      requestCookiePermission().then(hasPermission => {
        if (hasPermission) {
          setLoading(true)
        }
      })
    } else if (viewerType !== 'info') {
      setLoading(true)
    }
  }, [viewerType])

  const handleIframeLoad = () => {
    setLoading(false)
  }

  const handleIframeError = () => {
    setLoading(false)
    setError('Không thể tải preview. Có thể do Chrome block third-party cookies.')
    setShowCookieHelp(true)
  }

  const CookiePermissionGuide = () => (
    <div className='bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
      <div className='flex items-start gap-3'>
        <div className='text-blue-500 text-xl'>🍪</div>
        <div className='flex-1'>
          <div className='font-semibold text-blue-800 dark:text-blue-200 mb-2'>
            Chrome cần quyền third-party cookies
          </div>
          
          <div className='text-sm text-blue-700 dark:text-blue-300 space-y-3'>
            <div className='bg-blue-100 dark:bg-blue-800/30 p-3 rounded border-l-4 border-blue-500'>
              <div className='font-semibold mb-1'>🚀 Cách nhanh nhất:</div>
              <button
                onClick={() => {
                  try {
                    window.open('chrome://settings/cookies', '_blank')
                  } catch (err) {
                    window.open('chrome://settings/content/cookies', '_blank')
                  }
                }}
                className='px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors'
              >
                Mở Chrome Cookie Settings
              </button>
              <p className='text-xs mt-2'>→ Tìm "Third-party cookies" → Chọn "Allow third-party cookies"</p>
            </div>
            
            <div>
              <strong>Cách 1: Enable cho site này</strong>
              <ol className='list-decimal list-inside mt-1 space-y-1 text-xs'>
                <li>Click vào <strong>🔒 icon</strong> bên trái URL</li>
                <li>Chọn <strong>"Cookies"</strong></li>
                <li>Enable <strong>"Allow third-party cookies"</strong></li>
                <li>Refresh page</li>
              </ol>
            </div>
            
            <div>
              <strong>Cách 2: Chrome Settings Manual</strong>
              <ol className='list-decimal list-inside mt-1 space-y-1 text-xs'>
                <li>Copy: <code className='bg-blue-100 dark:bg-blue-800 px-1 rounded'>chrome://settings/cookies</code></li>
                <li>Paste vào address bar</li>
                <li>Tìm <strong>"Third-party cookies"</strong></li>
                <li>Chọn <strong>"Allow third-party cookies"</strong></li>
              </ol>
            </div>

            <div>
              <strong>Cách 3: Sử dụng browser khác</strong>
              <p className='text-xs mt-1'>Firefox, Safari hoặc Edge thường ít restrict hơn</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog.Root>
      <Tooltip content={`Xem trước ${fileType.toUpperCase()}`}>
        <Dialog.Trigger>
          <IconButton size='1' color='gray' variant='soft' title={`Xem trước ${fileType.toUpperCase()}`}>
            <BiShow />
          </IconButton>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content className={clsx('min-w-[64rem] max-w-[90vw] max-h-[90vh] bg-white dark:bg-gray-2 p-6 rounded-xl')}>
        <Dialog.Title className='flex items-center justify-between'>
          <span>{fileName}</span>
          <div className='flex gap-2'>
            <button
              onClick={() => handleViewerSwitch('native')}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                viewerType === 'native' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Native ⚡
            </button>
            <button
              onClick={() => handleViewerSwitch('microsoft')}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                viewerType === 'microsoft' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Microsoft
            </button>
            <button
              onClick={() => handleViewerSwitch('google')}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                viewerType === 'google' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Google
            </button>
            <button
              onClick={() => handleViewerSwitch('info')}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                viewerType === 'info' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Help
            </button>
          </div>
        </Dialog.Title>
        <Dialog.Description size='1' color='gray' className='mb-2'>
          Preview file {fileType.toUpperCase()} • {
            viewerType === 'native' ? 'Native Browser Preview (No Cookies)' :
            viewerType === 'microsoft' ? 'Microsoft Office Online' : 
            viewerType === 'google' ? 'Google Docs Viewer' : 
            'Troubleshooting Guide'
          }
        </Dialog.Description>

        {viewerType === 'native' && ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileType.toLowerCase()) && (
          <div className='bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 mb-4'>
            <div className='flex items-center gap-2 text-green-800 dark:text-green-200 text-sm'>
              <span>⚡</span>
              <span><strong>Native JS Parsing:</strong> File sẽ được parse bằng JavaScript libraries để hiển thị nội dung trực tiếp trong browser.</span>
            </div>
          </div>
        )}

        {showCookieHelp && viewerType !== 'info' && (
          <div className='mb-4'>
            <CookiePermissionGuide />
          </div>
        )}

        <Box my='4' className='h-[60vh] overflow-hidden rounded border'>
          {viewerType === 'info' ? (
            <div className='h-full overflow-auto p-6 bg-gray-50 dark:bg-gray-8 space-y-6'>
              <div className='text-center'>
                <div className='text-4xl mb-4 text-blue-500'>
                  {getFileIcon(fileType)}
                </div>
                <Text size='4' className='block mb-2 font-semibold'>
                  {fileName}
                </Text>
                <Text size='2' color='gray'>
                  File {fileType.toUpperCase()} Troubleshooting Guide
                </Text>
              </div>

              <div className='bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-6'>
                <div className='flex items-start gap-3'>
                  <div className='text-green-500 text-xl'>⚡</div>
                  <div className='flex-1'>
                    <div className='font-semibold text-green-800 dark:text-green-200 mb-2'>
                      Native Preview với JavaScript Parsing 🚀
                    </div>
                    <div className='text-sm text-green-700 dark:text-green-300 space-y-2'>
                      <p>✅ <strong>Excel (.xlsx, .xls):</strong> Parse thành bảng HTML với SheetJS</p>
                      <p>✅ <strong>Word (.docx):</strong> Convert thành HTML với Mammoth</p>
                      <p>✅ <strong>PowerPoint (.pptx):</strong> Hiển thị thông tin cơ bản</p>
                      <p>✅ <strong>HTML/XML/CSV/TXT:</strong> Hiển thị native hoàn hảo</p>
                      <p>✅ <strong>PDF:</strong> Native browser support</p>
                      <p>💡 <strong>Ưu điểm:</strong> Không cần cookies, parse local, bảo mật cao</p>
                    </div>
                  </div>
                </div>
              </div>

              <CookiePermissionGuide />

              <div className='bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800'>
                <div className='flex items-start gap-3'>
                  <div className='text-yellow-600 text-xl'>⚠️</div>
                  <div>
                    <div className='font-semibold text-yellow-800 dark:text-yellow-200 mb-2'>
                      Các vấn đề phổ biến
                    </div>
                    <div className='text-sm text-yellow-700 dark:text-yellow-300 space-y-2'>
                      <p><strong>❌ "We can't process this request"</strong> - Chrome block third-party cookies</p>
                      <p><strong>❌ "An error occurred"</strong> - Network hoặc CORS issues</p>
                      <p><strong>❌ "Access denied"</strong> - File không public accessible</p>
                      <p><strong>❌ Loading mãi</strong> - File quá lớn (&gt;10MB)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className='bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800'>
                <div className='flex items-start gap-3'>
                  <div className='text-green-600 text-xl'>💡</div>
                  <div>
                    <div className='font-semibold text-green-800 dark:text-green-200 mb-2'>
                      Tips để preview hoạt động tốt
                    </div>
                    <div className='text-sm text-green-700 dark:text-green-300 space-y-1'>
                      <p>✅ File size dưới 10MB cho performance tốt</p>
                      <p>✅ File phải accessible publicly</p>
                      <p>✅ Tên file không chứa ký tự đặc biệt</p>
                      <p>✅ Internet connection ổn định</p>
                      <p>✅ Thử browser khác nếu Chrome không work</p>
                    </div>
                  </div>
                </div>
              </div>

                              <div className='text-center'>
                  <div className='text-sm text-gray-500 dark:text-gray-400 space-y-1'>
                    <p>⚡ <strong>Native Preview:</strong> JS parsing, không cần cookies, bảo mật cao</p>
                    <p>🏢 <strong>Microsoft Viewer:</strong> Online viewer, cần cookies, layout gốc</p>
                    <p>📄 <strong>Google Viewer:</strong> Backup option, universal support</p>
                    <p>💾 <strong>Download:</strong> Luôn có sẵn nếu preview không work</p>
                  </div>
                  
                  <div className='mt-4 p-3 bg-gray-100 dark:bg-gray-7 rounded text-xs'>
                    <div className='font-semibold mb-1'>🔧 Debug Info:</div>
                    <div className='text-left space-y-1'>
                      <p><strong>File URL:</strong> <code className='bg-gray-200 dark:bg-gray-6 px-1 rounded'>{fileUrl}</code></p>
                      <p><strong>File Type:</strong> .{fileType}</p>
                      <div className='flex gap-2 mt-2'>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(fileUrl)
                            alert('File URL copied to clipboard!')
                          }}
                          className='px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600'
                        >
                          Copy URL
                        </button>
                        <button
                          onClick={() => window.open(fileUrl, '_blank')}
                          className='px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600'
                        >
                          Test URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          ) : (
            <div className='relative h-full'>
              {loading && (
                <div className='absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-8 z-10'>
                  <div className='flex flex-col items-center'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2'></div>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Đang tải preview...</span>
                    <span className='text-xs text-gray-500 dark:text-gray-500 mt-1'>Nếu lâu quá, check Chrome cookies settings</span>
                  </div>
                </div>
              )}
              
              {error && !showCookieHelp && (
                <div className='absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 z-10'>
                                   <div className='text-center p-4'>
                   <div className='text-red-500 text-xl mb-2'>⚠️</div>
                   <div className='text-red-600 dark:text-red-400 font-medium mb-2'>
                     {viewerType === 'native' ? 'Native Preview thất bại' : 'Viewer không tải được'}
                   </div>
                   <div className='text-red-500 text-sm mb-4'>{error}</div>
                   <div className='flex gap-2 justify-center flex-wrap'>
                     {viewerType === 'native' && (
                       <button
                         onClick={() => handleViewerSwitch('microsoft')}
                         className='px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
                       >
                         Thử Microsoft Viewer 🏢
                       </button>
                     )}
                     {viewerType !== 'native' && (
                       <button
                         onClick={() => handleViewerSwitch('native')}
                         className='px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors'
                       >
                         Thử Native Preview ⚡
                       </button>
                     )}
                     <button
                       onClick={() => handleViewerSwitch(viewerType === 'microsoft' ? 'google' : 'google')}
                       className='px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors'
                     >
                       Thử Google Viewer 📄
                     </button>
                     <button
                       onClick={() => window.open(fileUrl, '_blank')}
                       className='px-3 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors'
                     >
                       Mở tab mới 🔗
                     </button>
                     <button
                       onClick={() => handleViewerSwitch('info')}
                       className='px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors'
                     >
                       Help 💡
                     </button>
                   </div>
                  </div>
                </div>
              )}

              <iframe
                src={
                  viewerType === 'native' ? fileUrl :
                  viewerType === 'microsoft' ? getMicrosoftViewerUrl(fileUrl) : 
                  getGoogleViewerUrl(fileUrl)
                }
                className='w-full h-full border-0'
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{ display: error ? 'none' : 'block' }}
                title={`Preview of ${fileName}`}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          )}
        </Box>

        <Flex justify='end' gap='2' mt='3'>
          <Button variant='soft' color='gray' asChild>
            <Link href={fileUrl} download>
              <BiDownload />
              <span className='ml-1'>Tải xuống</span>
            </Link>
          </Button>
          <Dialog.Close>
            <Button color='gray' variant='soft'>
              Đóng
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

const getPreviewButton = (ext: string, fileUrl: string, fileName: string) => {
  switch (ext) {
    case 'pdf':
      return <PDFPreviewButton fileUrl={fileUrl} fileName={fileName} />
    
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <ImagePreviewButton fileUrl={fileUrl} fileName={fileName} />
    
    case 'txt':
      return <TextPreviewButton fileUrl={fileUrl} fileName={fileName} />
    
    case 'doc':
    case 'docx':
    case 'xls':
    case 'xlsx':
    case 'ppt':
    case 'pptx':
      return <OfficePreviewButton fileUrl={fileUrl} fileName={fileName} fileType={ext} />
    
    // Add native preview for other file types
    case 'html':
    case 'htm':
    case 'xml':
    case 'csv':
    case 'rtf':
      return <NativeOfficePreviewButton fileUrl={fileUrl} fileName={fileName} fileType={ext} />
    
    default:
      return null // Không hiển thị nút preview cho file không hỗ trợ
  }
}

const ChatbotFileMessage = ({ fileUrl, fileName }: Props) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const icon = getFileIcon(ext)
  const previewButton = getPreviewButton(ext, fileUrl, fileName)

  return (
    <Box>
      <Flex
        align='center'
        gap='4'
        p='3'
        className='border bg-gray-1 dark:bg-gray-3 rounded-md border-gray-4 dark:border-gray-6 max-w-full w-fit'
      >
        <Flex align='center' gap='2'>
          {icon}
          <Text as='span' size='2' className='truncate max-w-[200px]'>
            {fileName}
          </Text>
        </Flex>

        <Flex align='center' gap='2'>
          {previewButton}

          <Tooltip content='Tải xuống'>
            <IconButton asChild size='1' title='Tải xuống' variant='soft' color='gray'>
              <Link href={fileUrl} download>
                <BiDownload />
              </Link>
            </IconButton>
          </Tooltip>
        </Flex>
      </Flex>
    </Box>
  )
}

export default ChatbotFileMessage
