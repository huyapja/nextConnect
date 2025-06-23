import ChevronDownIcon from '@assets/icons/ChevronDownIcon.svg';
import ChevronRightIcon from '@assets/icons/ChevronRightIcon.svg';
import { useColorScheme } from '@hooks/useColorScheme';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LabeledMessageItem } from 'types/LabeledMessageType';
import ChannelRow from './ChannelRow';
import { router } from 'expo-router';

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

const LabeledItem = ({ data, onLongPress }: { data: LabeledMessageItem, onLongPress: (label: LabeledMessageItem) => void }) => {
    const { colors } = useColorScheme()
    const [isExpanded, setIsExpanded] = useState(false)
    const onAddConversation = () => {
        router.push('./add-conversation', {
            relativeToDirectory: true
        })
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onLongPress={() => onLongPress(data)}
                onPress={() => setIsExpanded(!isExpanded)}
                style={styles.header}
                activeOpacity={0.7}
            >
                <Text className='text-foreground' style={styles.headerText}>{data.label}</Text>
                {isExpanded ? <ChevronDownIcon fill={colors.icon} /> : <ChevronRightIcon fill={colors.icon} />}
            </TouchableOpacity>
            {isExpanded && (
                <>
                    {data.channels.map((channel) => <ChannelRow key={channel.channel_id} row={channel} />)}
                    {
                        data.channels?.length === 0 && (
                            <>
                                <Text
                                    style={{color: colors.secondary}}
                                    className='italic px-4'
                                >Chưa có cuộc trò chuyện nào được thêm vào nhãn này</Text>
                                <View className='py-2.5 px-4'>
                                    <TouchableOpacity
                                        onPress={onAddConversation}
                                        className='py-2 rounded-xl'
                                    >
                                        <Text className='text-base italic font-medium text-primary'>Thêm cuộc trò chuyện</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )
                    }
                </>
            )}
        </View>
    )
}

export default LabeledItem
