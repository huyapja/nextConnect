import { LabelType } from '@/utils/channel/ChannelAtom'
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
  const setLabelList = useSetAtom(labelListAtom)

  const { call, loading, error } = useFrappePostCall<{
    message: LabelType[]
  }>('raven.api.user_label.get_my_labels')

  const refreshLabelList = useCallback(async () => {
    const res = await call({})
    if (res?.message) {
      const currentString = JSON.stringify(res.message)
      const lastString = JSON.stringify(labelList)
      if (currentString !== lastString) {
        setLabelList(res.message)
      }
    }
  }, [call, setLabelList, labelList])

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
