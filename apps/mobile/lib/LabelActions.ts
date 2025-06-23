import { atom } from 'jotai';
import { LabeledMessageItem } from 'types/LabeledMessageType';

export const labelActionsSheetRefAtom = atom<React.RefObject<any> | null>(null);

export const selectedLabelAtom = atom<LabeledMessageItem | null>(null);
