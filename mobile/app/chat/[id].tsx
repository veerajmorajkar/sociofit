import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import KeyboardStickyFooter from '@/components/ui/KeyboardStickyFooter';
import UserAvatar from '@/components/ui/UserAvatar';
import ChatMessageRow from '@/components/messages/ChatMessageRow';
import ChatComposer from '@/components/messages/ChatComposer';
import ChatDaySeparator from '@/components/messages/ChatDaySeparator';
import ConversationTypeBadge from '@/components/messages/ConversationTypeBadge';
import ChatMembersSheet from '@/components/messages/ChatMembersSheet';
import {
  useChatMessages,
  useConversation,
  useSendMessage,
  useMarkConversationRead,
} from '@/hooks/useMessages';
import { useAuthStore } from '@/stores/authStore';
import { fonts, radius, gradients } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useBottomBarScrollPadding } from '@/constants/composer';
import { getConversationPresentation, getReadOnlyBannerText } from '@/constants/messaging';
import { buildChatListItems, type ChatListItem } from '@/utils/chatList';
import type { ConversationDetail, ConversationType, Message } from '@/types/message';

function shouldShowAvatar(messages: Message[], index: number): boolean {
  const current = messages[index];
  if (!current || current.messageType === 'system') return true;
  const prev = messages[index - 1];
  if (!prev || prev.messageType === 'system') return true;
  if (prev.senderId !== current.senderId) return true;
  const gap = new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap > 5 * 60 * 1000;
}

function getChatHeaderName(
  convType: ConversationType,
  presentation: ReturnType<typeof getConversationPresentation>,
): string {
  if (convType === 'dm') return presentation.title;
  return presentation.title;
}

export default function ChatScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore((s) => s.user?.id);
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [revealedTimestampId, setRevealedTimestampId] = useState<string | null>(null);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const scrollBottomPad = useBottomBarScrollPadding();

  const { data: conversation, isLoading: convLoading } = useConversation(id ?? '');
  const { data: messageData, isLoading: msgsLoading, isError, refetch } = useChatMessages(id ?? '');
  const messages = messageData?.messages;
  const permissions = messageData?.permissions ?? conversation?.permissions;
  const { mutate: send, isPending: sending } = useSendMessage(id ?? '');
  const { mutate: markRead } = useMarkConversationRead();

  const convType = (conversation?.type ?? 'dm') as ConversationType;
  const presentation = conversation
    ? getConversationPresentation(conversation)
    : { title: 'Chat', subtitle: null, avatarName: 'Chat', avatarUrl: null };

  const chatHeaderName = getChatHeaderName(convType, presentation);

  const otherUserId = useMemo(() => {
    const participants = conversation?.participants ?? [];
    if (convType === 'dm') {
      return participants.find((p) => p.id !== myId)?.id ?? null;
    }
    return null;
  }, [conversation?.participants, convType, myId]);

  const sheetMembers = useMemo(() => {
    const participants = (conversation as ConversationDetail | undefined)?.participants ?? [];
    return [...participants].sort((a, b) => {
      if (a.role === 'owner') return -1;
      if (b.role === 'owner') return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [conversation]);

  const onHeaderNamePress = useCallback(() => {
    if (convType === 'dm' && otherUserId) {
      router.push(`/profile/${otherUserId}` as never);
      return;
    }
    if (convType === 'group' || convType === 'event_chat') {
      setMembersSheetOpen(true);
      return;
    }
    if (convType === 'club_announcement' && conversation?.clubId) {
      router.push(`/profile/${conversation.clubId}` as never);
    }
  }, [convType, otherUserId, conversation?.clubId]);

  const headerNamePressable =
    (convType === 'dm' && !!otherUserId) ||
    convType === 'group' ||
    convType === 'event_chat' ||
    (convType === 'club_announcement' && !!conversation?.clubId);

  const canSend = permissions?.canSend ?? true;
  const readOnlyBanner = getReadOnlyBannerText(convType, permissions?.discussionPhase);
  const showHeaderTag = convType === 'group' || convType === 'event_chat';

  const ordered = useMemo(() => [...(messages ?? [])].reverse(), [messages]);
  const listItems = useMemo(() => buildChatListItems(ordered), [ordered]);

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

  const toggleTimestamp = useCallback((messageId: string) => {
    setRevealedTimestampId((prev) => (prev === messageId ? null : messageId));
  }, []);

  const onSend = () => {
    const content = text.trim();
    if (!content || !canSend) return;
    send(content, {
      onSuccess: () => {
        setText('');
        setRevealedTimestampId(null);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
      onError: (err) => {
        Alert.alert('Send failed', err instanceof Error ? err.message : 'Try again');
      },
    });
  };

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if (item.kind === 'day') {
        return <ChatDaySeparator label={item.label} />;
      }

      const { message, messageIndex } = item;
      return (
        <ChatMessageRow
          item={message}
          isMine={message.senderId === myId}
          showAvatar={shouldShowAvatar(ordered, messageIndex)}
          showTimestamp={revealedTimestampId === message.id}
          onPress={() => toggleTimestamp(message.id)}
          myDisplayName={user?.displayName}
          myAvatarUrl={user?.avatarUrl}
        />
      );
    },
    [ordered, myId, revealedTimestampId, toggleTimestamp, user?.displayName, user?.avatarUrl],
  );

  const isLoading = convLoading || msgsLoading;

  if (isLoading) {
    return (
      <View style={[s.centered, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="large" color={theme.tealPrimary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[s.centered, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[s.err, { color: theme.textPrimary }]}>Couldn't load chat</Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          style={[s.retryBtn, { backgroundColor: theme.tealPrimary }]}
        >
          <Text style={[s.retryText, { color: theme.onTeal }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const composerPlaceholder = canSend ? 'Message...' : 'Read-only channel';

  const isDiscussionClosed =
    convType === 'event_chat' && permissions?.discussionPhase === 'organiser_only';

  return (
    <View style={[s.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']} style={[s.headerSafe, { backgroundColor: theme.bgPrimary }]}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            hitSlop={10}
            activeOpacity={0.75}
          >
            <ChevronLeft size={24} strokeWidth={2} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <TouchableOpacity
              onPress={onHeaderNamePress}
              disabled={!headerNamePressable}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 12 }}
              style={s.headerIdentity}
              accessibilityRole="button"
              accessibilityLabel={
                convType === 'dm'
                  ? `View ${chatHeaderName}'s profile`
                  : convType === 'group' || convType === 'event_chat'
                    ? `View members of ${chatHeaderName}`
                    : chatHeaderName
              }
            >
              {(convType === 'group' || convType === 'event_chat') && sheetMembers.length > 0 ? (
                <View style={s.avatarStack}>
                  {sheetMembers.slice(0, 3).map((m, i) => (
                    <View
                      key={m.id}
                      style={[
                        s.avatarStackItem,
                        {
                          marginLeft: i === 0 ? 0 : -12,
                          borderColor: theme.bgPrimary,
                          zIndex: 3 - i,
                        },
                      ]}
                    >
                      <UserAvatar name={m.displayName} avatarUrl={m.avatarUrl} size={28} />
                    </View>
                  ))}
                </View>
              ) : (
                <UserAvatar
                  name={presentation.avatarName}
                  avatarUrl={presentation.avatarUrl}
                  size={34}
                />
              )}
              <View style={s.headerTextCol}>
                <Text style={[s.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  {chatHeaderName}
                </Text>
                {presentation.subtitle || convType === 'group' || convType === 'event_chat' ? (
                  <Text style={[s.headerSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                    {convType === 'group' || convType === 'event_chat'
                      ? `${presentation.subtitle ?? ''} · tap for details`
                      : presentation.subtitle}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>

          <View style={s.headerRight}>
            {showHeaderTag ? <ConversationTypeBadge type={convType} compact /> : null}
          </View>
        </View>
        <View style={[s.headerLine, { backgroundColor: theme.surface3 }]} />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={s.keyboardFrame}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          style={s.list}
          data={listItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[s.listContent, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <LinearGradient
                colors={[...gradients.storyRing]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.emptyRing}
              >
                <View style={[s.emptyRingInner, { backgroundColor: theme.insetWell }]}>
                  {convType === 'dm' ? (
                    <UserAvatar
                      name={presentation.avatarName}
                      avatarUrl={presentation.avatarUrl}
                      size={56}
                    />
                  ) : (
                    <MessageCircle size={28} strokeWidth={1.5} color={theme.purpleSoft} />
                  )}
                </View>
              </LinearGradient>
              <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>
                {canSend
                  ? convType === 'dm'
                    ? `Say hello to ${chatHeaderName}`
                    : 'Kick off the conversation'
                  : 'No messages yet'}
              </Text>
              {canSend ? (
                <Text style={[s.emptyChat, { color: theme.textMuted }]}>
                  {convType === 'dm'
                    ? 'Messages are private between the two of you'
                    : 'Be the first one to post here'}
                </Text>
              ) : null}
            </View>
          }
        />

        <KeyboardStickyFooter variant="chat">
          <ChatComposer
            value={text}
            onChangeText={setText}
            onSubmit={onSend}
            sending={sending}
            disabled={!canSend}
            readOnlyMessage={!canSend ? readOnlyBanner : null}
            readOnlyTone={
              convType === 'club_announcement' || isDiscussionClosed ? 'gold' : 'default'
            }
            placeholder={composerPlaceholder}
          />
        </KeyboardStickyFooter>
      </KeyboardAvoidingView>

      <ChatMembersSheet
        visible={membersSheetOpen}
        title={chatHeaderName}
        members={sheetMembers}
        onClose={() => setMembersSheetOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerSafe: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  headerTextCol: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontFamily: fonts.caption,
    fontSize: 11,
    marginTop: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStackItem: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  headerRight: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerLine: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  keyboardFrame: { flex: 1 },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  err: { fontFamily: fonts.h2, marginBottom: 12 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  retryText: { fontFamily: fonts.button },
  emptyWrap: { paddingTop: 56, paddingHorizontal: 24, alignItems: 'center' },
  emptyRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRingInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyChat: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
});
