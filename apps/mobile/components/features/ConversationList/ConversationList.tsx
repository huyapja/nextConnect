import ErrorBanner from "@components/common/ErrorBanner";
import SearchInput from "@components/common/SearchInput/SearchInput";
import { Divider } from "@components/layout/Divider";
import useUnreadMessageCount from "@hooks/useUnreadMessageCount";
import { LegendList } from "@legendapp/list";
import { useDebounce } from "@raven/lib/hooks/useDebounce";
import { ChannelListContext, ChannelListContextType } from "@raven/lib/providers/ChannelListProvider";
import { useContext, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { FilterConversationType } from "types/FilterConversationTypes";
import DmRow from "./DMRow";
import DMListEmptyState from "./DMListEmptyState";
import { ChannelListItem, DMChannelListItem } from "@raven/types/common/ChannelListItem";
import ChannelRow from "./ChannelRow";
import { sortByLatestMessage } from "utils/functions";

export interface ChannelWithUnreadCount extends ChannelListItem {
    unread_count: number
}
export interface DMChannelWithUnreadCount extends DMChannelListItem {
    unread_count: number
}

type RecordType = ChannelWithUnreadCount | DMChannelWithUnreadCount

interface ConversationListProps {
    filter: FilterConversationType;
}

const ConversationList = ({ filter='all' }: ConversationListProps) => {
    const { unread_count } = useUnreadMessageCount()
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearchQuery = useDebounce(searchQuery, 250)
    const { dm_channels, error, isLoading, channels } = useContext(ChannelListContext) as ChannelListContextType;

    const allDMs = useMemo(() => {
        let allRecord: RecordType[] = [];
        if (filter !== 'group') {
            for (const dm of dm_channels) {
                if (dm.is_done === 0) {
                    allRecord.push({
                        ...dm,
                        unread_count: unread_count?.message.find(item => item.name === dm.name)?.unread_count ?? 0
                    });
                }
            }
        }
        if (filter !== 'private') {
            for (const channel of channels) {
                if (channel.is_done === 0) {
                    allRecord.push({
                        ...channel,
                        unread_count: unread_count?.message.find(item => item.name === channel.name)?.unread_count ?? 0
                    });
                }
            }
        }
        if (filter === 'unread') {
            allRecord = allRecord.filter(r => (r.unread_count > 0))
        }
        const sortedRecord = sortByLatestMessage(allRecord);
        return sortedRecord;
    }, [dm_channels, unread_count, channels, filter])

    const filteredDMs = useMemo(() => {
        return allDMs.filter((dm: any) => {
            if (dm.peer_user_id) {
                return dm.peer_user_id?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            }
            if (dm.channel_name) {
                return dm.channel_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            }
        });
    }, [allDMs, debouncedSearchQuery])

    if (isLoading) {
        return <View className="flex-1 justify-center items-center h-full">
            <ActivityIndicator />
        </View>
    }

    if (error) {
        return (
            <ErrorBanner error={error} />
        )
    }

    return (
        <>
            <View className="px-3 pt-3 pb-1.5">
                <SearchInput
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                />
            </View>
            <ScrollView>
                <LegendList
                    data={filteredDMs}
                    renderItem={({ item }: any) => {
                        if (item.peer_user_id) {
                            return <DmRow dm={item as DMChannelWithUnreadCount} />
                        } else {
                            return <ChannelRow dm={item as ChannelWithUnreadCount} />
                        }
                    }}
                    keyExtractor={(item) => item.name}
                    estimatedItemSize={68}
                    ItemSeparatorComponent={() => <Divider />}
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<DMListEmptyState searchQuery={searchQuery} />}
                />
                <Divider />
            </ScrollView>
        </>
    )
}

export default ConversationList;
