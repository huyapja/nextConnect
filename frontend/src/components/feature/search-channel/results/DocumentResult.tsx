import { BsFileEarmarkText } from 'react-icons/bs'
export interface SearchDoc {
  id: number
  title: string
  excerpt: string
  lastModified: string
  author: string
  type: string
}

interface DocumentResultProps {
  document: SearchDoc
}

export const DocumentResult = ({ document }: DocumentResultProps) => {
  return (
    <div className='group p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-900'>
      <div className='flex items-start gap-3'>
        <div className='w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0'>
          <BsFileEarmarkText className='w-5 h-5 text-white' />
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <h4 className='font-medium text-gray-900 dark:text-white text-sm truncate'>{document.title}</h4>
            <span className='text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex-shrink-0'>
              {document.type}
            </span>
          </div>
          <p className='text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2'>{document.excerpt}</p>
          <div className='flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500'>
            <span>By {document.author}</span>
            <span>•</span>
            <span>{document.lastModified}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
