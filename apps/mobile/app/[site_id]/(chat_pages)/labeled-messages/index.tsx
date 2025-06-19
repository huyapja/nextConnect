import HeaderBackButton from "@components/common/Buttons/HeaderBackButton"
import { useColorScheme } from "@hooks/useColorScheme";
import { useLabeledMessages } from "@hooks/useLabeledMessages";
import { Stack } from "expo-router"
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LabeledItem from "./labeled-item";

const styles = StyleSheet.create({
    container: {
        padding: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    headerText: {
        fontWeight: '600',
        fontSize: 16,
    },
    dmChannelText: {
        marginLeft: 12,
        fontSize: 16,
    },
})

const LabeledMessages = () => {
    const { colors } = useColorScheme();
    const { data, isLoading } = useLabeledMessages();
    console.log("data", data)
    console.log("isLoading", isLoading)

    return (
        <>
            <Stack.Screen
                options={{
                    headerStyle: { backgroundColor: colors.background },
                    headerLeft: () => <HeaderBackButton />,
                    headerRight: () => <Text>Thêm nhãn</Text>,
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
