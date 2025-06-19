export interface ChanelLabeledMessage {
    channel_id: string,
    channel_name: string,
    is_direct_message: boolean
}

export interface LabeledMessageItem {
    label_id: string,
    label: string,
    channels: ChanelLabeledMessage[]
}
