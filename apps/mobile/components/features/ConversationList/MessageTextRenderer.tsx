import { Text, View } from 'react-native';
import { useMemo } from 'react';
import { useColorScheme } from '@hooks/useColorScheme';
import { useWindowDimensions } from 'react-native';
import { decode } from 'html-entities';

type Props = {
    text: string;
};

const stripHtml = (html: string) => {
    return decode(html.replace(/<[^>]*>?/gm, '').replace(/\n/g, ' '));
};

const MessageTextRenderer = ({ text }: Props) => {
    const { width } = useWindowDimensions();
    const { colorScheme } = useColorScheme();

    const plainText = useMemo(() => stripHtml(text), [text]);
    const textColor = colorScheme === 'light' ? 'black' : 'white';

    return (
        <View className="flex-1 pt-0.5">
            <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className='text-muted-foreground text-sm'
                style={{
                    width: width - 120,
                }}
            >
                {plainText}
            </Text>
        </View>
    );
};

export default MessageTextRenderer;
