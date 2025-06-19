import { Link } from 'expo-router'
import { Pressable } from 'react-native'
import { ChanelLabeledMessage } from 'types/LabeledMessageType'

const ChannelRow = ({ row }: { row: ChanelLabeledMessage }) => {


    return (
        <Link href={`../chat/${row.channel_name}`} asChild>
            <Pressable
                // Use tailwind classes for layout and ios:active state
                className='flex-row items-center px-3 py-1.5 rounded-lg ios:active:bg-linkColor'
                // Add a subtle ripple effect on Android
                android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
            >
                <UserAvatar
                    src={user?.user_image ?? ""}
                    alt={user?.full_name ?? ""}
                    isActive={isActive}
                    availabilityStatus={user?.availability_status}
                    avatarProps={{ className: "w-8 h-8" }}
                    textProps={{ className: "text-sm font-medium" }}
                    isBot={user?.type === 'Bot'} />
                <Text style={styles.dmChannelText}>{user?.full_name}</Text>
            </Pressable>
        </Link>
    )
}

export default ChannelRow
