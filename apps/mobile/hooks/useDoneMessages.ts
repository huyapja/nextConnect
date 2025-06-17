import { atom } from "jotai";
import { useFrappeGetCall } from "frappe-react-sdk";
import { useAtom } from "jotai";
import { useEffect } from "react";

const doneMessagesAtom = atom(null);

export function useDoneMessages() {
    const [cachedData, setCachedData] = useAtom(doneMessagesAtom);
    const shouldCallApi = !cachedData;

    const { data, error, isLoading, mutate } = useFrappeGetCall(
        "raven.api.raven_channel.get_done_channels",
        {},
        { execute: shouldCallApi },
    );

    // Khi data từ API có, mà cache chưa có → lưu vào atom
    useEffect(() => {
        if (data && shouldCallApi) {
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
