import GroupIcon from '@assets/icons/Group.svg'
import UnreadCountBadge from "@components/common/Badge/UnreadCountBadge"
import { Text } from "@components/nativewindui/Text"
import { useColorScheme } from "@hooks/useColorScheme"
import useCurrentRavenUser from "@raven/lib/hooks/useCurrentRavenUser"
import dayjs from "dayjs"
import advancedFormat from 'dayjs/plugin/advancedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { Link } from "expo-router"
import { useMemo } from "react"
import { Pressable, View } from "react-native"
import { ChannelWithUnreadCount } from "./ConversationList"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advancedFormat)
dayjs.extend(relativeTime)

const ChannelRow = ({ dm }: { dm: ChannelWithUnreadCount }) => {

    const { myProfile } = useCurrentRavenUser()

    const { colors } = useColorScheme()

    const { lastMessageContent, isSentByUser } = useMemo(() => {
        let isSentByUser = false
        let lastMessageContent = ''
        if (dm.last_message_details) {
            try {
                const parsedDetails = JSON.parse(dm.last_message_details)
                isSentByUser = parsedDetails.owner === myProfile?.name
                lastMessageContent = parsedDetails.content?.trim() || ''
            } catch (e) {
                console.error('Error parsing last_message_details:', e)
            }
        }
        return { lastMessageContent, isSentByUser }
    }, [dm.last_message_details, myProfile?.name])

    const isUnread = dm.unread_count > 0

    return (
        <Link href={`../chat/${dm.name}`} asChild>
            <Pressable
                className='flex flex-row relative items-center gap-3 py-3 px-4 ios:active:bg-linkColor'
                android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}>
                {({ pressed, hovered }) => <>
                    <View
                        style={{
                            width: 7,
                            height: 7,
                            position: 'absolute',
                            left: 6,
                            top: 28,
                            borderRadius: '100%',
                            backgroundColor: isUnread ? colors.primary : 'transparent',
                        }}
                    />
                    <Text style={{ backgroundColor: getRandomRgba(), padding: 4, borderRadius: 4 }}>
                        <GroupIcon color={"#fff"} width={36} height={36}/>
                    </Text>
                    <View className='flex-1 flex-col overflow-hidden'>
                        <View className='flex flex-row justify-between items-center'>
                            <Text
                                className={'text-base font-medium text-foreground'}>
                                {dm.channel_name}
                            </Text>
                            {dm.last_message_timestamp ? (
                                <LastMessageTimestamp
                                    timestamp={dm.last_message_timestamp}
                                    isUnread={isUnread}
                                />
                            ) : null}
                        </View>
                        <View className='flex flex-row items-center gap-1 justify-between'>
                            <View
                                style={{ maxHeight: 30, maxWidth: dm.unread_count > 0 ? '90%' : '100%', }}
                                className='flex flex-row items-center gap-1'>
                                {isSentByUser ? <Text className='text-sm text-muted-foreground' style={{ fontWeight: isUnread ? '500' : '400' }}>You:</Text> : null}
                                <Text className='text-sm text-muted-foreground line-clamp-1'
                                    style={{ fontWeight: isUnread ? '500' : '400' }}>{lastMessageContent}</Text>
                            </View>
                            {dm.unread_count && dm.unread_count > 0 ? <UnreadCountBadge count={dm.unread_count} prominent /> : null}
                        </View>
                    </View>
                </>}
            </Pressable>
        </Link>
    )

}

interface LastMessageTimestampProps {
    timestamp: string
    isUnread?: boolean
}

const LastMessageTimestamp = ({ timestamp }: LastMessageTimestampProps) => {
    const displayTimestamp = useMemo(() => {

        if (!timestamp) {
            return ''
        }

        const dateObj = dayjs(timestamp)

        if (!dateObj.isValid()) {
            return timestamp
        }

        const today = dayjs()
        const yesterday = today.subtract(1, 'day')

        if (dateObj.isSame(today, 'day')) {
            // If the difference is less than 1 minute, show "Just now"
            if (Math.abs(dateObj.diff(today, 'minute')) < 1) {
                return 'just now'
            }
            if (Math.abs(dateObj.diff(today, 'hour')) < 1) {
                return dateObj.fromNow()
            }
            return dateObj.format('HH:mm')
        }

        if (dateObj.isSame(yesterday, 'day')) {
            return 'Yesterday'
        }

        if (dateObj.isSame(today, 'week')) {
            return dateObj.format('ddd')
        }

        if (dateObj.isSame(today, 'year')) {
            return dateObj.format('D MMM')
        }

        return dateObj.format('D MMM YYYY')
    }, [timestamp])

    return (
        <Text className='text-xs text-muted-foreground'>
            {displayTimestamp}
        </Text>
    )
}

export default ChannelRow

function getRandomRgba() {
    const r = 180 + Math.floor(Math.random() * 56);
    const g = 180 + Math.floor(Math.random() * 56);
    const b = 180 + Math.floor(Math.random() * 56);
    const a = 0.3 + Math.random() * 0.2;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}
