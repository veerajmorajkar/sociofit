import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, Crown } from 'lucide-react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import type { ConversationParticipant } from '@/types/message';

interface Props {
  visible: boolean;
  title: string;
  members: ConversationParticipant[];
  onClose: () => void;
}

export default function ChatMembersSheet({ visible, title, members, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const openProfile = (userId: string) => {
    onClose();
    router.push(`/profile/${userId}` as never);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            s.sheet,
            {
              backgroundColor: theme.surface1,
              borderColor: theme.surface3,
              paddingBottom: Math.max(insets.bottom, 16),
              ...theme.shadows.lg,
            },
          ]}
        >
          <View style={[s.handle, { backgroundColor: theme.surface3 }]} />

          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={[s.title, { color: theme.textPrimary }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[s.subtitle, { color: theme.textMuted }]}>
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[s.closeBtn, { backgroundColor: theme.surface2, borderColor: theme.surface3 }]}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close members list"
            >
              <X size={18} strokeWidth={2} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            style={s.list}
            contentContainerStyle={s.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isHost = item.role === 'owner';
              return (
                <TouchableOpacity
                  style={[s.memberRow, { borderBottomColor: theme.surface2 }]}
                  onPress={() => openProfile(item.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.displayName}'s profile`}
                >
                  <View
                    style={[
                      s.avatarRing,
                      { borderColor: isHost ? theme.tealPrimary : 'transparent' },
                    ]}
                  >
                    <UserAvatar name={item.displayName} avatarUrl={item.avatarUrl} size={42} />
                  </View>
                  <View style={s.memberInfo}>
                    <Text style={[s.memberName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    <Text style={[s.memberHandle, { color: theme.textMuted }]} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>
                  {isHost ? (
                    <View
                      style={[
                        s.hostPill,
                        {
                          backgroundColor: 'rgba(0, 229, 195, 0.12)',
                          borderColor: 'rgba(0, 229, 195, 0.28)',
                        },
                      ]}
                    >
                      <Crown size={10} strokeWidth={2.5} color={theme.tealPrimary} />
                      <Text style={[s.hostPillText, { color: theme.tealPrimary }]}>Host</Text>
                    </View>
                  ) : item.accountType === 'club' ? (
                    <View
                      style={[
                        s.hostPill,
                        {
                          backgroundColor: 'rgba(201, 168, 76, 0.12)',
                          borderColor: 'rgba(201, 168, 76, 0.3)',
                        },
                      ]}
                    >
                      <Text style={[s.hostPillText, { color: theme.goldLight }]}>Club</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 12,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.h2,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: fonts.caption,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  list: { flexGrow: 0 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 1,
  },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  memberHandle: {
    fontFamily: fonts.caption,
    fontSize: 12,
    marginTop: 1,
  },
  hostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  hostPillText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
