import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { fonts, radius } from '@/constants/theme';

type Variant = 'white' | 'purple' | 'apple' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string }> = {
  white: { bg: '#FFFFFF', text: '#5B2ECC' },
  purple: { bg: '#5B2ECC', text: '#FFFFFF' },
  apple: { bg: '#F2F2F2', text: '#0E0E14' },
  ghost: { bg: 'transparent', text: '#FFFFFF', border: 'rgba(255,255,255,0.35)' },
};

export default function AuthPillButton({
  label,
  onPress,
  variant = 'white',
  disabled,
  loading,
  icon,
  style,
}: Props) {
  const v = VARIANTS[variant];
  return (
    <TouchableOpacity
      style={[
        s.btn,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
        },
        (disabled || loading) && s.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <View style={s.row}>
          {icon}
          <Text style={[s.label, { color: v.text }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  disabled: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: {
    fontFamily: fonts.h3,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
