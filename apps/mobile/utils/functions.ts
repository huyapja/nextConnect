import { ChannelWithUnreadCount, DMChannelWithUnreadCount } from "@raven/lib/hooks/useGetChannelUnreadCounts";

export function sortByLatestMessage(data: (ChannelWithUnreadCount | DMChannelWithUnreadCount)[]) {
  return data.slice().sort((a, b) => {
    const aTimestamp = a.last_message_timestamp ? new Date(a.last_message_timestamp).getTime() : 0;
    const bTimestamp = b.last_message_timestamp ? new Date(b.last_message_timestamp).getTime() : 0;

    return bTimestamp - aTimestamp;
  });
}

export function getRandomRgba() {
    const r = 180 + Math.floor(Math.random() * 56);
    const g = 180 + Math.floor(Math.random() * 56);
    const b = 180 + Math.floor(Math.random() * 56);
    const a = 0.3 + Math.random() * 0.2;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}
