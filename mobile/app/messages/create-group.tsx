import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, X, Check } from 'lucide-react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import { useCreateGroup } from '@/hooks/useMessages';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAthletesSearch } from '@/hooks/useSearch';
import { useAuthStore } from '@/stores/authStore';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import type { UserSummary } from '@/types/user';

export default function CreateGroupScreen() {
  const { theme } = useTheme();
  const myId = useAuthStore((s) => s.user?.id);
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UserSummary[]>([]);
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: results = [], isFetching } = useAthletesSearch(debouncedQuery);
  const { mutate: create, isPending } = useCreateGroup();

  const selectedIds = useMemo(() => new Set(selected.map((u) => u.id)), [selected]);
  const filteredResults = results.filter((u) => u.id !== myId && !selectedIds.has(u.id));

  const toggleUser = (user: UserSummary) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user],
    );
  };
  const removeSelected = (userId: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== userId));
  };

  const onCreate = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Give your group a name.');
      return;
    }
    if (selected.length < 1) {
      Alert.alert('Add members', 'Pick at least one athlete for the group.');
      return;
    }
    create(
      { title: trimmed, memberIds: selected.map((u) => u.id) },
      {
        onSuccess: ({ conversationId }) => {
          router.replace(`/chat/${conversationId}` as never);
        },
        onError: (err) => {
          Alert.alert('Could not create group', err instanceof Error ? err.message : 'Try again');
        },
      },
    );
  };

  const canCreate = title.trim().length > 0 && selected.length > 0 && !isPending;

  return (
    <View style={[s.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']} style={[s.headerSafe, { borderBottomColor: theme.surface3 }]}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            hitSlop={10}
            activeOpacity={0.75}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} strokeWidth={1.75} color={theme.textPrimary} />
          </TouchableOpacity>

          <Text style={[s.headerTitle, { color: theme.textPrimary }]} pointerEvents="none">
            NEW GROUP
          </Text>

          <TouchableOpacity
            onPress={onCreate}
            disabled={!canCreate}
            style={[
              s.createBtn,
              { backgroundColor: theme.tealPrimary },
              !canCreate && s.createBtnDisabled,
            ]}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={theme.onTeal} />
            ) : (
              <Text style={[s.createBtnText, { color: theme.onTeal }]}>CREATE</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.body}>
          <Text style={[s.label, { color: theme.textMuted }]}>GROUP NAME</Text>
          <TextInput
            style={[
              s.titleInput,
              {
                color: theme.textPrimary,
                backgroundColor: theme.surface2,
                borderColor: theme.surface3,
              },
            ]}
            placeholder="Saturday run crew..."
            placeholderTextColor={theme.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />

          {selected.length > 0 ? (
            <View style={s.chipsWrap}>
              {selected.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={s.chip}
                  onPress={() => removeSelected(user.id)}
                  activeOpacity={0.8}
                >
                  <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size={22} />
                  <Text style={[s.chipText, { color: theme.tealPrimary }]} numberOfLines={1}>
                    {user.displayName}
                  </Text>
                  <X size={12} strokeWidth={2.5} color={theme.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <Text style={[s.label, { color: theme.textMuted }]}>ADD PEOPLE</Text>
          <View
            style={[s.searchWrap, { backgroundColor: theme.surface2, borderColor: theme.surface3 }]}
          >
            <Search size={16} strokeWidth={2} color={theme.textMuted} />
            <TextInput
              style={[s.searchInput, { color: theme.textPrimary }]}
              placeholder="Search by name or @username"
              placeholderTextColor={theme.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isFetching ? <ActivityIndicator size="small" color={theme.tealPrimary} /> : null}
          </View>

          <FlatList
            data={filteredResults}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.listContent}
            ListEmptyComponent={
              debouncedQuery.trim().length > 0 ? (
                <Text style={[s.emptySearch, { color: theme.textMuted }]}>No athletes found</Text>
              ) : (
                <Text style={[s.emptySearch, { color: theme.textMuted }]}>
                  Search to add members
                </Text>
              )
            }
            renderItem={({ item }) => {
              const picked = selectedIds.has(item.id);
              return (
                <TouchableOpacity
                  style={[s.personRow, { borderBottomColor: theme.surface3 }]}
                  onPress={() => toggleUser(item)}
                  activeOpacity={0.85}
                >
                  <UserAvatar name={item.displayName} avatarUrl={item.avatarUrl} size={42} ring />
                  <View style={s.personInfo}>
                    <Text style={[s.personName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    <Text style={[s.personHandle, { color: theme.textMuted }]} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.pickCircle,
                      { borderColor: theme.surface3 },
                      picked && {
                        backgroundColor: theme.tealPrimary,
                        borderColor: theme.tealPrimary,
                      },
                    ]}
                  >
                    {picked ? <Check size={14} strokeWidth={3} color={theme.onTeal} /> : null}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerSafe: { borderBottomWidth: StyleSheet.hairlineWidth },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    zIndex: 1,
  },
  headerTitle: {
    position: 'absolute',
    left: 72,
    right: 72,
    textAlign: 'center',
    fontFamily: fonts.h2,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  createBtn: {
    height: 32,
    minWidth: 72,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { fontFamily: fonts.button, fontSize: 11, letterSpacing: 0.4 },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  label: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  titleInput: {
    fontFamily: fonts.body,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '48%',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,200,172,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,200,172,0.24)',
  },
  chipText: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 12 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15 },
  listContent: { paddingBottom: 32 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  personInfo: { flex: 1, minWidth: 0 },
  personName: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  personHandle: { fontFamily: fonts.caption, fontSize: 12, marginTop: 1 },
  pickCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearch: { fontFamily: fonts.body, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
