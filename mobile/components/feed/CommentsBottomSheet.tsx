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
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { timeAgo } from '@/utils/formatDate';
import type { Comment } from '@/types/post';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.62);
const MIN_SHEET_H = 220;
const NOTCH_GAP = 12;
const DISMISS_DRAG_PX = 72;
/** Snappy keyboard sync — slightly faster than system default */
const KEYBOARD_EASING = Easing.bezier(0.33, 0.99, 0.52, 1);
const DISMISS_EASING = Easing.out(Easing.cubic);

interface Props {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export default function CommentsBottomSheet({ visible, postId, onClose }: Props) {
  const insets = useSafeAreaInsets();
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

  /*
   * Fit sheet between notch gap and keyboard top — shrink height + lift bottom
   * so the header never crosses the safe area.
   */
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
      const targetY = keyboardTop - SCREEN_H;
      animateTo(targetY, targetHeight, e);
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
    <View style={s.commentCard}>
      <UserAvatar name={item.author.displayName} avatarUrl={item.author.avatarUrl} size={34} ring />
      <View style={s.commentBody}>
        <View style={s.commentHeader}>
          <Text style={s.commentAuthor}>{item.author.displayName}</Text>
          <Text style={s.commentTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={s.commentText}>{item.content}</Text>
      </View>
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

        {/* Height (JS driver) and translateY (native driver) must be on separate nodes */}
        <Animated.View style={[s.sheetWrap, { height: sheetHeight }]}>
          <Animated.View
            style={[s.sheetLift, { transform: [{ translateY: Animated.add(sheetY, dragY) }] }]}
          >
            <View style={s.sheet}>
              <View style={s.sheetRim} pointerEvents="none" />

              <View style={s.dragZone} {...panResponder.panHandlers}>
                <View style={s.handle} />
                <View style={s.header}>
                  <Text style={s.headerTitle}>Comments</Text>
                </View>
              </View>

              {isLoading ? (
                <View style={s.centered}>
                  <ActivityIndicator color={colors.tealPrimary} />
                </View>
              ) : isError ? (
                <View style={s.centered}>
                  <Text style={s.emptyText}>Could not load comments</Text>
                  <TouchableOpacity onPress={() => void refetch()} style={s.retryBtn}>
                    <Text style={s.retryText}>Retry</Text>
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
                    <Text style={s.emptyText}>No comments yet. Start the conversation.</Text>
                  }
                  ListFooterComponent={
                    hasNextPage ? (
                      <TouchableOpacity
                        style={s.loadMore}
                        onPress={() => void fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? (
                          <ActivityIndicator size="small" color={colors.tealPrimary} />
                        ) : (
                          <Text style={s.loadMoreText}>Load older comments</Text>
                        )}
                      </TouchableOpacity>
                    ) : null
                  }
                />
              )}

              <View style={s.composerSafe}>
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
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrap: {
    width: '100%',
    ...shadows.lg,
  },
  sheetLift: {
    flex: 1,
    width: '100%',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.surface3,
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
  dragZone: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface3,
    alignSelf: 'center',
    marginBottom: 6,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  headerTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surface3,
  },
  retryText: { fontFamily: fonts.bodyStrong, fontSize: 13, color: colors.tealPrimary },
  /* Received-bubble style — surface2 nested on surface1 sheet (§7.8) */
  commentCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surface3,
    ...shadows.sm,
  },
  commentBody: { flex: 1 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  commentAuthor: {
    fontFamily: fonts.bodyStrong,
    fontSize: 13,
    color: colors.textPrimary,
  },
  commentTime: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  commentText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadMore: { alignItems: 'center', paddingVertical: 12 },
  loadMoreText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.tealPrimary,
    letterSpacing: 0.5,
  },
  composerSafe: {
    backgroundColor: colors.surface1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
});
