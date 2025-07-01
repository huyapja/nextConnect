import { ErrorCallout } from '@/components/common/Callouts/ErrorCallouts'
import { Stack } from '@/components/layout/Stack'
import { Badge, Button, Flex, Heading, IconButton, Link, Text } from '@radix-ui/themes'
import clsx from 'clsx'
import { FrappeConfig, FrappeContext, useFrappeEventListener } from 'frappe-react-sdk'
import { useContext, useEffect, useState } from 'react'
import { LuRefreshCcw } from 'react-icons/lu'
import { TbReportAnalytics } from 'react-icons/tb'

const SocketIOHealth = () => {
  const { socket } = useContext(FrappeContext) as FrappeConfig

  const [loading, setLoading] = useState<boolean>(true)
  const [socketPingTest, setSocketPingTest] = useState('Fail')
  const [socketTransportMode, setSocketTransportMode] = useState<string | undefined>('')
  
  // Thêm state để test realtime events
  const [realtimeEventTest, setRealtimeEventTest] = useState<string>('Chưa kiểm tra')
  const [lastEventReceived, setLastEventReceived] = useState<string>('')

  useFrappeEventListener('pong', () => {
    setSocketPingTest('Pass')
    setLoading(false)
    setSocketTransportMode(socket?.io.engine.transport.name)
  })

  // Test event listeners cho message events
  useFrappeEventListener('message_created', (event) => {
    setRealtimeEventTest('Hoạt động')
    setLastEventReceived(`message_created từ channel: ${event.channel_id} lúc ${new Date().toLocaleTimeString()}`)
    console.log('🔔 SocketIOHealth: message_created event received:', event)
  })

  useFrappeEventListener('message_edited', (event) => {
    setRealtimeEventTest('Hoạt động')
    setLastEventReceived(`message_edited từ channel: ${event.channel_id} lúc ${new Date().toLocaleTimeString()}`)
    console.log('🔔 SocketIOHealth: message_edited event received:', event)
  })

  useFrappeEventListener('message_deleted', (event) => {
    setRealtimeEventTest('Hoạt động')
    setLastEventReceived(`message_deleted từ channel: ${event.channel_id} lúc ${new Date().toLocaleTimeString()}`)
    console.log('🔔 SocketIOHealth: message_deleted event received:', event)
  })

  const onPingCheck = () => {
    setLoading(true)
    socket?.emit('ping')
    setTimeout(() => {
      setLoading(false)
      setSocketTransportMode((s) => {
        if (!s) {
          return ''
        }
        return s
      })
    }, 5000)
  }

  const resetRealtimeTest = () => {
    setRealtimeEventTest('Chưa kiểm tra')
    setLastEventReceived('')
  }

  useEffect(() => {
    setTimeout(onPingCheck, 5000)
  }, [])

  return (
    <Stack>
      <Heading as='h3' size='3' className='not-cal font-semibold'>
        Kiểm Tra Kết Nối Thời Gian Thực
      </Heading>
      <Text size='2' color='gray'>
        Nếu tin nhắn trên Raven không hiển thị theo thời gian thực, bạn có thể kiểm tra kết nối mạng tại đây.
      </Text>
      {!loading && socketPingTest === 'Fail' && (
        <ErrorCallout message='Kết nối thời gian thực đang không hoạt động. Tin nhắn sẽ không được cập nhật tự động.' />
      )}
      
      {/* Socket Ping Test */}
      <Flex gap='3' align='center' pt='2'>
        <Text size='2' color='gray' as='span'>
          Kiểm tra Ping thời gian thực:
        </Text>
        <Flex align='center' gap='2'>
          <Badge color={loading ? 'gray' : socketPingTest === 'Pass' ? 'green' : 'red'}>
            {loading ? 'Đang tải...' : socketPingTest}
          </Badge>
          {!loading && (
            <IconButton
              title='Gửi ping'
              aria-label='gửi ping'
              color='gray'
              size='1'
              variant='ghost'
              onClick={onPingCheck}
            >
              <LuRefreshCcw className={clsx(loading ? 'animate-spin' : null)} size={12} />
            </IconButton>
          )}
        </Flex>
      </Flex>

      {/* Realtime Message Events Test */}
      <Flex gap='3' align='center' pt='2'>
        <Text size='2' color='gray' as='span'>
          Kiểm tra Events Tin nhắn:
        </Text>
        <Flex align='center' gap='2'>
          <Badge 
            color={
              realtimeEventTest === 'Hoạt động' ? 'green' : 
              realtimeEventTest === 'Chưa kiểm tra' ? 'gray' : 'red'
            }
          >
            {realtimeEventTest}
          </Badge>
          <Button
            size='1'
            variant='soft'
            onClick={resetRealtimeTest}
          >
            Reset
          </Button>
        </Flex>
      </Flex>

      {/* Last Event Info */}
      {lastEventReceived && (
        <Flex gap='2' align='center'>
          <Text size='2' color='gray' as='span'>
            Event cuối:
          </Text>
          <Text size='2' color='blue' className='font-mono'>
            {lastEventReceived}
          </Text>
        </Flex>
      )}

      {socketTransportMode && (
        <Flex gap='2' align='center'>
          <Text size='2' color='gray' as='span'>
            Giao Thức Kết Nối SocketIO:
          </Text>
          <Badge color='orange'>{socketTransportMode}</Badge>
        </Flex>
      )}

      <div className='pt-2'>
        <Text size='2' color='gray' className='block mb-2'>
          💡 <strong>Hướng dẫn test:</strong> Gửi tin nhắn trong channel khác hoặc edit/delete tin nhắn để xem events
        </Text>
        <Link
          underline='always'
          size='2'
          target='_blank'
          title='Báo cáo tình trạng hệ thống'
          href='/app/system-health-report'
        >
          <TbReportAnalytics size='16' className='-mb-0.5 pr-1' />
          Xem Báo Cáo Tình Trạng Hệ Thống
        </Link>
      </div>
    </Stack>
  )
}

export default SocketIOHealth
