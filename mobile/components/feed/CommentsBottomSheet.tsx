import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Keyboard,
  Dimensions,
  PanResponder,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserAvatar from '@/components/ui/UserAvatar';
import CommentComposer from '@/components/feed/CommentComposer';
import { usePostComments, useAddComment } from '@/hooks/usePosts';
import { useAuthStore } from '@/stores/authStore';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { timeAgo } from '@/utils/formatDate';
import type { Comment } from '@/types/post';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.62);
const MIN_SHEET_H = 220;
const NOTCH_GAP = 12;
const DISMISS_DRAG_PX = 72;
const KEYBOARD_EASING = Easing.bezier(0.33, 0.99, 0.52, 1);
const DISMISS_EASING = Easing.out(Easing.cubic);

interface Props {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export default function CommentsBottomSheet({ visible, postId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const sheetY = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const baseYRef = useRef(0);
  const currentHeightRef = useRef(SHEET_HEIGHT);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [text, setText] = useState('');
  const user = useAuthStore((s) => s.user);

  const dismissSheet = useCallback(() => {
    const target = currentHeightRef.current - baseYRef.current;
    Animated.timing(dragY, {
      toValue: target,
      duration: 220,
      easing: DISMISS_EASING,
      useNativeDriver: true,
    }).start(() => {
      dragY.setValue(0);
      baseYRef.current = 0;
      onCloseRef.current();
    });
  }, [dragY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 2,
        onPanResponderGrant: () => {
          dragY.stopAnimation((value) => {
            dragY.setOffset(value);
            dragY.setValue(0);
          });
        },
        onPanResponderMove: (_, g) => {
          dragY.setValue(Math.max(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          dragY.flattenOffset();
          const dismissTarget = currentHeightRef.current - baseYRef.current;
          if (g.dy > DISMISS_DRAG_PX || g.vy > 0.75 || g.dy > dismissTarget * 0.28) {
            dismissSheet();
            return;
          }
          Animated.spring(dragY, {
            toValue: 0,
            damping: 24,
            stiffness: 320,
            mass: 0.85,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          dragY.flattenOffset();
          Animated.spring(dragY, {
            toValue: 0,
            damping: 24,
            stiffness: 320,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dismissSheet, dragY],
  );

  const {
    data: pages,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePostComments(visible ? postId : '');
  const { mutate: submitComment, isPending: sending } = useAddComment(postId);
  const comments = pages?.pages.flatMap((p) => p.data) ?? [];

  useEffect(() => {
    if (!visible) {
      sheetY.setValue(0);
      dragY.setValue(0);
      sheetHeight.setValue(SHEET_HEIGHT);
      baseYRef.current = 0;
      currentHeightRef.current = SHEET_HEIGHT;
      return;
    }
    const duration = (e?: KeyboardEvent) => {
      const sys = e?.duration ?? 250;
      return Platform.OS === 'ios' ? Math.round(sys * 0.72) : 180;
    };
    const animateTo = (y: number, height: number, e?: KeyboardEvent) => {
      sheetY.stopAnimation();
      sheetHeight.stopAnimation();
      dragY.stopAnimation();
      dragY.setValue(0);
      dragY.setOffset(0);
      baseYRef.current = y;
      currentHeightRef.current = height;
      const ms = duration(e);
      Animated.parallel([
        Animated.timing(sheetY, {
          toValue: y,
          duration: ms,
          easing: KEYBOARD_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(sheetHeight, {
          toValue: height,
          duration: ms,
          easing: KEYBOARD_EASING,
          useNativeDriver: false,
        }),
      ]).start();
    };
    const onShow = (e: KeyboardEvent) => {
      const keyboardTop = e.endCoordinates.screenY;
      const minSheetTop = insets.top + NOTCH_GAP;
      const available = keyboardTop - minSheetTop;
      const targetHeight = Math.max(MIN_SHEET_H, Math.min(SHEET_HEIGHT, available));
      animateTo(keyboardTop - SCREEN_H, targetHeight, e);
    };
    const onHide = (e: KeyboardEvent) => {
      animateTo(0, SHEET_HEIGHT, e);
    };
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
      sheetY.setValue(0);
      dragY.setValue(0);
      sheetHeight.setValue(SHEET_HEIGHT);
      baseYRef.current = 0;
      currentHeightRef.current = SHEET_HEIGHT;
    };
  }, [visible, insets.top, sheetY, dragY, sheetHeight]);

  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!content || sending) return;
    submitComment(content, {
      onSuccess: () => {
        setText('');
        inputRef.current?.blur();
      },
      onError: (err) => {
        Alert.alert('Comment failed', err instanceof Error ? err.message : 'Try again');
      },
    });
  }, [text, sending, submitComment]);

  const renderComment = ({ item }: { item: Comment }) => (
    <View
      style={[
        s.commentBubble,
        { backgroundColor: theme.surface2, borderColor: theme.surface3, ...theme.shadows.sm },
      ]}
    >
      <View style={s.commentTopRow}>
        <View style={s.commentAvatarSlot}>
          <UserAvatar
            name={item.author.displayName}
            avatarUrl={item.author.avatarUrl}
            size={30}
            ring
          />
        </View>
        <View style={s.commentHeader}>
          <Text style={[s.commentAuthor, { color: theme.textPrimary }]} numberOfLines={1}>
            {item.author.displayName}
          </Text>
          <Text style={[s.commentTime, { color: theme.textMuted }]}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>
      <Text style={[s.commentText, { color: theme.textSecondary }]}>{item.content}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View style={[s.sheetWrap, { height: sheetHeight, ...theme.shadows.lg }]}>
          <Animated.View
            style={[s.sheetLift, { transform: [{ translateY: Animated.add(sheetY, dragY) }] }]}
          >
            <View
              style={[s.sheet, { backgroundColor: theme.surface1, borderColor: theme.surface3 }]}
            >
              <View style={s.sheetRim} pointerEvents="none" />

              <View style={s.dragZone} {...panResponder.panHandlers}>
                <View style={[s.handle, { backgroundColor: theme.surface3 }]} />
                <View style={s.header}>
                  <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Comments</Text>
                </View>
              </View>

              {isLoading ? (
                <View style={s.centered}>
                  <ActivityIndicator color={theme.tealPrimary} />
                </View>
              ) : isError ? (
                <View style={s.centered}>
                  <Text style={[s.emptyText, { color: theme.textMuted }]}>
                    Could not load comments
                  </Text>
                  <TouchableOpacity
                    onPress={() => void refetch()}
                    style={[
                      s.retryBtn,
                      { backgroundColor: theme.surface2, borderColor: theme.surface3 },
                    ]}
                  >
                    <Text style={[s.retryText, { color: theme.tealPrimary }]}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={(item) => item.id}
                  renderItem={renderComment}
                  style={s.list}
                  contentContainerStyle={[s.listContent, comments.length === 0 && s.listEmpty]}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  ListEmptyComponent={
                    <Text style={[s.emptyText, { color: theme.textMuted }]}>
                      No comments yet. Start the conversation.
                    </Text>
                  }
                  ListFooterComponent={
                    hasNextPage ? (
                      <TouchableOpacity
                        style={s.loadMore}
                        onPress={() => void fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? (
                          <ActivityIndicator size="small" color={theme.tealPrimary} />
                        ) : (
                          <Text style={[s.loadMoreText, { color: theme.tealPrimary }]}>
                            Load older comments
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : null
                  }
                />
              )}

              <View
                style={[
                  s.composerSafe,
                  {
                    paddingBottom: Math.max(10, insets.bottom - 12),
                    borderTopColor: theme.surface3,
                    backgroundColor: theme.surface1,
                  },
                ]}
              >
                <CommentComposer
                  inputRef={inputRef}
                  value={text}
                  onChangeText={setText}
                  onSubmit={handleSend}
                  sending={sending}
                  displayName={user?.displayName}
                  avatarUrl={user?.avatarUrl}
                />
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: { width: '100%' },
  sheetLift: { flex: 1, width: '100%' },
  sheet: {
    flex: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  sheetRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.035)',
    zIndex: 1,
  },
  dragZone: { alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 6 },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  headerTitle: { fontFamily: fonts.h2, fontSize: 16, textAlign: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 10 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  retryText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  commentBubble: { padding: 12, borderRadius: radius.lg, borderWidth: 1 },
  commentTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  commentAvatarSlot: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  commentAuthor: { fontFamily: fonts.bodyStrong, fontSize: 13, flex: 1, minWidth: 0 },
  commentTime: { fontFamily: fonts.caption, fontSize: 11 },
  commentText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  loadMore: { alignItems: 'center', paddingVertical: 12 },
  loadMoreText: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 0.5 },
  composerSafe: { paddingHorizontal: 16, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
});
