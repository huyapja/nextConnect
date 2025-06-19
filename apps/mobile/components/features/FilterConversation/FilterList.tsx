import { Divider } from "@components/layout/Divider";
import { LegendList } from "@legendapp/list";
import { View } from "@rn-primitives/slot";
import FilterItem from "./FilterItem";

export const FilterItems = {
    unread: {
        title: 'Chưa đọc',
        path: '../conversations/unread',
    },
    flagged: {
        title: 'Đã gắn cờ',
        path: '../saved-messages',
    },
    mention: {
        title: 'Nhắc đến',
        path: '../mentions',
    },
    label: {
        title: 'Nhãn',
        path: '../labeled-messages',
    },
    private: {
        title: 'Cuộc trò chuyện riêng tư',
        path: '../conversations/private',
    },
    group: {
        title: 'Trò chuyện nhóm',
        path: '../conversations/group',
    },
    topic: {
        title: 'Chủ đề',
        path: '../threads',
    },
    done: {
        title: 'Xong',
        path: '../done-messages',
    },
    members: {
        title: 'Thành viên',
        path: '../members',
    },
}

const filters = [
    FilterItems.unread,
    FilterItems.flagged,
    FilterItems.mention,
    FilterItems.label,
    FilterItems.private,
    FilterItems.group,
    FilterItems.topic,
    FilterItems.done,
    FilterItems.members,
];

const FilterList = () => {

  return (
    <View className="flex-1">
        <LegendList
            data={filters}
            renderItem={({ item }) => <FilterItem item={item}/>}
            keyExtractor={(item) => item.title}
            estimatedItemSize={68}
            ItemSeparatorComponent={() => <Divider />}
            bounces={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={null}
        />
    </View>
  )
}

export default FilterList;


