import { UnreadCountData } from "@raven/lib/hooks/useGetChannelUnreadCounts"
import { useFrappeGetCall, FrappeContext, FrappeConfig, useFrappeEventListener, useFrappePostCall } from "frappe-react-sdk"
import { useCallback, useContext } from "react"
import { useUpdateLastMessageInChannelList } from "./useUpdateLastMessageInChannelList"
import useCurrentRavenUser from "@raven/lib/hooks/useCurrentRavenUser"
import { DMChannelListItem } from "@raven/types/common/ChannelListItem"
import { useLocalSearchParams } from "expo-router"
import { useChannelList } from "@raven/lib/providers/ChannelListProvider"
import useUnreadThreadsCount from "./useUnreadThreadsCount"

const useUnreadMessageCount = () => {

    const { data: unread_count, mutate: updateCount } = useFrappeGetCall<{ message: UnreadCountData }>("raven.api.raven_message.get_unread_count_for_channels",
        undefined,
        'unread_channel_count', {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
    })

    return {
        unread_count,
        updateCount
    }
}

export default useUnreadMessageCount

export const useFetchUnreadMessageCount = () => {

    const currentUser = useCurrentRavenUser()

    const { channels, dm_channels } = useChannelList()

    const { unread_count, updateCount } = useUnreadMessageCount()

    const { call } = useContext(FrappeContext) as FrappeConfig

    const fetchUnreadCountForChannel = async (channelID: string) => {

        let channelData = null

        const channel = channels.find(c => c.name === channelID && c.member_id)
        if (channel) {
            channelData = channel
        } else {
            const dmChannel = dm_channels.find(c => c.name === channelID && c.member_id)
            if (dmChannel) {
                channelData = dmChannel
            }
        }

        if (!channelData) {
            return
        }


        updateCount(d => {
            console.log("d: ", d)
            if (d) {
                return call.get('raven.api.raven_message.get_unread_count_for_channel', {
                    channel_id: channelID
                }).then((data: { message: any }) => {
                    console.log("data", data)
                    const newChannels = [...d.message]

                    const isChannelAlreadyPresent = d.message.findIndex(c => c.name === channelID)

                    if (isChannelAlreadyPresent === -1) {
                        newChannels.push({
                            is_direct_message: channelData.is_direct_message ? 1 : 0,
                            name: channelID,
                            user_id: (channelData as DMChannelListItem).peer_user_id,
                            unread_count: data.message.unread_count ?? 0
                        })
                    } else {
                        newChannels[isChannelAlreadyPresent] = {
                            ...d.message[isChannelAlreadyPresent],
                            unread_count: data.message.unread_count ?? 0
                        }
                    }

                    return {
                        message: newChannels
                    }
                }
                )
            } else {
                return d
            }
        }, {
            revalidate: false
        })
    }

    const { id: channelID } = useLocalSearchParams()

    const { updateLastMessageInChannelList } = useUpdateLastMessageInChannelList()

    useFrappeEventListener('raven:unread_channel_count_updated', (event) => {
        console.log("raven:unread_channel_count_updated", event)
        if (event.sent_by !== currentUser) {
            if (channelID === event.channel_id) {
                updateUnreadCountToZero(event.channel_id)
            } else {
                fetchUnreadCountForChannel(event.channel_id)
            }
        } else {
            updateUnreadCountToZero(event.channel_id)
        }

        updateLastMessageInChannelList(event.channel_id, event.last_message_timestamp, event.last_message_details)
    })

    const updateUnreadCountToZero = (channel_id?: string) => {

        updateCount(d => {
            if (d) {
                const newChannels = d.message.map(c => {
                    if (c.name === channel_id)
                        return {
                            ...c,
                            unread_count: 0
                        }
                    return c
                })

                return {
                    message: newChannels
                }

            } else {
                return d
            }

        }, { revalidate: false })

    }

    return unread_count
}


export const useTrackChannelVisit = (channelID: string, isThread: boolean = false) => {

    const { call } = useFrappePostCall('raven.api.raven_channel_member.track_visit')

    const { updateCount } = useUnreadMessageCount()

    const { mutate: updateUnreadThreadsCount } = useUnreadThreadsCount()

    const updateUnreadCountToZero = useCallback((channel_id?: string, isThread: boolean = false) => {

        if (!isThread) {
            updateCount(d => {
                if (d) {
                    const newChannels = d.message.map(c => {
                        if (c.name === channel_id)
                            return {
                                ...c,
                                unread_count: 0
                            }
                        return c
                    })

                    return {
                        message: newChannels
                    }

                } else {
                    return d
                }

            }, { revalidate: false })
        } else {
            updateUnreadThreadsCount(d => {
                if (d) {
                    const newThreads = d.message.map(c => {
                        if (c.name === channel_id)
                            return {
                                ...c,
                                unread_count: 0
                            }
                        return c
                    })

                    return {
                        message: newThreads
                    }

                } else {
                    return d
                }
            }, {
                revalidate: false
            })
        }



    }, [updateCount])


    const trackVisit = useCallback(() => {
        updateUnreadCountToZero(channelID, isThread)
        call({ channel_id: channelID })
    }, [channelID, call, updateUnreadCountToZero])

    return trackVisit
}
