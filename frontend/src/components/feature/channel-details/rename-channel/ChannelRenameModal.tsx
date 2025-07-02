import { ErrorText, Label } from '@/components/common/Form'
import { Loader } from '@/components/common/Loader'
import { ErrorBanner } from '@/components/layout/AlertBanner/ErrorBanner'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { ChannelListItem } from '@/utils/channel/ChannelListProvider'
import { ChannelIcon } from '@/utils/layout/channelIcon'
import { Box, Button, Dialog, Flex, Text, TextField } from '@radix-ui/themes'
import { useFrappeUpdateDoc, useSWRConfig } from 'frappe-react-sdk'
import { ChangeEvent, useCallback } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface RenameChannelForm {
  channel_name: string
}

interface RenameChannelModalContentProps {
  groupImage?: string
  channelID: string
  channelName: string
  type: ChannelListItem['type']
  onClose: () => void
}

export const RenameChannelModalContent = ({
  groupImage,
  channelID,
  channelName,
  type,
  onClose
}: RenameChannelModalContentProps) => {
  const methods = useForm<RenameChannelForm>({
    defaultValues: {
      channel_name: channelName
    }
  })
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors }
  } = methods
  const { updateDoc, loading: updatingDoc, error } = useFrappeUpdateDoc()

  const onSubmit = async (data: RenameChannelForm) => {
    return updateDoc('Raven Channel', channelID ?? null, {
      channel_name: data.channel_name
    }).then(() => {
      toast.success('Channel name updated')
      onClose()
    })
  }

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue('channel_name', event.target.value)
    },
    [setValue]
  )

  const isDesktop = useIsDesktop()

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog.Title>Đổi tên kênh</Dialog.Title>

        <Flex gap='2' direction='column' width='100%'>
          <ErrorBanner error={error} />
          <Box width='100%'>
            <Label htmlFor='channel_name' isRequired>
              Tên kênh
            </Label>
            <Controller
              name='channel_name'
              control={control}
              rules={{
                required: 'Vui lòng nhập tên kênh',
                maxLength: {
                  value: 50,
                  message: 'Tên kênh không được dài quá 50 ký tự.'
                },
                minLength: {
                  value: 3,
                  message: 'Tên kênh phải có ít nhất 3 ký tự.'
                }
              }}
              render={({ field, fieldState: { error } }) => (
                <TextField.Root
                  maxLength={50}
                  required
                  autoFocus={isDesktop}
                  placeholder='ví dụ: cuoi-hoi, team-thao-luan'
                  color={error ? 'red' : undefined}
                  {...field}
                  aria-invalid={error ? 'true' : 'false'}
                  onChange={handleChange}
                >
                  <TextField.Slot side='left'>{<ChannelIcon groupImage={groupImage} type={type} />}</TextField.Slot>
                  <TextField.Slot side='right'>
                    <Text size='2' weight='light' color='gray'>
                      {50 - field.value?.length}
                    </Text>
                  </TextField.Slot>
                </TextField.Root>
              )}
            />
            {errors?.channel_name && <ErrorText>{errors.channel_name?.message}</ErrorText>}
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
            {updatingDoc ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </Flex>
      </form>
    </FormProvider>
  )
}