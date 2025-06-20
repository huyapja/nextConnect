import { atom } from "jotai";
import { useFrappeGetCall } from "frappe-react-sdk";
import { useAtom } from "jotai";
import { useEffect } from "react";

const doneMessagesAtom = atom<any[] | null>(null);

export function useDoneMessages() {
    const [cachedData, setCachedData] = useAtom(doneMessagesAtom);
    const shouldCallApi = !cachedData?.length;

    const { data, error, isLoading, mutate } = useFrappeGetCall(
        "raven.api.raven_channel.get_done_channels",
        {},
        { execute: shouldCallApi },
    );

    useEffect(() => {
        if (data?.message) {
            setCachedData(data.message);
        }
    }, [data, shouldCallApi, setCachedData]);

    return {
        data: cachedData ?? null,
        isLoading: !cachedData && isLoading,
        isError: !cachedData && error,
        refetch: mutate,
    };
}
