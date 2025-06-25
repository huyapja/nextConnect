import { Button, Dialog, Flex, Text } from '@radix-ui/themes'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useSetAtom } from 'jotai'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { sortedChannelsAtom, useUpdateChannelLabels } from '@/utils/channel/ChannelAtom'
import { labelListAtom } from './conversations/atoms/labelAtom'

type Props = {
  name: string
  label: string
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export const DeleteLabelModal = ({ name, label, isOpen, setIsOpen }: Props) => {
  const { call, loading: isLoading } = useFrappePostCall('raven.api.user_label.delete_label')
  const setLabelList = useSetAtom(labelListAtom)
  const { removeLabelFromChannel } = useUpdateChannelLabels()

  const handleDelete = async () => {
    try {
      const res = await call({ label_id: name })
      const message = res?.message?.message

      if (message === 'Label deleted') {
        // ✅ Xoá label khỏi labelListAtom
        setLabelList((prev) => prev.filter((l) => l.label_id !== name))

        // ✅ Xoá label khỏi sortedChannelsAtom (dùng function giống Edit)
        removeLabelFromChannel('*', name) // dấu * là sẽ áp dụng cho ALL channel

        toast.success(`Xóa nhãn thành công`)
        setIsOpen(false)
      } else {
        console.error('Lỗi không rõ:', res)
        toast.error('Không thể xoá nhãn. Vui lòng thử lại.')
      }
    } catch (err) {
      console.error('Lỗi khi xoá nhãn:', err)
      toast.error('Có lỗi xảy ra trong quá trình xoá nhãn.')
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Content className='max-w-md bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg z-[300]'>
        <Dialog.Title>Xác nhận xoá</Dialog.Title>
        <Text as='p' size='3' className='mb-4'>
          Bạn có chắc muốn xoá nhãn <strong>{label}</strong> không?
        </Text>
        <Flex justify='end' align='center' gap='3'>
          <Button variant='soft' onClick={() => setIsOpen(false)} className='cursor-pointer' disabled={isLoading}>
            Huỷ
          </Button>
          <Button color='red' onClick={handleDelete} disabled={isLoading} className='cursor-pointer'>
            {isLoading ? 'Đang xoá...' : 'Xoá'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
