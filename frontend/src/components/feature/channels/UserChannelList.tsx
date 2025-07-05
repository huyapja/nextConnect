import { Loader } from '@/components/common/Loader'
import { UserAvatar } from '@/components/common/UserAvatar'
import { getErrorMessage } from '@/components/layout/AlertBanner/ErrorBanner'
import { useGetUser } from '@/hooks/useGetUser'
import { useChannelList } from '@/utils/channel/ChannelListProvider'
import { UserListContext } from '@/utils/users/UserListProvider'
import { Badge, Box, Flex, Text } from '@radix-ui/themes'
import clsx from 'clsx'
import { useFrappePostCall, useSWRConfig } from 'frappe-react-sdk'
import { useContext } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import ChannelItem from './ChannelItem'
import { useIsUserActive } from '@/hooks/useIsUserActive'
import { User } from '@/types/Core/User'
import { Channel } from '@/utils/textUtils/formatLastMessage'

const UserChannelList = () => {
  const { dm_channels } = useChannelList()
  const { enabledUsers: users } = useContext(UserListContext)

  // Phân chia DM channels thành 2 nhóm: có tin nhắn và chưa có tin nhắn
  const dmChannelsWithMessages = []
  const dmChannelsWithoutMessages = []

  for (const channel of dm_channels || []) {
    const peerUser = users?.find((u) => u.name === channel.peer_user_id)
    // Chỉ xử lý channels của users thông thường (không phải bot)
    if (peerUser?.enabled === 1 && peerUser?.type?.toLowerCase?.() !== 'bot') {
      // Kiểm tra xem channel có tin nhắn hay chưa
      const hasMessages =
        channel.last_message_details && channel.last_message_details !== 'null' && channel.last_message_timestamp

      if (hasMessages) {
        dmChannelsWithMessages.push(channel)
      } else {
        dmChannelsWithoutMessages.push(channel)
      }
    }
  }

  // Lấy danh sách users từ channels chưa có tin nhắn
  const usersFromEmptyChannels = dmChannelsWithoutMessages
    .map((channel) => {
      return users?.find((u) => u.name === channel.peer_user_id)
    })
    .filter(Boolean)

  // Lấy danh sách users hoàn toàn chưa có channel
  const peerIds = new Set(dm_channels?.map((c) => c.peer_user_id))
  const usersWithoutChannels = []
  for (const user of users || []) {
    const hasChannel = peerIds.has(user.name)
    const isBot = user.type?.toLowerCase?.() === 'bot'
    if (!hasChannel && !isBot) {
      usersWithoutChannels.push(user)
    }
  }

  // Gộp tất cả users chưa từng nhắn: users từ channels rỗng + users chưa có channel
  const allUsersWithoutMessages = [...usersFromEmptyChannels, ...usersWithoutChannels]

  // Xử lý Bot channels như cũ
  const botDmChannels = dm_channels?.filter((channel) => {
    const peerUser = users?.find((user) => user.name === channel.peer_user_id)
    return peerUser && peerUser.type?.toLowerCase() === 'bot'
  })

  const botUsersWithoutChannels = users?.filter((user) => user.type?.toLowerCase() === 'bot' && !peerIds.has(user.name))

  const bots = [...(botDmChannels ?? []), ...(botUsersWithoutChannels ?? [])]

  return (
    <div>
      <div>
        {/* Chỉ hiển thị DM channels đã có tin nhắn */}
        {dmChannelsWithMessages.map((channel) => (
          <ChannelItem
            key={channel.name}
            channelID={channel.name}
            channelName={channel.channel_name}
            peer_user_id={channel.peer_user_id}
          />
        ))}

        <br />

        {/* Hiển thị tất cả users chưa từng nhắn tin */}
        {allUsersWithoutMessages.length > 0 && <h5 className='text-sm mt-0 font-medium'>Những người chưa từng nhắn</h5>}
        {allUsersWithoutMessages.map((user) => user && <UserWithoutDMItem key={user.name} userID={user.name} />)}

        {/* Hiển thị bot */}
        {bots.length > 0 && (
          <>
            <h5 className={`text-sm ${allUsersWithoutMessages.length > 0 ? 'mt-5' : 'mt-0'} font-medium`}>Bot</h5>
            {bots.map((item) => (
              <BotItem key={item.name} item={item} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

const UserWithoutDMItem = ({ userID }: { userID: string }) => {
  // const { workspaceID } = useParams()
  // const user = useGetUser(userID)
  // const isActive = useIsUserActive(userID)
  // const navigate = useNavigate()

  // const { call, loading } = useFrappePostCall<{ message: string }>(
  //   'raven.api.raven_channel.create_direct_message_channel'
  // )

  // const { mutate } = useSWRConfig()

  // const onClick = () => {
  //   call({ user_id: userID })
  //     .then((res) => {
  //       mutate('channel_list')
  //       if (workspaceID) {
  //         navigate(`/${workspaceID}/${res?.message}`)
  //       } else {
  //         navigate(`/channel/${res?.message}`)
  //       }
  //     })
  //     .catch((err) => {
  //       toast.error('Không thể tạo được đoạn chat', {
  //         description: getErrorMessage(err)
  //       })
  //     })
  // }

  const { workspaceID } = useParams()
  const user = useGetUser(userID)
  const isActive = useIsUserActive(userID)
  const navigate = useNavigate()

  const onClick = () => {
    const draftChannelID = `_${userID}`

    if (workspaceID) {
      navigate(`/${workspaceID}/${draftChannelID}`)
    } else {
      navigate(`/channel/${draftChannelID}`)
    }
  }

  return (
    <Box
      onClick={onClick}
      className={clsx('w-full text-left p-2 rounded cursor-pointer', 'hover:bg-gray-100 dark:hover:bg-gray-700')}
    >
      <Flex width='100%' justify='between' align='center'>
        <Flex gap='2' align='center'>
          <Box className='relative'>
            <UserAvatar
              isActive={isActive}
              src={user?.user_image}
              isBot={user?.type === 'Bot'}
              alt={user?.full_name ?? userID}
              availabilityStatus={user?.availability_status}
            />
          </Box>

          <Text as='span' className={clsx('line-clamp-1 text-ellipsis', 'text-base md:text-sm xs:text-xs')}>
            {user?.full_name ?? userID}
          </Text>
        </Flex>

        {/* {loading ? <Loader /> : null} */}

        {!user?.enabled && (
          <Badge color='gray' variant='soft'>
            Disabled
          </Badge>
        )}
      </Flex>
    </Box>
  )
}

const BotItem = ({ item }: { item: any }) => {
  const { workspaceID } = useParams()
  const navigate = useNavigate()
  const { call, loading } = useFrappePostCall<{ message: string }>(
    'raven.api.raven_channel.create_direct_message_channel'
  )

  const isUser = !('channel_name' in item)
  const user = isUser ? (item as User) : undefined
  const channel = !isUser ? (item as Channel) : undefined

  const userID = isUser ? user!.name : channel!.peer_user_id
  const avatar = isUser ? user?.user_image : undefined
  const fullName = isUser ? user?.full_name : undefined

  const onClick = () => {
    if (channel) {
      // Đã có kênh → chuyển luôn
      if (workspaceID) {
        navigate(`/${workspaceID}/${channel.name}`)
      } else {
        navigate(`/channel/${channel.name}`)
      }
    } else {
      // Tạo kênh mới
      call({ user_id: userID })
        .then((res) => {
          if (workspaceID) {
            navigate(`/${workspaceID}/${res?.message}`)
          } else {
            navigate(`/channel/${res?.message}`)
          }
        })
        .catch((err) => {
          toast.error('Không thể tạo đoạn chat bot', {
            description: getErrorMessage(err)
          })
        })
    }
  }

  return (
    <Box
      onClick={onClick}
      className={clsx('w-full text-left p-2 rounded cursor-pointer', 'hover:bg-gray-100 dark:hover:bg-gray-700')}
    >
      <Flex width='100%' justify='between' align='center'>
        <Flex gap='2' align='center'>
          <Box className='relative'>
            <UserAvatar src={avatar} isBot alt={fullName ?? userID} />
          </Box>
          <Text as='span' className={clsx('line-clamp-1 text-ellipsis', 'text-base md:text-sm xs:text-xs')}>
            {fullName ?? userID}
          </Text>
        </Flex>
        {loading ? <Loader /> : null}
      </Flex>
    </Box>
  )
}

export default UserChannelList
