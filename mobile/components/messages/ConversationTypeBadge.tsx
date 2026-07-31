import { View, Text, StyleSheet } from 'react-native';
import { fonts, radius, neumorph } from '@/constants/theme';
import { CONVERSATION_TYPE_COLORS, CONVERSATION_TYPE_LABELS } from '@/constants/messaging';
import type { ConversationType } from '@/types/message';

const COMPACT_LABELS: Partial<Record<ConversationType, string>> = {
  group: 'GROUP',
  event_chat: 'DISC',
};

interface Props {
  type: ConversationType;
  /** Smaller single-line chip for chat header */
  compact?: boolean;
}

export default function ConversationTypeBadge({ type, compact = false }: Props) {
  const theme = CONVERSATION_TYPE_COLORS[type] ?? CONVERSATION_TYPE_COLORS.dm;
  const label = compact
    ? (COMPACT_LABELS[type] ?? CONVERSATION_TYPE_LABELS[type])
    : (CONVERSATION_TYPE_LABELS[type] ?? type.toUpperCase());

  return (
    <View
      style={[
        compact ? s.badgeCompact : s.badge,
        neumorph.pill,
        { backgroundColor: theme.bg, borderColor: theme.border },
      ]}
    >
      <Text style={[compact ? s.textCompact : s.text, { color: theme.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  text: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  textCompact: {
    fontFamily: fonts.label,
    fontSize: 8,
    letterSpacing: 0.4,
  },
});
