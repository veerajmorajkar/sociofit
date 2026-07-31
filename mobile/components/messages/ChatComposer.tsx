import { useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { Plus, Send } from 'lucide-react-native';
import ChatReadOnlyBanner from '@/components/messages/ChatReadOnlyBanner';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { impactHaptic } from '@/utils/haptics';
import { COMPOSER_ROW_HEIGHT } from '@/constants/composer';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  sending?: boolean;
  disabled?: boolean;
  readOnlyMessage?: string | null;
  readOnlyTone?: 'default' | 'gold';
  placeholder?: string;
}

export default function ChatComposer({
  value,
  onChangeText,
  onSubmit,
  sending = false,
  disabled = false,
  readOnlyMessage,
  readOnlyTone = 'default',
  placeholder = 'Message...',
}: Props) {
  const { theme } = useTheme();
  const canSend = !disabled && value.trim().length > 0 && !sending;

  // Send button springs up when it becomes enabled instead of snapping opacity.
  const sendScale = useRef(new Animated.Value(canSend ? 1 : 0.82)).current;
  const sendOpacity = useRef(new Animated.Value(canSend ? 1 : 0.45)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sendScale, {
        toValue: canSend ? 1 : 0.82,
        useNativeDriver: true,
        damping: 12,
        stiffness: 220,
        mass: 0.7,
      }),
      Animated.timing(sendOpacity, {
        toValue: canSend ? 1 : 0.45,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [canSend, sendScale, sendOpacity]);

  if (disabled && readOnlyMessage) {
    return (
      <View style={s.readOnlyWrap}>
        <ChatReadOnlyBanner message={readOnlyMessage} tone={readOnlyTone} />
      </View>
    );
  }

  const handleSend = () => {
    if (!canSend) return;
    impactHaptic();
    onSubmit();
  };

  return (
    <View style={s.bar}>
      {/* Attachment slot — designed and reserved; wiring media is a later pass. */}
      <TouchableOpacity
        disabled
        style={[s.attachBtn, { backgroundColor: theme.surface2, borderColor: theme.surface3 }]}
        accessibilityLabel="Add attachment (coming soon)"
        accessibilityState={{ disabled: true }}
      >
        <Plus size={18} strokeWidth={2.25} color={theme.textMuted} />
      </TouchableOpacity>

      <View
        style={[
          s.inputWrap,
          { backgroundColor: theme.surface2, borderColor: theme.surface3 },
          disabled && s.inputWrapDisabled,
        ]}
      >
        <TextInput
          style={[s.input, { color: theme.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={2000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          editable={!disabled}
          selectionColor={theme.purpleHero}
        />
      </View>

      <Animated.View style={{ transform: [{ scale: sendScale }], opacity: sendOpacity }}>
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[s.sendBtn, { backgroundColor: theme.tealPrimary, ...theme.shadows.teal }]}
          activeOpacity={0.85}
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
        >
          {sending ? (
            <ActivityIndicator size="small" color={theme.onTeal} />
          ) : (
            <Send size={18} strokeWidth={2.5} color={theme.onTeal} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingVertical: 8 },
  attachBtn: {
    width: COMPOSER_ROW_HEIGHT,
    height: COMPOSER_ROW_HEIGHT,
    borderRadius: COMPOSER_ROW_HEIGHT / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  inputWrap: {
    flex: 1,
    minHeight: COMPOSER_ROW_HEIGHT,
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  inputWrapDisabled: { opacity: 0.65 },
  input: {
    flex: 1,
    minHeight: COMPOSER_ROW_HEIGHT - 2,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontFamily: fonts.body,
    fontSize: 15,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: COMPOSER_ROW_HEIGHT,
    height: COMPOSER_ROW_HEIGHT,
    borderRadius: COMPOSER_ROW_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readOnlyWrap: { paddingVertical: 8 },
});
