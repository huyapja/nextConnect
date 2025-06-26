import { Label } from '@/components/common/Form'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/layout/Drawer'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { Box, Button, Dialog, Flex, IconButton, TextField } from '@radix-ui/themes'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useAtom, useSetAtom } from 'jotai'
import { useEffect, useRef } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { IoMdClose } from 'react-icons/io'
import { toast } from 'sonner'
import { labelListAtom } from './conversations/atoms/labelAtom'
import { atom } from 'jotai'
import { FiPlus } from 'react-icons/fi'
import { useUpdateChannelLabels } from '@/utils/channel/ChannelAtom'

export const createLabelModalAtom = atom<{
  isOpen: boolean
  addUserToLabel?: boolean
  selectedChannel?: string
}>({
  isOpen: false
})

interface CreateLabelForm {
  label: string
}

const DIALOG_CONTENT_CLASS =
  'z-[300] bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'

export const CreateLabelButton = () => {
  const [modalState, setModalState] = useAtom(createLabelModalAtom)
  const { isOpen } = modalState
  const isDesktop = useIsDesktop()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setModalState((prev) => ({ ...prev, isOpen: false }))
      }
    }

    if (isDesktop && isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      return () => document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen, isDesktop, setModalState])

  const handleChangeOpen = (open: boolean) => {
    if (!open) setModalState((prev) => ({ ...prev, isOpen: false }))
  }

  const openModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: true }))
  }

  if (isDesktop) {
    return (
      <>
        <IconButton
          onClick={openModal}
          variant='soft'
          size='1'
          radius='large'
          color='gray'
          aria-label='Tạo nhãn'
          title='Tạo nhãn'
          className='transition-all ease-ease text-gray-10 bg-transparent hover:bg-gray-3 hover:text-gray-12 cursor-pointer'
        >
          <FiPlus size='16' />
        </IconButton>

        <Dialog.Root open={isOpen} onOpenChange={handleChangeOpen}>
          <Dialog.Content ref={dialogRef} className={DIALOG_CONTENT_CLASS}>
            <CreateLabelContent />
          </Dialog.Content>
        </Dialog.Root>
      </>
    )
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => setModalState((prev) => ({ ...prev, isOpen: open }))}>
      <DrawerTrigger asChild>
        <IconButton
          onClick={() => setTimeout(openModal, 50)}
          variant='soft'
          size='1'
          radius='large'
          color='gray'
          aria-label='Tạo nhãn'
          title='Tạo nhãn'
          className='transition-all ease-ease text-gray-10 bg-transparent hover:bg-gray-3 hover:text-gray-12'
        >
          <FiPlus size='14' />
        </IconButton>
      </DrawerTrigger>
      <DrawerContent>
        <div className='pb-16 overflow-y-scroll min-h-96'>
          <CreateLabelContent />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export const CreateLabelContent = () => {
  const [modalState, setModalState] = useAtom(createLabelModalAtom)
  const { addUserToLabel, selectedChannel } = modalState
  const methods = useForm<CreateLabelForm>({ defaultValues: { label: '' } })
  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset
  } = methods

  const labelValue = watch('label') || ''

  const { call: callCreateLabel, loading: loadingCreateLabel } = useFrappePostCall('raven.api.user_label.create_label')
  const { call: callCreateOrAssignLabel, loading: loadingAssignLabel } = useFrappePostCall(
    'raven.api.user_channel_label.create_or_assign_label'
  )
  const call = addUserToLabel ? callCreateOrAssignLabel : callCreateLabel
  const loading = addUserToLabel ? loadingAssignLabel : loadingCreateLabel

  const setLabelList = useSetAtom(labelListAtom)
  const { addLabelToChannel } = useUpdateChannelLabels()

  const onSubmit = async (data: CreateLabelForm) => {
    try {
      const label_name = data.label.trim()
      const payload = addUserToLabel
        ? {
            label: label_name,
            channel_ids: JSON.stringify([selectedChannel])
          }
        : { label: label_name }

      const res = await call(payload)

      if (res?.status === 'error') {
        toast.error(res.message || 'Không thể tạo nhãn')
        return
      }

      const label_id = res?.message?.label_id

      if (label_id) {
        if (modalState.selectedChannel) {
          await addLabelToChannel(modalState.selectedChannel, {
            label_id,
            label: label_name
          })
        }

        setLabelList((prev) => [...prev, { label_id, label: label_name, channels: [] }])
        toast.success('Đã tạo nhãn')
        reset()
        setModalState((prev) => ({ ...prev, isOpen: false }))
      } else {
        toast.error('Không thể tạo nhãn')
        console.error('API không trả label_id:', res)
      }
    } catch (err) {
      console.error(err)
      toast.error('Không thể tạo nhãn')
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        <Dialog.Title className='text-lg font-semibold flex'>
          <Flex align='center' gap='2'>
            Nhãn mới
            {!!labelValue.trim() && (
              <span className='text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded'>{labelValue}</span>
            )}
          </Flex>
          <Dialog.Close>
            <IoMdClose
              type='button'
              className='text-gray-500 hover:text-black dark:hover:text-white transition-colors p-1 ml-auto cursor-pointer'
              aria-label='Đóng'
            />
          </Dialog.Close>
        </Dialog.Title>

        <Dialog.Description className='text-sm text-gray-500'>
          Nhập tên nhãn để tạo mới. Chỉ bạn có thể thấy nhãn này.
        </Dialog.Description>

        <Box>
          <Label htmlFor='label' size='2' className='font-medium'>
            Tên nhãn <span className='text-red-500'>*</span>
          </Label>
          <Controller
            name='label'
            control={control}
            rules={{
              required: 'Vui lòng nhập tên nhãn',
              maxLength: { value: 60, message: 'Tên nhãn không quá 60 ký tự' }
            }}
            render={({ field, fieldState: { error } }) => (
              <>
                <TextField.Root
                  id='label'
                  placeholder='Vui lòng nhập tên nhãn'
                  required
                  color={error ? 'red' : undefined}
                  maxLength={60}
                  {...field}
                />
                <Flex justify='between' mt='1'>
                  {errors.label ? (
                    <div className='text-red-500 text-sm'>{errors.label.message}</div>
                  ) : (
                    <div className='text-transparent text-sm'>Ẩn</div>
                  )}
                  <div className='text-sm text-gray-500'>{labelValue?.length}/60</div>
                </Flex>
              </>
            )}
          />
        </Box>

        <Flex justify='end' align='center'>
          <Flex gap='3' align='center'>
            <Dialog.Close>
              <Button className='cursor-pointer' variant='soft' type='button' size='2'>
                Hủy bỏ
              </Button>
            </Dialog.Close>
            <Button className='cursor-pointer' type='submit' size='2' disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo'}
            </Button>
          </Flex>
        </Flex>
      </form>
    </FormProvider>
  )
}
