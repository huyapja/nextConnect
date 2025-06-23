import HeaderBackButton from "@components/common/Buttons/HeaderBackButton";
import MessageActionsBottomSheet from "@components/features/label/LabelActions";
import { useSheetRef } from "@components/nativewindui/Sheet";
import { useColorScheme } from "@hooks/useColorScheme";
import { useLabeledMessages } from "@hooks/useLabeledMessages";
import { selectedLabelAtom } from "@lib/LabelActions";
import { router, Stack } from "expo-router";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { ActivityIndicator, Keyboard, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LabeledMessageItem } from "types/LabeledMessageType";
import LabeledItem from "./labeled-item";

const LabeledMessages = () => {
    const { colors } = useColorScheme();
    const { data, isLoading } = useLabeledMessages();
    const label = useAtomValue(selectedLabelAtom);
    const labelActionsSheetRef = useSheetRef();
    const setSelectedLabel = useSetAtom(selectedLabelAtom);

    useEffect(() => {
        if (!label) {
            labelActionsSheetRef.current?.dismiss()
        }
    }, [label])

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center h-full">
                <ActivityIndicator />
            </View>
        )
    }

    const onAddStatus = () => {
        setSelectedLabel(null);
        router.push('./add-label', {
            relativeToDirectory: true
        })
    }

    const handleLongPress = (label: LabeledMessageItem | null) => {
        if (label) {
            Keyboard.dismiss()
            labelActionsSheetRef.current?.present()
            setSelectedLabel(label);
            labelActionsSheetRef.current?.present()
        }
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
                            <LabeledItem
                                key={item.label_id}
                                data={item}
                                onLongPress={(label) => handleLongPress(label)}
                            />
                        ))
                    }
                    <View className='py-2.5 px-4'>
                        <TouchableOpacity
                            onPress={onAddStatus}
                            className='items-center py-2 bg-background dark:bg-card rounded-xl justify-between'
                        >
                            <Text className='text-base font-medium text-primary'>Thêm nhãn</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
            <MessageActionsBottomSheet
                handleClose={() => labelActionsSheetRef.current?.dismiss()}
                label={label}
                labelActionsSheetRef={labelActionsSheetRef}
            />
        </>
    )
}

export default LabeledMessages
