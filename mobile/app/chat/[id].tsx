import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import KeyboardStickyFooter from '@/components/ui/KeyboardStickyFooter';
import { useChatMessages, useSendMessage, useMarkConversationRead } from '@/hooks/useMessages';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius } from '@/constants/theme';
import { useBottomBarScrollPadding } from '@/constants/composer';
import { timeAgo } from '@/utils/formatDate';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);
  const scrollBottomPad = useBottomBarScrollPadding();

  const { data: messages, isLoading, isError, refetch } = useChatMessages(id ?? '');
  const { mutate: send, isPending: sending } = useSendMessage(id ?? '');
  const { mutate: markRead } = useMarkConversationRead();

  const ordered = [...(messages ?? [])].reverse();

  useEffect(() => {
    if (id && messages && messages.length > 0) {
      markRead(id);
    }
  }, [id, messages?.length, markRead]);

  useEffect(() => {
    if (ordered.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [ordered.length]);

  const onSend = () => {
    const content = text.trim();
    if (!content) return;
    send(content, {
      onSuccess: () => {
        setText('');
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
      onError: (err) => {
        Alert.alert('Send failed', err instanceof Error ? err.message : 'Try again');
      },
    });
  };

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.tealPrimary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.centered}>
        <Text style={s.err}>COULDN'T LOAD CHAT</Text>
        <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <KeyboardAvoidingView
        style={s.keyboardFrame}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          style={s.list}
          data={ordered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[s.listContent, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => {
            const isMine = item.senderId === myId;
            return (
              <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
                {!isMine && <Text style={s.senderName}>{item.sender.displayName}</Text>}
                <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>{item.content ?? ''}</Text>
                <Text style={[s.bubbleTime, isMine && s.bubbleTimeMine]}>
                  {timeAgo(item.createdAt)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={s.emptyChat}>Say hello — start the conversation</Text>}
        />

        <KeyboardStickyFooter style={s.chatFooter}>
          <View style={s.composer}>
            <TextInput
              style={s.input}
              placeholder="Message..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              onPress={onSend}
              disabled={sending || !text.trim()}
              style={[s.sendBtn, (!text.trim() || sending) && s.sendDisabled]}
            >
              {sending ? (
                <ActivityIndicator color={colors.onTeal} size="small" />
              ) : (
                <Send size={18} color={colors.onTeal} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardStickyFooter>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  keyboardFrame: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 10 },
  centered: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  err: { fontFamily: fonts.h2, color: colors.textPrimary, marginBottom: 12 },
  retryBtn: {
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryText: { fontFamily: fonts.button, color: colors.onTeal },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.surface3,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.tealPrimary,
    borderColor: colors.tealPrimary,
  },
  bubbleTheirs: {},
  senderName: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.purpleSoft,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  bubbleText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bubbleTextMine: { color: colors.onTeal },
  bubbleTime: {
    fontFamily: fonts.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: { color: 'rgba(0,0,0,0.45)' },
  emptyChat: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  chatFooter: {
    paddingHorizontal: 12,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 100,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface3,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
});
