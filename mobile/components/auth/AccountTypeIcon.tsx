import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import {
  ACCOUNT_TYPE_ICONS,
  CLUB_ICON_OUTLINE_COLOR,
  accountTypeIconColor,
  type AccountTypeValue,
} from '@/constants/accountType';

interface Props {
  type: AccountTypeValue;
  size?: number;
  selected?: boolean;
}

const OUTLINE_PAD = 1.5;

/**
 * Themed athlete / club icon — PNG silhouette tinted with brand teal or purple.
 * Club icons include a gold silhouette outline for contrast on purple UI.
 */
export default function AccountTypeIcon({ type, size = 44, selected = true }: Props) {
  const source = ACCOUNT_TYPE_ICONS[type] as ImageSourcePropType;
  const color = accountTypeIconColor(type, selected);
  const isClub = type === 'club';
  const outlineSize = size + OUTLINE_PAD * 2;

  const mask = (dim: number) => (
    <Image
      source={source}
      style={{ width: dim, height: dim }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );

  if (!isClub) {
    return (
      <MaskedView style={{ width: size, height: size }} maskElement={mask(size)}>
        <View style={[s.fill, { backgroundColor: color }]} />
      </MaskedView>
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <MaskedView
        style={{ position: 'absolute', width: outlineSize, height: outlineSize }}
        maskElement={mask(outlineSize)}
      >
        <View style={[s.fill, { backgroundColor: CLUB_ICON_OUTLINE_COLOR }]} />
      </MaskedView>
      <MaskedView style={{ width: size, height: size }} maskElement={mask(size)}>
        <View style={[s.fill, { backgroundColor: color }]} />
      </MaskedView>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
});
