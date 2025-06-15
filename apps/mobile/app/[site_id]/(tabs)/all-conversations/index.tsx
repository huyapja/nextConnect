import ConversationList from '@components/features/ConversationList/ConversationList';
import { useColorScheme } from '@hooks/useColorScheme';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

const Conversation = () => {
    const { colors } = useColorScheme();

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 5 }}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1, backgroundColor: colors.background }}
            >
                <ConversationList filter='all'/>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Conversation
