import { BiSearch } from 'react-icons/bi'

interface EmptyStateProps {
  type: 'no-search' | 'no-results'
}

export const EmptyState = ({ type }: EmptyStateProps) => {
  return (
    <div className='text-center py-12'>
      <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4'>
        <BiSearch className='w-8 h-8 text-gray-400 dark:text-gray-500' />
      </div>
      {type === 'no-search' ? (
        <>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>Bắt đầu tìm kiếm</h3>
          <p className='text-gray-500 dark:text-gray-400 max-w-sm mx-auto'>
            Nhập từ khóa vào ô tìm kiếm phía trên để tìm tin nhắn, tài liệu, tệp và nhiều nội dung khác trong không gian
            làm việc của bạn.
          </p>
        </>
      ) : (
        <>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>Không tìm thấy kết quả</h3>
          <p className='text-gray-500 dark:text-gray-400'>Hãy thử thay đổi từ khóa hoặc duyệt qua các danh mục khác.</p>
        </>
      )}
    </div>
  )
}
