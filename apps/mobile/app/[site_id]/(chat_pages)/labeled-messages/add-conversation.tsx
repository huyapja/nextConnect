import GroupIcon from '@assets/icons/Group.svg';
import HeaderBackButton from '@components/common/Buttons/HeaderBackButton';
import SearchInput from '@components/common/SearchInput/SearchInput';
import { Divider } from '@components/layout/Divider';
import UserAvatar from '@components/layout/UserAvatar';
import { ActivityIndicator } from '@components/nativewindui/ActivityIndicator';
import { Button } from '@components/nativewindui/Button';
import { Checkbox } from '@components/nativewindui/Checkbox';
import { Text } from '@components/nativewindui/Text';
import { useColorScheme } from '@hooks/useColorScheme';
import { useLabeledMessages } from '@hooks/useLabeledMessages';
import { selectedLabelAtom } from '@lib/LabelActions';
import { useGetUser } from '@raven/lib/hooks/useGetUser';
import { ChannelListContext, ChannelListContextType } from '@raven/lib/providers/ChannelListProvider';
import { router, Stack } from 'expo-router';
import { useFrappePostCall } from 'frappe-react-sdk';
import { useAtomValue, useSetAtom } from 'jotai';
import { memo, useCallback, useContext, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { toast } from 'sonner-native';
import { getRandomRgba, sortByLatestMessage } from 'utils/functions';

export default function AddConversationsToLabel() {
    const { colors } = useColorScheme();
    const { refetch } = useLabeledMessages();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const labelSelected = useAtomValue(selectedLabelAtom);
    const setSelectedLabel = useSetAtom(selectedLabelAtom);
    const { call, loading } = useFrappePostCall('raven.api.user_channel_label.add_label_to_multiple_channels');
    const { dm_channels, isLoading, channels } = useContext(ChannelListContext) as ChannelListContextType;

    const allDMs = useMemo(() => {
        let allRecord: any[] = [];
        for (const item of dm_channels) {
            allRecord.push({
                ...item,
                unread_count: 0,
            });
        }
        for (const item of channels) {
            allRecord.push({
                ...item,
                unread_count: 0,
            });
        }
        const sortedRecord = sortByLatestMessage(allRecord);
        return sortedRecord;
    }, [dm_channels, channels, selected])

    const selectedChannels = labelSelected?.channels?.map(item => item.channel_id);

    const handleCustomStatusUpdate = async () => {
        if (labelSelected) {
            const loading = toast.loading("Đang cập nhật");
            try {
                await call({
                    label_id: labelSelected?.label_id,
                    channel_ids: JSON.stringify(selected),
                })
                toast.dismiss(loading);
                toast.success("Đã cập nhật danh sách");
                refetch();
            } catch (error) {
                console.log("error", error)
                toast.dismiss(loading);
                toast.success("Cập nhật danh sách chat cho nhãn thất bại");
            } finally {
                setSelectedLabel(null);
                router.back();
            }
        }
    }

    const filteredChannels = useMemo(() => {
        const keyword = search.toLowerCase()
        return allDMs.filter((channel) => (
            channel.channel_name?.toLowerCase().includes(keyword) || channel.name.toLowerCase().includes(keyword)
        )).map(item => ({ ...item, selected: selected.some(i => i === item.name) }))
    }, [allDMs, search, selected])

    if (isLoading) {
        return <View className="flex-1 justify-center items-center h-full">
            <ActivityIndicator />
        </View>
    }

    const toggleSelect = useCallback((channel: string) => {
        const hasItem = selected.includes(channel)
        if (hasItem) {
            setSelected((prev) => prev.filter(item => item !== channel))
        } else {
            setSelected(prev => prev.concat([channel]))
        }
    }, [selected])

    return (
        <>
            <Stack.Screen
                options={{
                    headerLeft() {
                        return (
                            <HeaderBackButton />
                        )
                    },
                    headerTitle: () => <Text className='ml-2 text-base font-semibold'>Đã chọn: {selected.length}</Text>,
                    headerRight() {
                        return (
                            <Button variant="plain" className="ios:px-0"
                                onPress={handleCustomStatusUpdate}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                )  : (
                                    <Text className="text-primary dark:text-secondary">Lưu</Text>

                                )}
                            </Button>
                        )
                    },
                    headerStyle: { backgroundColor: colors.background },
                }}
            />
            <View className='flex-1 px-4 py-2'>
                <View className="pt-3 pb-1.5">
                    <SearchInput
                        onChangeText={setSearch}
                        value={search}
                    />
                </View>
                <ScrollView>
                    {
                        filteredChannels.map((item) => {
                            const isSelected = selectedChannels?.includes(item.name)
                            return (
                                <TouchableOpacity
                                    key={item.channel_name}
                                    className='flex-row items-center gap-2 py-2'
                                    onPress={() => toggleSelect(item.name)}
                                    disabled={isSelected}
                                >
                                    <Checkbox
                                        checked={item.selected || isSelected}
                                        isMultiChoice
                                        disabled={isSelected}
                                    />
                                    {
                                        item.peer_user_id ? (
                                            <Username disabled={isSelected} dm={item} />
                                        ) : (
                                            <GroupName disabled={isSelected} channel_name={item.channel_name}/>
                                        )
                                    }
                                </TouchableOpacity>
                            )
                        })
                    }
                    <Divider />
                </ScrollView>
            </View>
        </>
    )
}

const Username = ({dm, disabled}: any) => {
    const { colors } = useColorScheme();
    const user = useGetUser(dm.peer_user_id);
    return (
        <>
            <UserAvatar
                src={user?.user_image}
                alt={user?.full_name ?? user?.name ?? dm.peer_user_id}
                isBot={user?.type === 'Bot'}
                availabilityStatus={user?.availability_status}
                avatarProps={{ className: 'h-8 w-8' }}
            />
            <Text style={disabled && { color: colors.grey }}>{user?.full_name ?? dm.peer_user_id}</Text>
        </>
    )
}

const GroupNameComponent = ({channel_name, disabled}: any) => {
    const { colors } = useColorScheme();
    return (
        <>
            <Text style={{ backgroundColor: getRandomRgba(), padding: 4, borderRadius: 4 }}>
                <GroupIcon color={"#fff"} width={24} height={24}/>
            </Text>
            <Text style={ disabled && { color: colors.grey }}>{channel_name}</Text>
        </>
    )
}
const GroupName = memo(GroupNameComponent)
