import { View, Text, StyleSheet } from 'react-native';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

export default function ChatDaySeparator({ label }: { label: string }) {
  const { theme } = useTheme();

  return (
    <View style={s.wrap}>
      <View style={[s.line, { backgroundColor: theme.surface3 }]} />
      <View style={[s.chip, { backgroundColor: theme.surface2, borderColor: theme.surface3 }]}>
        <Text style={[s.label, { color: theme.textMuted }]}>{label}</Text>
      </View>
      <View style={[s.line, { backgroundColor: theme.surface3 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
    paddingHorizontal: 12,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.7,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
