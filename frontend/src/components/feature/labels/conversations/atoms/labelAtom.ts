import { useFrappePostCall } from 'frappe-react-sdk'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'

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
  const setLabelList = useSetAtom(labelListAtom)

  const { call, loading, error } = useFrappePostCall<{
    message: { label_id: string; label: string; channels: any[] }[]
  }>('raven.api.user_label.get_my_labels')

  // flag đã fetch 1 lần
  const hasFetchedOnce = useRef(false)

  const refreshLabelList = useCallback(async () => {
    const res = await call({})
    if (res?.message) {
      const currentString = JSON.stringify(res.message)
      const lastString = JSON.stringify(labelList)
      const isDifferent = currentString !== lastString
      if (isDifferent) {
        setLabelList(res.message)
      }
    }
  }, [call, setLabelList, labelList])

  useEffect(() => {
    if (!hasFetchedOnce.current) {
      hasFetchedOnce.current = true
      refreshLabelList()
    }
  }, [refreshLabelList])

  return {
    labelList,
    refreshLabelList,
    loading,
    error
  }
}

export const useLabelListValue = () => {
  return useAtomValue(labelListAtom)
}

export const useRefreshLabelList = () => {
  const setRefresh = useSetAtom(refreshLabelListAtom)
  return () => setRefresh((v) => v + 1)
}
