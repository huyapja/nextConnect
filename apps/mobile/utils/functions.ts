import { ChannelWithUnreadCount, DMChannelWithUnreadCount } from "@raven/lib/hooks/useGetChannelUnreadCounts";

export function sortByLatestMessage(data: (ChannelWithUnreadCount | DMChannelWithUnreadCount)[]) {
  return data.slice().sort((a, b) => {
    const aTimestamp = a.last_message_timestamp ? new Date(a.last_message_timestamp).getTime() : 0;
    const bTimestamp = b.last_message_timestamp ? new Date(b.last_message_timestamp).getTime() : 0;

    return bTimestamp - aTimestamp;
  });
}
