import { atom } from "jotai";
import { useFrappeGetCall } from "frappe-react-sdk";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { UserFields } from "@raven/types/common/UserFields";

const listUserAtom = atom<UserFields[] | undefined>();

export function useListUser() {
    const [cachedData, setCachedData] = useAtom(listUserAtom);
    const shouldCallApi = !cachedData;

    const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: UserFields[] }>(
        'raven.api.raven_users.get_list',
        undefined,
        'raven.api.raven_users.get_list',
        {
        revalidateOnFocus: false,
        revalidateOnReconnect: false
        }
    )

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
