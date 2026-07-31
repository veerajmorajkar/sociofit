import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import UserAvatar from '@/components/ui/UserAvatar';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { formatChatMessageTime } from '@/utils/formatDate';
import { estimateChatLineCount, getChatBubbleShape } from '@/utils/chatBubble';
import type { Message } from '@/types/message';

const AVATAR_SIZE = 32;
const AVATAR_SLOT = AVATAR_SIZE;

interface Props {
  item: Message;
  isMine: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  onPress: () => void;
  myDisplayName?: string;
  myAvatarUrl?: string | null;
}

type BubbleVariant = 'mine' | 'theirs' | 'system';

function ChatBubble({ content, variant }: { content: string; variant: BubbleVariant }) {
  const { theme } = useTheme();
  const text = content ?? '';
  const [lineCount, setLineCount] = useState(() => estimateChatLineCount(text));
  const shape = getChatBubbleShape(lineCount, text.length);

  const onTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const lines = e.nativeEvent.lines.length;
    if (lines > 0 && lines !== lineCount) setLineCount(lines);
  };

  if (variant === 'system') {
    return (
      <View
        style={[
          s.systemWrap,
          {
            borderRadius: shape.borderRadius,
            paddingHorizontal: shape.paddingHorizontal,
            paddingVertical: shape.paddingVertical,
          },
        ]}
      >
        <Text style={[s.systemText, { color: theme.textSecondary }]} onTextLayout={onTextLayout}>
          {text}
        </Text>
      </View>
    );
  }

  if (variant === 'mine') {
    return (
      <View style={[s.bubbleMine, s.bubbleShadowMine, { borderRadius: shape.borderRadius }]}>
        <LinearGradient
          colors={[theme.purpleBrand, theme.purpleHero]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: shape.borderRadius,
            paddingHorizontal: shape.paddingHorizontal,
            paddingVertical: shape.paddingVertical,
          }}
        >
          <Text style={[s.bubbleText, s.bubbleTextMine]} onTextLayout={onTextLayout}>
            {text}
          </Text>
        </LinearGradient>
      </View>
    );
  }

  // theirs
  return (
    <View
      style={[
        s.bubbleTheirs,
        s.bubbleShadowTheirs,
        {
          borderColor: theme.surface3,
          backgroundColor: theme.surface2,
          borderRadius: shape.borderRadius,
          paddingHorizontal: shape.paddingHorizontal,
          paddingVertical: shape.paddingVertical,
        },
      ]}
    >
      <Text style={[s.bubbleText, { color: theme.textSecondary }]} onTextLayout={onTextLayout}>
        {text}
      </Text>
    </View>
  );
}

export default function ChatMessageRow({
  item,
  isMine,
  showAvatar,
  showTimestamp,
  onPress,
  myDisplayName = 'You',
  myAvatarUrl,
}: Props) {
  const { theme } = useTheme();
  const isSystem = item.messageType === 'system';
  const timeLabel = formatChatMessageTime(item.createdAt);
  const content = item.content ?? '';

  if (isSystem) {
    return (
      <Pressable onPress={onPress} style={s.systemPress}>
        <ChatBubble content={content} variant="system" />
        {showTimestamp ? (
          <Text style={[s.systemTime, { color: theme.textMuted }]}>{timeLabel}</Text>
        ) : null}
      </Pressable>
    );
  }

  if (isMine) {
    return (
      <Pressable onPress={onPress} style={s.mineOuter}>
        <View style={s.mineRow}>
          <ChatBubble content={content} variant="mine" />
          {showAvatar ? (
            <UserAvatar name={myDisplayName} avatarUrl={myAvatarUrl} size={AVATAR_SIZE} />
          ) : (
            <View style={s.avatarSpacer} />
          )}
        </View>
        {showTimestamp ? (
          <Text style={[s.timestamp, s.timestampMine, { color: theme.textMuted }]}>
            {timeLabel}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={s.theirsOuter}>
      <View style={s.theirsRow}>
        {showAvatar ? (
          <UserAvatar
            name={item.sender.displayName}
            avatarUrl={item.sender.avatarUrl}
            size={AVATAR_SIZE}
          />
        ) : (
          <View style={s.avatarSpacer} />
        )}
        <ChatBubble content={content} variant="theirs" />
      </View>
      {showTimestamp ? (
        <Text style={[s.timestamp, s.timestampTheirs, { color: theme.textMuted }]}>
          {timeLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  mineOuter: { alignSelf: 'flex-end', maxWidth: '92%', marginBottom: 5 },
  theirsOuter: { alignSelf: 'flex-start', maxWidth: '92%', marginBottom: 5 },
  mineRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 10 },
  theirsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  avatarSpacer: { width: AVATAR_SLOT, height: AVATAR_SIZE },
  bubbleMine: { flexShrink: 1, maxWidth: '78%', overflow: 'hidden' },
  bubbleTheirs: { flexShrink: 1, maxWidth: '78%', borderWidth: 1 },
  bubbleShadowMine: Platform.select({
    ios: {
      shadowColor: '#7B4DFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {},
  }) as object,
  bubbleShadowTheirs: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  }) as object,
  bubbleText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bubbleTextMine: { color: '#FFFFFF' },
  timestamp: { fontFamily: fonts.caption, fontSize: 10, marginTop: 4 },
  timestampMine: { alignSelf: 'flex-start', marginLeft: 2 },
  timestampTheirs: { alignSelf: 'flex-end', marginRight: 2 },
  systemPress: { alignSelf: 'center', maxWidth: '90%', marginVertical: 4 },
  systemWrap: {
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.28)',
  },
  systemText: { fontFamily: fonts.body, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  systemTime: { fontFamily: fonts.caption, fontSize: 10, textAlign: 'center', marginTop: 4 },
});
