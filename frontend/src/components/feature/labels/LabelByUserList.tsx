import { Flex, Text } from '@radix-ui/themes'
import { LuAtSign } from 'react-icons/lu'
import { useLabelListValue } from './conversations/atoms/labelAtom'
import LabelItem from './LabelItem'

const LabelByUserList = () => {
  const labelList = useLabelListValue()
  return (
    <div className='space-y-2'>
      {labelList?.length === 0 ? (
        <Flex direction='column' align='center' justify='center' className='h-[320px] px-6 text-center'>
          <LuAtSign size={48} className='text-gray-8 mb-4' />
          <Text size='5' weight='medium' className='mb-2'>
            Chưa có nhãn nào
          </Text>
          <Text size='2' color='gray'>
            Bạn có thể tạo nhãn tại đây
          </Text>
        </Flex>
      ) : (
        labelList?.map((labelItem) => (
          <LabelItem
            channels={labelItem.channels}
            key={labelItem.label_id}
            label={labelItem.label}
            name={labelItem.label_id}
          />
        ))
      )}
    </div>
  )
}

export default LabelByUserList
