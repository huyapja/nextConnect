import { BiLink } from 'react-icons/bi'

export interface SearchLink {
  id: number
  url: string
  label: string
  description: string
  sharedBy: string
  sharedDate: string
}

interface LinkResultProps {
  link: SearchLink
}

export const LinkResult = ({ link }: LinkResultProps) => {
  return (
    <div className='group p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-900'>
      <div className='flex items-start gap-3'>
        <div className='w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0'>
          <BiLink className='w-5 h-5 text-white' />
        </div>
        <div className='flex-1 min-w-0'>
          <h4 className='font-medium text-blue-600 dark:text-blue-400 text-sm hover:text-blue-700 dark:hover:text-blue-300 truncate mb-1'>
            <a href={link.url} target='_blank' rel='noreferrer'>
              {link.label}
            </a>
          </h4>
          <p className='text-sm text-gray-600 dark:text-gray-300 line-clamp-1 mb-2'>{link.description}</p>
          <div className='flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-1'>
            <span>Shared by {link.sharedBy}</span>
            <span>•</span>
            <span>{link.sharedDate}</span>
          </div>
          <p className='text-xs text-gray-400 dark:text-gray-500 truncate'>{link.url}</p>
        </div>
      </div>
    </div>
  )
}
