/* eslint-disable no-constant-binary-expression */
import { ErrorText, HelperText, Label } from '@/components/common/Form'
import { Loader } from '@/components/common/Loader'
import { ErrorBanner } from '@/components/layout/AlertBanner/ErrorBanner'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/layout/Drawer'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { DIALOG_CONTENT_CLASS } from '@/utils/layout/dialog'
import { __ } from '@/utils/translations'
import { Box, Button, Dialog, Flex, IconButton, RadioGroup, Text, TextArea, TextField } from '@radix-ui/themes'
import { useFrappeCreateDoc, useFrappeGetCall, useSWRConfig } from 'frappe-react-sdk'
import { ChangeEvent, useCallback, useMemo, useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { BiLockAlt } from 'react-icons/bi'
import { FiPlus } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

interface ChannelCreationForm {
  channel_name: string
  channel_description: string
  // type: 'Public' | 'Private' | 'Open'
  type: 'Private'
}

export const CreateChannelButton = () => {
  const [isOpen, setIsOpen] = useState(false)

  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Trigger>
          <IconButton
            variant='soft'
            size='1'
            radius='large'
            color='gray'
            aria-label='Tạo nhóm chat'
            title='Tạo nhóm chat'
            className='transition-all ease-ease text-gray-10 bg-transparent hover:bg-gray-3 hover:text-gray-12 cursor-pointer'
          >
            <FiPlus size='16' />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content className={DIALOG_CONTENT_CLASS}>
          <CreateChannelContent isOpen={isOpen} setIsOpen={setIsOpen} />
        </Dialog.Content>
      </Dialog.Root>
    )
  } else {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <IconButton
            variant='soft'
            size='1'
            radius='large'
            color='gray'
            aria-label='Tạo nhóm chat'
            title='Tạo nhóm chat'
            className='transition-all ease-ease text-gray-10 bg-transparent hover:bg-gray-3 hover:text-gray-12'
          >
            <FiPlus size='16' />
          </IconButton>
        </DrawerTrigger>
        <DrawerContent>
          <div className='pb-16 overflow-y-scroll min-h-96'>
            <CreateChannelContent isOpen={isOpen} setIsOpen={setIsOpen} />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }
}

const CreateChannelContent = ({ isOpen, setIsOpen }: { setIsOpen: (v: boolean) => void; isOpen: boolean }) => {
  const { workspaceID } = useParams()

  // const { data: canCreateChannel } = useFrappeGetCall<{ message: boolean }>(
  //   'raven.api.workspaces.can_create_channel',
  //   { workspace: workspaceID },
  //   workspaceID ? undefined : null
  // )

  // console.log(canCreateChannel);

  const { mutate } = useSWRConfig()
  const navigate = useNavigate()
  const methods = useForm<ChannelCreationForm>({
    defaultValues: {
      type: 'Private',
      channel_name: '',
      channel_description: ''
    }
  })
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    control,
    setValue,
    reset: resetForm
  } = methods

  const {
    createDoc,
    error: channelCreationError,
    loading: creatingChannel,
    reset: resetCreateHook
  } = useFrappeCreateDoc()

  const onClose = (channel_name?: string, workspace?: string) => {
    if (channel_name) {
      // Update channel list when name is provided.
      // Also navigate to new channel
      navigate(`/${workspace}/${channel_name}`)
      mutate(['channel_members', channel_name])
    }
    setIsOpen(false)

    reset()
  }

  const reset = () => {
    resetCreateHook()
    resetForm()
  }
  const channelType = watch('type')

  const onSubmit = (data: ChannelCreationForm) => {
    const cleanName = data.channel_name.trim()

    createDoc('Raven Channel', {
      ...data,
      channel_name: cleanName,
      workspace: workspaceID
    }).then((result) => {
      if (result) {
        mutate(
          'channel_list',
          (data: { message: { channels: any } }) => {
            return {
              message: {
                ...data.message,
                channels: [
                  ...data.message.channels,
                  {
                    ...result
                  }
                ]
              }
            }
          },
          {
            revalidate: false
          }
        )
        toast.success(__('Channel created'))
        onClose(result.name, workspaceID)
      }
    })
  }

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue('channel_name', event.target.value)
    },
    [setValue]
  )
  const { channelIcon, header, helperText } = useMemo(() => {
    switch (channelType) {
      case 'Private':
        return {
          channelIcon: <BiLockAlt />,
          header: __('Tạo nhóm'),
          helperText: __(
            'Kênh là nơi nhóm của bạn trao đổi và giao tiếp. Việc tổ chức các kênh theo chủ đề — ví dụ như #Development — sẽ mang lại hiệu quả tốt nhất.'
          )
        }
    }
  }, [channelType])

  const isDesktop = useIsDesktop()

  return (
    <div>
      <Dialog.Title>{header}</Dialog.Title>
      <Dialog.Description size='2'>
        {__(
          'Kênh là nơi nhóm của bạn trao đổi và giao tiếp. Việc tổ chức các kênh theo chủ đề — ví dụ như #Development — sẽ mang lại hiệu quả tốt nhất.'
        )}
      </Dialog.Description>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Flex direction='column' gap='4' py='4'>
            {/* {!canCreateChannel?.message && (
              <CustomCallout
                iconChildren={<BiInfoCircle size='18' />}
                rootProps={{ color: 'yellow', variant: 'surface' }}
                textChildren={
                  <Text>
                    You cannot create a new channel since you are not an admin of this workspace. Ask an admin to create
                    a channel or make you an admin.
                  </Text>
                }
              />
            )} */}
            <ErrorBanner error={channelCreationError} />
            <Box>
              <Label htmlFor='channel_name' isRequired>
                {__('Tiêu đề')}
              </Label>
              <Controller
                name='channel_name'
                control={control}
                rules={{
                  required: __('Please add a channel name'),
                  maxLength: {
                    value: 50,
                    message: __('Channel name cannot be more than {0} characters.', ['50'])
                  },
                  minLength: {
                    value: 3,
                    message: __('Channel name cannot be less than {0} characters.', ['3'])
                  }
                }}
                render={({ field, fieldState: { error } }) => (
                  <TextField.Root
                    maxLength={50}
                    required
                    autoFocus={isDesktop}
                    placeholder='e.g. NextConnect, NextGrp'
                    color={error ? 'red' : undefined}
                    {...field}
                    aria-invalid={error ? 'true' : 'false'}
                    onChange={handleNameChange}
                  >
                    <TextField.Slot side='left'>{channelIcon}</TextField.Slot>
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

            <Box>
              <Label htmlFor='channel_description'>
                {__('Mô tả')}{' '}
                <Text as='span' weight='light'>
                  ({__('Tùy chọn')})
                </Text>
              </Label>
              <TextArea
                maxLength={140}
                id='channel_description'
                placeholder='Kênh để thảo luận công việc'
                {...register('channel_description', {
                  maxLength: {
                    value: 140,
                    message: __('Channel description cannot be more than {0} characters.', ['140'])
                  }
                })}
                aria-invalid={errors.channel_description ? 'true' : 'false'}
              />
              <HelperText>Kênh này nói về nội dung gì?</HelperText>
              {errors?.channel_description && <ErrorText>{errors.channel_description?.message}</ErrorText>}
            </Box>
            {/* Ẩn phần chọn Channel Type, chỉ comment lại để dùng sau */}
            {false && (
              <Flex gap='2' direction='column'>
                <Label htmlFor='channel_type'>Channel Type</Label>
                <Controller
                  name='type'
                  control={control}
                  render={({ field }) => (
                    <RadioGroup.Root
                      defaultValue='1'
                      variant='soft'
                      id='channel_type'
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <Flex gap='4'>
                        <Text as='label' size='2'>
                          <Flex gap='2'>
                            <RadioGroup.Item value='Public' /> {__('Public')}
                          </Flex>
                        </Text>
                        <Text as='label' size='2'>
                          <Flex gap='2'>
                            <RadioGroup.Item value='Private' /> {__('Private')}
                          </Flex>
                        </Text>
                        <Text as='label' size='2'>
                          <Flex gap='2'>
                            <RadioGroup.Item value='Open' /> {__('Open')}
                          </Flex>
                        </Text>
                      </Flex>
                    </RadioGroup.Root>
                  )}
                />
                {/* Added min height to avoid layout shift when two lines of text are shown */}
                <HelperText className='min-h-[3rem]'>{helperText}</HelperText>
              </Flex>
            )}
          </Flex>
          <Flex gap='3' mt='4' justify='end'>
            <Dialog.Close disabled={creatingChannel}>
              <Button variant='soft' color='gray'>
                {__('Hủy')}
              </Button>
            </Dialog.Close>
            <Button type='submit'>
              {creatingChannel && <Loader className='text-white' />}
              {creatingChannel ? __('Đang lưu') : __('Lưu')}
            </Button>
          </Flex>
        </form>
      </FormProvider>
    </div>
  )
}
