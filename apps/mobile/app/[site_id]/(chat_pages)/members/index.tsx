import HeaderBackButton from '@components/common/Buttons/HeaderBackButton'
import { useColorScheme } from '@hooks/useColorScheme'
import { Stack } from 'expo-router'
import { SafeAreaView, Text } from 'react-native'

const index = () => {
    const { colors } = useColorScheme();

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
            </SafeAreaView>
        </>
    )
}

export default index
