import TrashIcon from "@assets/icons/TrashIcon.svg"
import { Button } from "@components/nativewindui/Button"
import { useLabeledMessages } from "@hooks/useLabeledMessages"
import { COLORS } from '@theme/colors'
import { useFrappePostCall } from "frappe-react-sdk"
import { ActivityIndicator, Alert } from "react-native"
import Reanimated, { SharedValue, useAnimatedStyle } from "react-native-reanimated"
import { toast } from "sonner-native"
import { LabeledMessageItem } from "types/LabeledMessageType"

function RightAction(prog: SharedValue<number>, drag: SharedValue<number>, label: LabeledMessageItem, channel: any) {
    const { refetch } = useLabeledMessages();
    const { call, loading } = useFrappePostCall( 'raven.api.user_channel_label.remove_channel_from_label');
    const styleAnimation = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: drag.value + 70 }],
        }
    })

    const deleteConversation = async () => {
        console.log("channel", label.label_id)
        console.log("label", channel.channel_id)
        // return;
        try {
            await call({
                label_id: label.label_id,
                channel_id: channel.channel_id,
            });
            toast.success("Đã xoá cuộc trò chuyện khỏi nhãn.");
            refetch();
        } catch (error) {
            console.log("error", error)
            toast.error("Không thể xoá cuộc trò chuyện khỏi nhãn.")
        }
    }

    const showAlert = () => {
        Alert.alert(
            'Xác nhận',
            'Bạn có muốn xoá đoạn hội thoại khỏi nhãn không?',
            [
                {
                    text: 'Huỷ',
                },
                {
                    text: 'Xoá',
                    style: 'destructive',
                    onPress: deleteConversation
                },
            ]
        )
    }

    return (
        <Reanimated.View style={styleAnimation}>
            <Button variant="plain" size="none" onPress={showAlert} style={{ width: 70, height: "100%" }} className={`bg-red-500 dark:bg-red-600 rounded-none items-center justify-center`}>
                {loading ? <ActivityIndicator size="small" color={COLORS.white} /> : <TrashIcon width={22} height={22} fill="white" />}
            </Button>
        </Reanimated.View>
    )
}

export default RightAction
