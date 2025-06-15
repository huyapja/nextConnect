import { useColorScheme } from '@hooks/useColorScheme'
import { Stack } from 'expo-router';
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

const Conversation = () => {
    const { colors } = useColorScheme();

    return (
        <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen
                name='index'
                options={{
                    title: 'Lọc hội thoại',
                    headerShown: false,
                }}
            />
        </Stack>
    )
}

export default Conversation
