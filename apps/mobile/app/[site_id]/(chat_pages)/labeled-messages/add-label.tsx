import { useEffect, useState } from 'react';
import { router, Stack } from 'expo-router';
import { View } from 'react-native';
import { useFrappePostCall } from 'frappe-react-sdk';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@components/nativewindui/Button';
import { Form, FormItem, FormSection } from '@components/nativewindui/Form';
import { Text } from '@components/nativewindui/Text';
import { TextField } from '@components/nativewindui/TextField';
import useCurrentRavenUser from '@raven/lib/hooks/useCurrentRavenUser';
import { toast } from 'sonner-native';
import { useColorScheme } from '@hooks/useColorScheme';
import { ActivityIndicator } from '@components/nativewindui/ActivityIndicator';
import HeaderBackButton from '@components/common/Buttons/HeaderBackButton';
import CommonErrorBoundary from '@components/common/CommonErrorBoundary';
import { useLabeledMessages } from '@hooks/useLabeledMessages';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectedLabelAtom } from '@lib/LabelActions';

export default function AddLabelScreen() {
    const setSelectedLabel = useSetAtom(selectedLabelAtom);
    const labelSelected = useAtomValue(selectedLabelAtom);
    const { refetch } = useLabeledMessages();

    const insets = useSafeAreaInsets()
    const [label, setLabel] = useState(labelSelected?.label ?? '')
    const { call: create, loading } = useFrappePostCall('raven.api.user_label.create_label')
    const { call: update, loading: isLoading } = useFrappePostCall('raven.api.user_label.update_label')

    const handleCustomStatusUpdate = async () => {
        try {
            if (labelSelected) {
                await update({
                    label_id: labelSelected.label_id,
                    new_label: label.trim(),
                })
            } else {
                await create({ label: label.trim() })
            }
            toast.success("Đã lưu nhãn")
            refetch();
        } catch (error) {
            toast.error("Lưu nhãn thất bại, vui lòng thử lại")
        } finally {
            router.back();
        }
    }

    const { colors } = useColorScheme()

    useEffect(() => {
        return () => {
            setSelectedLabel(null)
        }
    }, [])

    return (
        <>
            <Stack.Screen
                options={{
                    headerLeft() {
                        return (
                            <HeaderBackButton />
                        )
                    },
                    headerTitle: () => (
                        <Text className='ml-2 text-base font-semibold'>
                            {
                                labelSelected ? 'Sửa nhãn' : 'Thêm Nhãn'
                            }
                        </Text>
                    ),
                    headerRight() {
                        return (
                            <Button variant="plain" className="ios:px-0"
                                onPress={handleCustomStatusUpdate}
                                disabled={loading || !label.trim()}>
                                {loading ?
                                    <ActivityIndicator size="small" color={colors.primary} /> :
                                    <Text className="text-primary dark:text-secondary">Lưu</Text>}
                            </Button>
                        )
                    },
                    headerStyle: { backgroundColor: colors.background },
                }} />
            <KeyboardAwareScrollView
                bottomOffset={8}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{ paddingBottom: insets.bottom }}>
                <Form className="gap-5 px-4 pt-8">
                    <FormSection footnote="Nhóm lại các cuộc trò chuyện theo nhãn. Chỉ bạn có thể thấy nhãn này.">
                        <FormItem>
                            <TextField
                                autoFocus
                                className="pl-0.5"
                                leftView={
                                    <View className="w-28 justify-between flex-row items-center pl-2">
                                        <Text className="font-medium">Tên nhãn</Text>
                                    </View>
                                }
                                placeholder="Nhập tên nhãn mới"
                                value={label}
                                maxLength={60}
                                onChangeText={setLabel}
                            />
                        </FormItem>
                    </FormSection>
                </Form>
            </KeyboardAwareScrollView>
        </>
    )
}


export const ErrorBoundary = CommonErrorBoundary
