import { useColorScheme } from '@hooks/useColorScheme'
import { Stack } from 'expo-router';
import React from 'react'
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'

const Conversation = () => {
    const { colors } = useColorScheme();

    return (
        <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen
                name='index'
                options={{
                    title: 'Lọc hội thoại',
                    headerShown: true,
                    headerTitle: () => (
                        <Text className='font-bold text-xl'>Lọc hội thoại</Text>
                    )
                }}
            />
        </Stack>
    )
}

export default Conversation
