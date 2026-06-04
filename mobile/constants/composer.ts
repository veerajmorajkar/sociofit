import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Matches CommentComposer row + vertical padding */
export const COMPOSER_ROW_HEIGHT = 44;
export const COMPOSER_FOOTER_PAD = 14;

/** Extra scroll padding when content scrolls above a flex-layout footer */
export const SCROLL_PAD_ABOVE_FOOTER = 16;

export function useBottomBarScrollPadding() {
  return SCROLL_PAD_ABOVE_FOOTER;
}
