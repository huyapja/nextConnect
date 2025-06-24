import FilterList from '@components/features/FilterConversation/FilterList';
import { useColorScheme } from '@hooks/useColorScheme'
import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'

const Conversation = () => {
    const { colors } = useColorScheme();

    return (
        <>
            <View/>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 5 }}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1, backgroundColor: colors.background }}
            >
                <FilterList/>
            </ScrollView>
        </>
    )
}

export default Conversation
