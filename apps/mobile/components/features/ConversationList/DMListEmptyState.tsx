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
                    {searchQuery ? `No DMs found with "${searchQuery}"` : 'No DMs found'}
                </Text>
            </View>
            <Text className="text-sm text-foreground/60">
                {searchQuery ? 'Try searching for a different user name, or invite this userto Raven' : `Start a new conversation with someone to see it here`}
            </Text>
        </View>
    )
}

export default DMListEmptyState;
