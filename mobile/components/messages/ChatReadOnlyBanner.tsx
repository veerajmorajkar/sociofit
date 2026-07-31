import { View, Text, StyleSheet } from 'react-native';
import { Lock, Megaphone } from 'lucide-react-native';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  message: string;
  /** 'gold' for club announcement channels / organiser-only phases. */
  tone?: 'default' | 'gold';
}

/**
 * Read-only state for a conversation — rendered in place of the composer
 * input when the current user cannot post (announcement channels, closed
 * event discussions).
 */
export default function ChatReadOnlyBanner({ message, tone = 'default' }: Props) {
  const { theme } = useTheme();
  const isGold = tone === 'gold';
  const Icon = isGold ? Megaphone : Lock;

  return (
    <View
      style={[
        s.banner,
        isGold
          ? { backgroundColor: 'rgba(201, 168, 76, 0.12)', borderColor: 'rgba(201, 168, 76, 0.35)' }
          : { backgroundColor: theme.surface2, borderColor: theme.surface3 },
      ]}
      accessibilityRole="text"
      accessibilityLabel={message}
    >
      <View
        style={[
          s.iconWrap,
          isGold
            ? { backgroundColor: 'rgba(201, 168, 76, 0.18)' }
            : { backgroundColor: theme.insetWell },
        ]}
      >
        <Icon size={14} strokeWidth={2} color={isGold ? theme.goldLight : theme.purpleSoft} />
      </View>
      <Text
        style={[
          s.text,
          { color: isGold ? theme.goldLight : theme.textSecondary },
          isGold && { fontFamily: fonts.bodyStrong },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
  },
});
