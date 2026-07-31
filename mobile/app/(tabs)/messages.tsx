import { useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Search, Users, X } from 'lucide-react-native';
import ConversationRow from '@/components/messages/ConversationRow';
import PressableScale from '@/components/ui/PressableScale';
import StaggeredListItem from '@/components/ui/StaggeredListItem';
import { useConversations } from '@/hooks/useMessages';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useTealRefresh } from '@/hooks/useTealRefresh';
import { fonts, radius, gradients } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { getConversationPresentation } from '@/constants/messaging';
import { SCROLL_BOTTOM_PADDING } from '@/constants/layout';
import TabBarBottomFade from '@/components/ui/TabBarBottomFade';
import type { Conversation } from '@/types/message';

function matchesQuery(conv: Conversation, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { title, subtitle } = getConversationPresentation(conv);
  return (
    title.toLowerCase().includes(q) ||
    (subtitle ?? '').toLowerCase().includes(q) ||
    (conv.lastMessage?.content ?? '').toLowerCase().includes(q)
  );
}

export default function MessagesTab() {
  const { theme, pageBg } = useTheme();
  const { data: conversations, isLoading, isError, refetch } = useConversations();
  const { refreshListProps } = useTealRefresh(refetch);
  useRefreshOnFocus(refetch, 20_000);
  const [query, setQuery] = useState('');

  const count = conversations?.length ?? 0;

  const filtered = useMemo(
    () => (conversations ?? []).filter((c) => matchesQuery(c, query)),
    [conversations, query],
  );

  const searching = query.trim().length > 0;

  return (
    <View style={[s.root, { backgroundColor: pageBg }]}>
      <SafeAreaView edges={['top']} style={s.headerWrap}>
        <View style={s.header}>
          <View style={s.headerTextCol}>
            <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Messages</Text>
            {!isLoading && !isError && count > 0 ? (
              <Text style={[s.headerSubtitle, { color: theme.textMuted }]}>
                {count} {count === 1 ? 'conversation' : 'conversations'}
              </Text>
            ) : null}
          </View>
          <PressableScale
            onPress={() => router.push('/messages/create-group' as never)}
            haptic
            pressedScale={0.94}
            style={[
              s.newGroupBtn,
              { borderColor: theme.surface3, backgroundColor: theme.surface1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create a new group chat"
          >
            <LinearGradient
              colors={[...gradients.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.newGroupInner}
            >
              <Users size={14} strokeWidth={2.5} color={theme.onTeal} />
            </LinearGradient>
            <Text style={[s.newGroupLabel, { color: theme.tealPrimary }]}>New group</Text>
          </PressableScale>
        </View>

        {/* Inbox search — client-side filter, no data logic touched */}
        {count > 0 ? (
          <View style={s.searchWrap}>
            <View
              style={[
                s.searchField,
                { backgroundColor: theme.surface1, borderColor: theme.surface3 },
              ]}
            >
              <Search size={15} strokeWidth={2} color={theme.textMuted} />
              <TextInput
                style={[s.searchInput, { color: theme.textPrimary }]}
                placeholder="Search conversations"
                placeholderTextColor={theme.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                selectionColor={theme.purpleHero}
                accessibilityLabel="Search conversations"
              />
              {searching ? (
                <PressableScale
                  onPress={() => setQuery('')}
                  pressedScale={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  style={s.searchClear}
                >
                  <X size={14} strokeWidth={2.5} color={theme.textMuted} />
                </PressableScale>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={s.headerDivider}>
          <LinearGradient
            colors={['transparent', 'rgba(168, 130, 255, 0.22)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={s.headerDividerLine}
          />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={theme.tealPrimary} />
        </View>
      ) : isError ? (
        <View style={s.centered}>
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>Couldn't load messages</Text>
          <PressableScale
            onPress={() => void refetch()}
            haptic
            style={[s.primaryBtn, { backgroundColor: theme.tealPrimary, ...theme.shadows.teal }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading messages"
          >
            <Text style={[s.primaryBtnText, { color: theme.onTeal }]}>Retry</Text>
          </PressableScale>
        </View>
      ) : !conversations?.length ? (
        <View style={s.centered}>
          <View style={s.emptyIconRing}>
            <LinearGradient
              colors={[...gradients.storyRing]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.emptyIconRingGradient}
            >
              <View style={[s.emptyIconWrap, { backgroundColor: theme.insetWell }]}>
                <MessageCircle size={34} strokeWidth={1.5} color={theme.purpleSoft} />
              </View>
            </LinearGradient>
          </View>
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No conversations yet</Text>
          <Text style={[s.emptyBody, { color: theme.textMuted }]}>
            DM someone from their profile, join an event discussion, or start a group chat
          </Text>
          <PressableScale
            onPress={() => router.push('/messages/create-group' as never)}
            haptic
            style={[s.primaryBtn, { backgroundColor: theme.tealPrimary, ...theme.shadows.teal }]}
            accessibilityRole="button"
            accessibilityLabel="Create a group chat"
          >
            <Text style={[s.primaryBtnText, { color: theme.onTeal }]}>Create a group</Text>
          </PressableScale>
          <PressableScale
            onPress={() => router.push('/(tabs)/search' as never)}
            style={[s.secondaryBtn, { borderColor: theme.surface3 }]}
            accessibilityRole="button"
            accessibilityLabel="Find athletes to message"
          >
            <Text style={[s.secondaryBtnText, { color: theme.purpleSoft }]}>Find athletes</Text>
          </PressableScale>
        </View>
      ) : (
        <View style={s.listFrame}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) =>
              searching ? (
                <ConversationRow item={item} />
              ) : (
                <StaggeredListItem index={index}>
                  <ConversationRow item={item} />
                </StaggeredListItem>
              )
            }
            {...refreshListProps}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              <View style={s.noResults}>
                <Text style={[s.noResultsText, { color: theme.textMuted }]}>
                  No conversations match "{query.trim()}"
                </Text>
              </View>
            }
          />
          <TabBarBottomFade />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTextCol: { gap: 3 },
  headerTitle: {
    fontFamily: fonts.h1,
    fontSize: 22,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontFamily: fonts.caption,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  headerDivider: {
    paddingHorizontal: 28,
    paddingBottom: 4,
  },
  headerDividerLine: {
    height: 1,
    borderRadius: radius.full,
  },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 19,
    borderWidth: 1,
  },
  newGroupInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGroupLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchClear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFrame: { flex: 1 },
  listContent: {
    paddingTop: 10,
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconRing: {
    borderRadius: 40,
  },
  emptyIconRingGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyTitle: {
    fontFamily: fonts.h2,
    fontSize: 17,
    marginTop: 16,
    letterSpacing: 0.2,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: 22,
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: radius.full,
  },
  primaryBtnText: {
    fontFamily: fonts.button,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: fonts.button,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  noResults: {
    paddingTop: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
});
