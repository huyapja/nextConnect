import GroupIcon from '@assets/icons/Group.svg'
import UserAvatar from '@components/layout/UserAvatar'
import { useIsUserActive } from '@hooks/useIsUserActive'
import useCurrentRavenUser from '@raven/lib/hooks/useCurrentRavenUser'
import { useGetUser } from '@raven/lib/hooks/useGetUser'
import { replaceCurrentUserFromDMChannelName } from "@raven/lib/utils/operations"
import { Link } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { ChanelLabeledMessage } from 'types/LabeledMessageType'
import { getRandomRgba } from 'utils/functions'

const styles = StyleSheet.create({
    container: {
        padding: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    headerText: {
        fontWeight: '600',
        fontSize: 16,
    },
    dmChannelText: {
        marginLeft: 12,
        fontSize: 16,
    },
})

const ChannelRow = ({ row }: { row: ChanelLabeledMessage }) => {
    const isDM = row.is_direct_message;
    const { myProfile: currentUserInfo } = useCurrentRavenUser();

    const userId = useMemo(() => {
        if (row.is_direct_message) {
            return replaceCurrentUserFromDMChannelName(row.channel_name, currentUserInfo?.name ?? "");
        }
    }, [row, currentUserInfo])

    const user = useGetUser(userId);
    const isActive = useIsUserActive(userId);

    return (
        <Link href={`../chat/${row.channel_id}`} asChild>
            <Pressable
                className='flex-row items-center px-3 py-1.5 rounded-lg ios:active:bg-linkColor'
                android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
            >
                {
                    user ? (
                        <>
                            <UserAvatar
                                src={user?.user_image ?? ""}
                                alt={user?.full_name ?? ""}
                                isActive={isActive}
                                availabilityStatus={user?.availability_status}
                                avatarProps={{ className: "w-8 h-8" }}
                                textProps={{ className: "text-sm font-medium" }}
                                isBot={user?.type === 'Bot'} />
                            <Text className='text-foreground' style={styles.dmChannelText}>{user?.full_name}</Text>
                        </>
                    ) : !isDM ? (
                        <>
                            <Text style={{ backgroundColor: getRandomRgba(), padding: 4, borderRadius: 4 }}>
                                <GroupIcon color={"#fff"} width={24} height={24}/>
                            </Text>
                            <Text className='text-foreground' style={styles.dmChannelText}>{row.channel_name}</Text>
                        </>
                    ) : null
                }
            </Pressable>
        </Link>
    )
}

export default ChannelRow
