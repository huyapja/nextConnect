import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

interface MenuItemProps {
    title: string;
    path: string,
}

const FilterItem = ({item}: {item: MenuItemProps}) => {
  return (
    <Link href={`../conversations/${item.path}`} asChild>
      <Pressable
            className='flex flex-row relative items-center gap-3 py-3 px-4 ios:active:bg-linkColor'
            android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
        >
            {({ pressed, hovered }) => <>
                <View
                    style={{
                        width: 7,
                        height: 7,
                        position: 'absolute',
                        left: 6,
                        top: 28,
                        borderRadius: '100%',
                    }}
                />
                <View className='flex-1 flex-col overflow-hidden'>
                    <View className='flex flex-row justify-between items-center'>
                        <Text
                            className={'text-base font-medium text-foreground'}>
                            {item.title}
                        </Text>
                    </View>
                </View>
            </>}
        </Pressable>
    </Link>
  )
}

export default FilterItem
