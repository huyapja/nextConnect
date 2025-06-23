import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Message } from '@raven/types/common/Message';
import { Sheet } from "@components/nativewindui/Sheet";
import { Text, TouchableOpacity, View } from "react-native";
import { useAtomValue } from "jotai";
import { quickReactionEmojisAtom } from "@lib/preferences";
import { router } from "expo-router";

const MessageActionsBottomSheet = (
    props: {
        labelActionsSheetRef: React.RefObject<any>,
        handleClose: () => void,
        label: any,
    }
) => {
    const { labelActionsSheetRef, handleClose, label } = props;
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

    const onDeleteLabel = () => {

    }

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
                                onPress={onAddConversation}
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
