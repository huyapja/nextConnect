import ConversationList from '@components/features/ConversationList/ConversationList';
import { useColorScheme } from '@hooks/useColorScheme';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

const Conversation = () => {
    const { colors } = useColorScheme();

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <ConversationList filter='all'/>
        </SafeAreaView>
    )
}

export default Conversation
