// components/search/SearchHeader.tsx
import { TextField } from '@radix-ui/themes'
import { BiSearch } from 'react-icons/bi'

interface SearchHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export const SearchHeader = ({ searchQuery, onSearchChange }: SearchHeaderProps) => {
  return (
    <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-6 pb-4'>
      <div className='mb-4'>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-1'>Search</h2>
        <p className='text-sm text-gray-500 dark:text-gray-400'>Find messages, files, and more across your workspace</p>
      </div>

      <div className='relative'>
        <TextField.Root
          type='text'
          autoFocus
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className='w-full'
          placeholder='Search...'
          style={{
            backgroundColor: 'var(--gray-2)',
            border: '1px solid var(--gray-6)',
            borderRadius: '12px',
            fontSize: '14px',
            color: 'var(--gray-12)'
          }}
        >
          <TextField.Slot side='left'>
            <BiSearch className='w-5 h-5 text-gray-400 dark:text-gray-500' />
          </TextField.Slot>
        </TextField.Root>
      </div>
    </div>
  )
}
