import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { MoreVertical, EyeOff, Flag, ChevronLeft } from 'lucide-react-native';
import { useHideContent, useReportContent } from '@/hooks/useModeration';
import { REPORT_REASONS, hideLabelFor, reportLabelFor } from '@/constants/moderation';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { navInkForTone, type HeroNavTone } from '@/utils/heroTone';
import type { ModerationTargetType, ReportReason } from '@/types/moderation';

type SheetStep = 'actions' | 'reasons';

interface ContentActionsMenuProps {
  targetType: ModerationTargetType;
  targetId: string;
  targetTitle: string;
  isOwnContent?: boolean;
  variant?: 'glass' | 'nav' | 'icon';
  tone?: HeroNavTone;
  iconColor?: string;
  onHidden?: () => void;
}

export default function ContentActionsMenu({
  targetType,
  targetId,
  targetTitle,
  isOwnContent = false,
  variant = 'icon',
  tone = 'dark',
  iconColor,
  onHidden,
}: ContentActionsMenuProps) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<SheetStep>('actions');
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  const panelY = useRef(new Animated.Value(0)).current;
  const { mutate: reportContent, isPending: reporting } = useReportContent();
  const { mutate: hideItem, isPending: hiding } = useHideContent();

  const ink = iconColor ?? (variant === 'glass' ? navInkForTone(tone) : theme.textPrimary);
  const busy = reporting || hiding;
  const iconSize = 22;

  const resetSheet = useCallback(() => {
    setStep('actions');
    setSelectedReason(null);
    setDetails('');
    panelY.setValue(0);
  }, [panelY]);

  const closeSheet = useCallback(() => {
    Animated.timing(panelY, { toValue: 500, duration: 200, useNativeDriver: true }).start(() => {
      setVisible(false);
      resetSheet();
    });
  }, [panelY, resetSheet]);

  const openSheet = useCallback(() => {
    resetSheet();
    setVisible(true);
  }, [resetSheet]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) panelY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 90 || gs.vy > 1.2) closeSheet();
        else Animated.spring(panelY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    }),
  ).current;

  const onHide = () => {
    Alert.alert(hideLabelFor(targetType), `You will no longer see "${targetTitle}" in your feed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hide',
        onPress: () => {
          hideItem(
            { targetType, targetId },
            {
              onSuccess: () => {
                closeSheet();
                Alert.alert('Hidden', 'This content has been hidden from your view.');
                onHidden?.();
              },
              onError: (err) => {
                Alert.alert('Could not hide', err instanceof Error ? err.message : 'Try again');
              },
            },
          );
        },
      },
    ]);
  };

  const onSubmitReport = () => {
    if (!selectedReason) return;
    reportContent(
      { targetType, targetId, reason: selectedReason, description: details.trim() || undefined },
      {
        onSuccess: () => {
          closeSheet();
          Alert.alert(
            'Report submitted',
            'Thanks for letting us know. Our team will review this report.',
          );
        },
        onError: (err) => {
          Alert.alert('Report failed', err instanceof Error ? err.message : 'Try again');
        },
      },
    );
  };

  const trigger = (
    <View style={variant === 'nav' ? s.navSlot : variant === 'glass' ? s.glassSlot : s.iconSlot}>
      <Pressable
        onPress={openSheet}
        hitSlop={10}
        accessibilityLabel="More options"
        accessibilityRole="button"
        style={({ pressed }) => [pressed && s.menuBtnPressed]}
      >
        <MoreVertical size={iconSize} strokeWidth={2.25} color={ink} />
      </Pressable>
    </View>
  );

  return (
    <>
      {trigger}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={s.backdrop} onPress={closeSheet}>
          <Animated.View
            style={[
              s.panel,
              { backgroundColor: theme.surface1, borderColor: theme.surface3 },
              { transform: [{ translateY: panelY }] },
            ]}
            {...panResponder.panHandlers}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[s.handle, { backgroundColor: theme.surface3 }]} />

              {step === 'actions' ? (
                <>
                  {isOwnContent ? (
                    <Text style={[s.ownContentNote, { color: theme.textMuted }]}>
                      You can't hide or report your own content.
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      s.actionRow,
                      s.actionRowFirst,
                      { borderTopColor: theme.surface3 },
                      isOwnContent && s.actionRowDisabled,
                    ]}
                    onPress={onHide}
                    disabled={busy || isOwnContent}
                  >
                    <View style={[s.actionIconWrap, { backgroundColor: theme.surface2 }]}>
                      <EyeOff size={18} strokeWidth={1.75} color={theme.purpleSoft} />
                    </View>
                    <View style={s.actionTextCol}>
                      <Text style={[s.actionTitle, { color: theme.textPrimary }]}>
                        {hideLabelFor(targetType)}
                      </Text>
                      <Text style={[s.actionSub, { color: theme.textMuted }]}>
                        Remove from your feed
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      s.actionRow,
                      { borderTopColor: theme.surface3 },
                      isOwnContent && s.actionRowDisabled,
                    ]}
                    onPress={() => setStep('reasons')}
                    disabled={busy || isOwnContent}
                  >
                    <View style={[s.actionIconWrap, { backgroundColor: theme.surface2 }]}>
                      <Flag size={18} strokeWidth={1.75} color={theme.error} />
                    </View>
                    <View style={s.actionTextCol}>
                      <Text style={[s.actionTitle, { color: theme.textPrimary }]}>
                        {reportLabelFor(targetType)}
                      </Text>
                      <Text style={[s.actionSub, { color: theme.textMuted }]}>
                        Send to our moderation team
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={s.backRow} onPress={() => setStep('actions')}>
                    <ChevronLeft size={18} color={theme.purpleSoft} />
                    <Text style={[s.backText, { color: theme.purpleSoft }]}>Back</Text>
                  </TouchableOpacity>
                  <Text style={[s.panelTitle, { color: theme.purpleSoft }]}>REPORT</Text>
                  <Text style={[s.panelSubtitle, { color: theme.textSecondary }]}>
                    Why are you reporting this?
                  </Text>

                  {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason.id}
                      style={[
                        s.reasonRow,
                        { borderColor: theme.surface3, backgroundColor: theme.surface2 },
                        selectedReason === reason.id && {
                          borderColor: theme.tealPrimary,
                          backgroundColor: 'rgba(0,200,172,0.1)',
                        },
                      ]}
                      onPress={() => setSelectedReason(reason.id)}
                    >
                      <Text
                        style={[
                          s.reasonText,
                          { color: theme.textSecondary },
                          selectedReason === reason.id && {
                            fontFamily: fonts.bodyStrong,
                            color: theme.textPrimary,
                          },
                        ]}
                      >
                        {reason.label}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <TextInput
                    style={[
                      s.detailsInput,
                      {
                        borderColor: theme.surface3,
                        backgroundColor: theme.surface2,
                        color: theme.textPrimary,
                      },
                    ]}
                    placeholder="Additional details (optional)"
                    placeholderTextColor={theme.textMuted}
                    value={details}
                    onChangeText={setDetails}
                    multiline
                    maxLength={1000}
                  />

                  <TouchableOpacity
                    style={[
                      s.submitBtn,
                      { backgroundColor: theme.tealPrimary },
                      !selectedReason && s.submitBtnDisabled,
                    ]}
                    onPress={onSubmitReport}
                    disabled={!selectedReason || busy}
                  >
                    {reporting ? (
                      <ActivityIndicator color={theme.onTeal} />
                    ) : (
                      <Text style={[s.submitBtnText, { color: theme.onTeal }]}>SUBMIT REPORT</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  navSlot: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  glassSlot: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconSlot: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  menuBtnPressed: { opacity: 0.6 },
  ownContentNote: { fontFamily: fonts.caption, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  actionRowDisabled: { opacity: 0.4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  panel: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 16,
  },
  panelTitle: { fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 },
  panelSubtitle: { fontFamily: fonts.body, fontSize: 14, marginBottom: 18 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  actionRowFirst: { borderTopWidth: 0 },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: { flex: 1 },
  actionTitle: { fontFamily: fonts.bodyStrong, fontSize: 15, marginBottom: 2 },
  actionSub: { fontFamily: fonts.caption, fontSize: 12 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { fontFamily: fonts.caption, fontSize: 13 },
  reasonRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonText: { fontFamily: fonts.body, fontSize: 14 },
  detailsInput: {
    marginTop: 8,
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 16,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontFamily: fonts.button, fontSize: 14, letterSpacing: 0.5 },
});
