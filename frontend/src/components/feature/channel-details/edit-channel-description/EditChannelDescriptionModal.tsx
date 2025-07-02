import { ErrorText, Label } from '@/components/common/Form'
import { Loader } from '@/components/common/Loader'
import { ErrorBanner } from '@/components/layout/AlertBanner/ErrorBanner'
import { ChannelListItem } from '@/utils/channel/ChannelListProvider'
import { __ } from '@/utils/translations'
import { Box, Button, Dialog, Flex, Text, TextArea } from '@radix-ui/themes'
import { useFrappeUpdateDoc } from 'frappe-react-sdk'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface RenameChannelForm {
  channel_description: string
}

interface RenameChannelModalContentProps {
  channelData: ChannelListItem
  onClose: () => void
}

export const EditChannelDescriptionModalContent = ({ channelData, onClose }: RenameChannelModalContentProps) => {
  const methods = useForm<RenameChannelForm>({
    defaultValues: {
      channel_description: channelData?.channel_description
    }
  })
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = methods
  const { updateDoc, loading: updatingDoc, error } = useFrappeUpdateDoc()

  const onSubmit = (data: RenameChannelForm) => {
    updateDoc('Raven Channel', channelData?.name ?? null, {
      channel_description: data.channel_description
    }).then(() => {
      toast.success(__('Channel description updated'))
      onClose()
    })
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog.Title>
          {channelData && channelData?.channel_description && channelData?.channel_description?.length > 0
            ? __('Sửa mô tả')
            : __('Thêm mô tả')}
        </Dialog.Title>

        <Flex gap='2' direction='column' width='100%'>
          <ErrorBanner error={error} />
          <Box width='100%'>
            <Label htmlFor='channel_description'>Mô tả kênh</Label>
            <TextArea
              maxLength={140}
              id='channel_description'
              placeholder='Thêm mô tả'
              {...register('channel_description', {
                maxLength: {
                  value: 140,
                  message: 'Mô tả kênh không được vượt quá 200 ký tự.'
                }
              })}
              aria-invalid={errors.channel_description ? 'true' : 'false'}
            />
            <Text size='1' weight='light'>
              Đây là cách mọi người hiểu nội dung của kênh này.
            </Text>
            {errors?.channel_description && <ErrorText>{errors.channel_description?.message}</ErrorText>}
          </Box>
        </Flex>

        <Flex gap='3' mt='6' justify='end' align='center'>
          <Dialog.Close disabled={updatingDoc}>
            <Button variant='soft' color='gray'>
              Hủy
            </Button>
          </Dialog.Close>
          <Button type='submit' disabled={updatingDoc}>
            {updatingDoc && <Loader className='text-white' />}
            {updatingDoc ? 'Đang lưu' : 'Lưu'}
          </Button>
        </Flex>
      </form>
    </FormProvider>
  )
}