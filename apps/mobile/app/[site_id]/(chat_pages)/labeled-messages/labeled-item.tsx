import ChevronDownIcon from '@assets/icons/ChevronDownIcon.svg';
import ChevronRightIcon from '@assets/icons/ChevronRightIcon.svg';
import { useColorScheme } from '@hooks/useColorScheme';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LabeledMessageItem } from 'types/LabeledMessageType';

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

const LabeledItem = ({ data }: { data: LabeledMessageItem }) => {
    const { colors } = useColorScheme()
    const [isExpanded, setIsExpanded] = useState(true)
    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => setIsExpanded(false)} style={styles.header} activeOpacity={0.7}>
                <Text style={styles.headerText}>Direct Messages</Text>
                {isExpanded ? <ChevronDownIcon fill={colors.icon} /> : <ChevronRightIcon fill={colors.icon} />}
            </TouchableOpacity>
            {isExpanded && <>
                {data.channels.map((channel) => <DMListRow key={dm.name} dm={dm} />)}
            </>}
        </View>
    )
}

export default LabeledItem
