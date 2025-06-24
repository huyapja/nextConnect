import { useFrappePostCall } from 'frappe-react-sdk'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

export const labelListAtom = atom<
  {
    channels: any[]
    label_id: string
    label: string
  }[]
>([])

export const refreshLabelListAtom = atom(0)

export const useLabelList = () => {
  const labelList = useAtomValue(labelListAtom)
  const refreshKey = useAtomValue(refreshLabelListAtom)
  const setLabelList = useSetAtom(labelListAtom)

  const { call, loading, error } = useFrappePostCall<{ message: { label_id: string; label: string; channels: any[] }[] }>(
    'raven.api.user_label.get_my_labels'
  )

  const refreshLabelList = useCallback(async () => {
    const res = await call({})
    if (res?.message) {
      const isDifferent = JSON.stringify(res.message) !== JSON.stringify(labelList)
      if (isDifferent) {
        setLabelList(res.message)
      }
    }
  }, [call, setLabelList, labelList])

  // Gọi API lần đầu khi mount
  useEffect(() => {
    if (labelList?.length === 0) {
      refreshLabelList()
    }
  }, [labelList?.length, refreshLabelList])

  // Gọi lại khi refreshKey thay đổi
  useEffect(() => {
    if (refreshKey > 0) {
      refreshLabelList()
    }
  }, [refreshKey, refreshLabelList])

  return {
    labelList,
    refreshLabelList,
    loading,
    error
  }
}
