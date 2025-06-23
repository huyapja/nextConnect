import { Sheet } from "@components/nativewindui/Sheet";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useColorScheme } from "@hooks/useColorScheme";
import { useLabeledMessages } from "@hooks/useLabeledMessages";
import { selectedLabelAtom } from "@lib/LabelActions";
import { router } from "expo-router";
import { useFrappePostCall } from "frappe-react-sdk";
import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { toast } from "sonner-native";
import { LabeledMessageItem } from "types/LabeledMessageType";

const MessageActionsBottomSheet = (
    props: {
        labelActionsSheetRef: React.RefObject<any>,
        handleClose: () => void,
        label: LabeledMessageItem | null,
    }
) => {
    const { colors } = useColorScheme()
    const { labelActionsSheetRef, handleClose, label } = props;
    const setSelectedLabel = useSetAtom(selectedLabelAtom);
    const { refetch } = useLabeledMessages();
    const { call: deleteLabel, loading: isLoading } = useFrappePostCall('raven.api.user_label.delete_label')
    const onAddConversation = () => {
        router.push('./add-conversation', {
            relativeToDirectory: true
        })
    }
    const onUpdateLabel = () => {
        router.push('./add-label', {
            relativeToDirectory: true,
        })
        handleClose();
    }

    const onSubmitDelete = async () => {
        const loading = toast.loading("Đang xoá nhãn")
        try {
            await deleteLabel({ label_id: label?.label_id });
            refetch();
            toast.dismiss(loading);
            toast.success("Đã xoá nhãn")
        } catch (error) {
            toast.dismiss(loading);
            toast.error("Xoá nhãn thất bại, vui lòng thử lại")
        } finally {
            handleClose();
        }
    }

    const onDeleteLabel = () => {
        Alert.alert('Xoá nhãn?', `Bạn chắc chắn muốn xoán nhãn "${label?.label}" không?.`, [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Xoá', style: 'destructive', onPress: onSubmitDelete },
        ])
    }

    useEffect(() => {
        return () => {
            setSelectedLabel(null)
        }
    }, [])

    return (
        <Sheet ref={labelActionsSheetRef} snapPoints={['60%']} onDismiss={handleClose}>
            <BottomSheetView>
                <View className="flex-col px-4 mt-2 pb-16">
                    {label && (
                        <View className='py-2.5 px-0 flex flex-col gap-3'>
                            <TouchableOpacity
                                onPress={() => {
                                    onAddConversation();
                                    handleClose();
                                }}
                                className='py-2 bg-background dark:bg-card rounded-xl justify-between'
                            >
                                <Text className='text-base px-4 font-medium text-primary'>Thêm cuộc trò chuyện</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onUpdateLabel}
                                className='py-2 bg-background dark:bg-card rounded-xl justify-between'
                            >
                                <Text className='text-base px-4 font-medium text-primary'>Sửa tên nhãn</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onDeleteLabel}
                                className='py-2 bg-background dark:bg-card rounded-xl justify-between'
                            >
                                <Text className='text-base px-4 font-medium text-red-600'>Xoá nhãn</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </BottomSheetView>
        </Sheet>
    )
}

export default MessageActionsBottomSheet
