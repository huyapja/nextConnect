import { View } from "react-native"
import ChatOutlineIcon from "@assets/icons/ChatOutlineIcon.svg"
import { Text } from "@components/nativewindui/Text"
import { useColorScheme } from "@hooks/useColorScheme"

const DMListEmptyState = ({ searchQuery }: { searchQuery?: string }) => {
    const { colors } = useColorScheme()
    return (
        <View className="flex flex-col gap-2 bg-background px-4 py-1">
            <View className="flex flex-row items-center gap-2">
                <ChatOutlineIcon fill={colors.icon} height={20} width={20} />
                <Text className="text-foreground text-base font-medium">
                    {searchQuery ? `Không tìm thấy tin nhắn với "${searchQuery}"` : 'Không có tin nhắn'}
                </Text>
            </View>
            <Text className="text-sm text-foreground/60">
                {searchQuery ? 'Hãy thử tìm kiếm một tên người dùng khác, hoặc mời người dùng này vào Raven' : `Bắt đầu một cuộc trò chuyện mới để xem tại đây`}
            </Text>
        </View>
    )
}

export default DMListEmptyState;
