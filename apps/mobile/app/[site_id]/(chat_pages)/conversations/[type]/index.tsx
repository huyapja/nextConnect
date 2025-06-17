import HeaderBackButton from '@components/common/Buttons/HeaderBackButton'
import ConversationList from '@components/features/ConversationList/ConversationList'
import { FilterItems } from '@components/features/FilterConversation/FilterList'
import { useColorScheme } from '@hooks/useColorScheme'
import { Stack, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, Text } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { FilterConversationType } from 'types/FilterConversationTypes'

type FilterItemKey = keyof typeof FilterItems;

const index = () => {
    const { type } = useLocalSearchParams();
    const { colors } = useColorScheme();
    const filterItem = FilterItems[type as FilterItemKey];

    return (
        <>
            <Stack.Screen
                options={{
                    headerStyle: { backgroundColor: colors.background },
                    headerLeft: () => <HeaderBackButton />,
                    title: type as string,
                    headerTitle: () => {
                        return (
                            <>
                                {filterItem && (
                                    <Text className='text-base font-bold text-foreground'>
                                        { filterItem.title }
                                    </Text>
                                )}
                            </>
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
                    <ConversationList filter={type as string as FilterConversationType}/>
                </ScrollView>
            </SafeAreaView>
        </>
    )
}

export default index
