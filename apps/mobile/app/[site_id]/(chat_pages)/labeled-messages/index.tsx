import HeaderBackButton from "@components/common/Buttons/HeaderBackButton"
import { useColorScheme } from "@hooks/useColorScheme";
import { useLabeledMessages } from "@hooks/useLabeledMessages";
import { Stack } from "expo-router"
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LabeledItem from "./labeled-item";

const LabeledMessages = () => {
    const { colors } = useColorScheme();
    const { data, isLoading } = useLabeledMessages();

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
                    title: "Nhãn",
                    headerTitle: () => {
                        return (
                            <Text className='text-base font-bold text-foreground'>
                                Nhãn
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
                        data?.map(item => (
                            <LabeledItem key={item.label_id} data={item}/>
                        ))
                    }
                </ScrollView>
            </SafeAreaView>
        </>
    )
}

export default LabeledMessages
