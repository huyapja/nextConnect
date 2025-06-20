import { atom } from "jotai";
import { useFrappeGetCall } from "frappe-react-sdk";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { LabeledMessageItem } from "types/LabeledMessageType";

const labeledMessagesAtom = atom<LabeledMessageItem[] | null>(null);

export function useLabeledMessages() {
    const [cachedData, setCachedData] = useAtom(labeledMessagesAtom);
    const shouldCallApi = !cachedData?.length;

    const { data, error, isLoading, mutate } = useFrappeGetCall(
        "raven.api.user_label.get_my_labels",
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
