import HeaderBackButton from '@components/common/Buttons/HeaderBackButton'
import ChannelRow from '@components/features/ConversationList/ChannelRow'
import ConversationList from '@components/features/ConversationList/ConversationList'
import DMListEmptyState from '@components/features/ConversationList/DMListEmptyState'
import DmRow from '@components/features/ConversationList/DMRow'
import { FilterItems } from '@components/features/FilterConversation/FilterList'
import { Divider } from '@components/layout/Divider'
import { useColorScheme } from '@hooks/useColorScheme'
import { useDoneMessages } from '@hooks/useDoneMessages'
import { LegendList } from '@legendapp/list'
import { Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, SafeAreaView, Text, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { FilterConversationType } from 'types/FilterConversationTypes'

type FilterItemKey = keyof typeof FilterItems;

const index = () => {
    const { colors } = useColorScheme();
    const { data, isLoading } = useDoneMessages();

    console.log(JSON.stringify(data, null, 2))

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center h-full">
                <ActivityIndicator />
            </View>
        )
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerStyle: { backgroundColor: colors.background },
                    headerLeft: () => <HeaderBackButton />,
                    title: "Đã xong",
                    headerTitle: () => {
                        return (
                            <Text className='text-base font-bold text-foreground'>
                                Đã xong
                            </Text>
                        )
                    }
                }}
            />
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={{ paddingBottom: 5 }}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1, backgroundColor: colors.background }}
                >
                    <LegendList
                        data={data ?? []}
                        renderItem={({ item }: any) => {
                            if (item.peer_user_id) {
                                return <DmRow dm={item} />
                            } else {
                                return <ChannelRow dm={item} />
                            }
                        }}
                        keyExtractor={(item) => item.name as string}
                        estimatedItemSize={68}
                        ItemSeparatorComponent={() => <Divider />}
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<DMListEmptyState />}
                    />
                </ScrollView>
            </SafeAreaView>
        </>
    )
}

export default index
