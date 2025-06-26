import { TextField } from '@radix-ui/themes'
import { BiSearch } from 'react-icons/bi'

interface SearchHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export const SearchHeader = ({ searchQuery, onSearchChange }: SearchHeaderProps) => {
  return (
    <div className='sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800'>
      <div className='sm:p-4 lg:p-6 lg:pb-4'>
        <div className='mb-3 sm:mb-4'>
          <h2 className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1'>Tìm kiếm</h2>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block'>
            Tìm kiếm tin nhắn, tệp và nhiều nội dung khác trong không gian làm việc của bạn
          </p>
        </div>

        <div className='relative'>
          <TextField.Root
            type='text'
            autoFocus
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full text-sm sm:text-base'
            placeholder='Nhập tìm kiếm...'
            style={{
              backgroundColor: 'var(--gray-2)',
              border: '1px solid var(--gray-6)',
              borderRadius: '12px',
              fontSize: '14px',
              color: 'var(--gray-12)'
            }}
          >
            <TextField.Slot side='left'>
              <BiSearch className='w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 ml-2' />
            </TextField.Slot>
          </TextField.Root>
        </div>
      </div>
    </div>
  )
}
