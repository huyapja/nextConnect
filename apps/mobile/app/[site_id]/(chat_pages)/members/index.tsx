import HeaderBackButton from '@components/common/Buttons/HeaderBackButton'
import { DMListRow } from '@components/features/channels/DMList/DMList'
import { useColorScheme } from '@hooks/useColorScheme'
import { useGetCurrentWorkspace } from '@hooks/useGetCurrentWorkspace'
import useUnreadMessageCount from '@hooks/useUnreadMessageCount'
import { useGetChannelUnreadCounts } from '@raven/lib/hooks/useGetChannelUnreadCounts'
import { ChannelListContext, ChannelListContextType } from '@raven/lib/providers/ChannelListProvider'
import { Stack } from 'expo-router'
import { useContext, useMemo } from 'react'
import { SafeAreaView, ScrollView, Text } from 'react-native'

const index = () => {
    const { colors } = useColorScheme();
    const { workspace } = useGetCurrentWorkspace()
    const { channels, dm_channels } = useContext(ChannelListContext) as ChannelListContextType
    const { unread_count } = useUnreadMessageCount()

    const workspaceChannels = useMemo(() => {
        return channels.filter((channel) => channel.workspace === workspace)
    }, [channels, workspace])
    const { readDMs } = useGetChannelUnreadCounts({
        channels: workspaceChannels,
        dm_channels,
        unread_count: unread_count?.message
    })

    return (
        <>
            <Stack.Screen
                options={{
                    headerStyle: { backgroundColor: colors.background },
                    headerLeft: () => <HeaderBackButton />,
                    title: "Thành viên",
                    headerTitle: () => {
                        return (
                            <Text className='text-base font-bold text-foreground'>
                                Thành viên
                            </Text>
                        )
                    }
                }}
            />
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={{ paddingBottom: 5 }}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1, backgroundColor: colors.background, paddingTop: 20 }}
                >
                    {
                        readDMs.map(dm => (
                            <DMListRow key={dm.name} dm={dm} />
                        ))
                    }
                </ScrollView>
            </SafeAreaView>
        </>
    )
}

export default index
