import { ErrorText, Label } from '@/components/common/Form'
import { ErrorBanner, getErrorMessage } from '@/components/layout/AlertBanner/ErrorBanner'
import { RavenPoll } from '@/types/RavenMessaging/RavenPoll'
import { Box, Button, Checkbox, Dialog, Flex, IconButton, Text, TextArea, TextField } from '@radix-ui/themes'
import { useFrappePostCall } from 'frappe-react-sdk'
import { Controller, FormProvider, useFieldArray, useForm } from 'react-hook-form'
import { BiPlus, BiTrash } from 'react-icons/bi'
import { toast } from 'sonner'

const CreatePollContent = ({ channelID, setIsOpen }: { channelID: string; setIsOpen: (open: boolean) => void }) => {
  const methods = useForm<RavenPoll>({
    // Initialize the form with 2 option fields by default
    defaultValues: {
      options: [
        {
          name: '',
          creation: '',
          modified: '',
          owner: '',
          modified_by: '',
          docstatus: 0,
          option: ''
        },
        {
          name: '',
          creation: '',
          modified: '',
          owner: '',
          modified_by: '',
          docstatus: 0,
          option: ''
        }
      ]
    }
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset: resetForm
  } = methods

  const { fields, remove, append } = useFieldArray({
    control: control,
    name: 'options'
  })

  const handleAddOption = () => {
    // limit the number of options to 10
    if (fields?.length >= 10) {
      return
    } else {
      append({
        name: '',
        creation: '',
        modified: '',
        owner: '',
        modified_by: '',
        docstatus: 0,
        option: ''
      })
    }
  }

  const handleRemoveOption = (index: number) => {
    // Do not remove the last 2 options
    if (fields?.length === 2) {
      return
    }
    remove(index)
  }

  const reset = () => {
    resetForm()
  }

  const onClose = () => {
    setIsOpen(false)
    reset()
  }

  const { call: createPoll, error } = useFrappePostCall('raven.api.raven_poll.create_poll')

  const onSubmit = async (data: RavenPoll) => {
    return createPoll({
      ...data,
      channel_id: channelID
    })
      .then(() => {
        toast.success('Cuộc bình chọn đã được tạo')
        onClose()
      })
      .catch((err) => {
        toast.error('Có lỗi xảy ra.', {
          description: getErrorMessage(err)
        })
      })
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Flex direction='column' gap='4' py='2'>
          <ErrorBanner error={error} />

          <Box>
            <Label htmlFor='question' isRequired>
              Câu hỏi
            </Label>
            <TextArea
              {...register('question', {
                required: 'Câu hỏi là bắt buộc',
                maxLength: {
                  value: 255,
                  message: 'Câu hỏi không được vượt quá 255 ký tự'
                },
                validate: (value) => {
                  if (!value || !value.trim()) {
                    return 'Vui lòng nhập câu hỏi hợp lệ, không được để trống hoặc chỉ có dấu cách'
                  }
                  return true
                }
              })}
              placeholder='Đặt câu hỏi để thu thập ý kiến'
              required
              maxLength={255}
            />
            {errors?.question && <ErrorText>{errors.question?.message}</ErrorText>}
          </Box>

          <Box>
            <Label htmlFor='options' isRequired>
              Lựa chọn
            </Label>
            <Flex direction={'column'} gap='2'>
              {fields &&
                fields?.map((field, index) => (
                  <Flex key={field.id} gap='2' align={'start'}>
                    <div className={'w-full'}>
                      <TextField.Root
                        placeholder={`Lựa chọn ${index + 1}`}
                        {...register(`options.${index}.option`, {
                          required: 'Lựa chọn là bắt buộc',
                          minLength: {
                            value: 1,
                            message: 'Lựa chọn không được để trống'
                          },
                          maxLength: {
                            value: 255,
                            message: 'Lựa chọn không được vượt quá 255 ký tự'
                          },
                          validate: (value) => {
                            if (!value || !value.trim()) {
                              return 'Vui lòng nhập lựa chọn hợp lệ, không được để trống hoặc chỉ có dấu cách'
                            }
                            return true
                          }
                        })}
                        maxLength={255}
                      ></TextField.Root>
                      {errors?.options?.[index]?.option && (
                        <ErrorText>{errors.options?.[index]?.option?.message}</ErrorText>
                      )}
                    </div>
                    <IconButton
                      mt='2'
                      disabled={fields?.length === 2}
                      color='red'
                      aria-label='delete'
                      variant={'ghost'}
                      size={'1'}
                      title='Xóa lựa chọn'
                      onClick={() => handleRemoveOption(index)}
                    >
                      <BiTrash size={'12'} />
                    </IconButton>
                  </Flex>
                ))}

              <Flex justify={'between'} align={'center'}>
                <Button
                  disabled={fields?.length >= 10}
                  type='button'
                  size={'1'}
                  variant='ghost'
                  style={{ width: 'fit-content' }}
                  onClick={handleAddOption}
                >
                  <BiPlus size={'14'} />
                  Thêm lựa chọn
                </Button>
                <Text size='1' className='text-gray-500'>
                  Tối đa 10 lựa chọn
                </Text>
              </Flex>
            </Flex>
          </Box>

          <Box>
            <Label>Cài đặt</Label>
            <Flex direction={'column'} gap='2'>
              <Text as='label' size='2'>
                <Flex gap='2' align='center'>
                  <Controller
                    name={'is_multi_choice'}
                    control={control}
                    render={({ field: { onChange, ...f } }) => (
                      <Checkbox {...f} onCheckedChange={(v) => onChange(v ? 1 : 0)} />
                    )}
                  />
                  Cho phép người dùng chọn nhiều lựa chọn
                </Flex>
              </Text>

              <Text as='label' size='2'>
                <Flex gap='2' align='center'>
                  <Controller
                    name='is_anonymous'
                    control={control}
                    render={({ field: { onChange, ...f } }) => (
                      <Checkbox {...f} onCheckedChange={(v) => onChange(v ? 1 : 0)} />
                    )}
                  />
                  Cuộc bình chọn ẩn danh
                </Flex>
              </Text>
            </Flex>
          </Box>

          <Flex gap='3' mt='4' justify='end'>
            <Dialog.Close>
              <Button variant='soft' color='gray' onClick={onClose}>
                Hủy
              </Button>
            </Dialog.Close>
            <Button type='submit'>Tạo cuộc bình chọn</Button>
          </Flex>
        </Flex>
      </form>
    </FormProvider>
  )
}

export default CreatePollContent