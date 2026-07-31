import { type RefObject } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Send } from 'lucide-react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { COMPOSER_ROW_HEIGHT } from '@/constants/composer';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  inputRef?: RefObject<TextInput | null>;
  displayName?: string;
  avatarUrl?: string | null;
}

export default function CommentComposer({
  value,
  onChangeText,
  onSubmit,
  sending = false,
  placeholder = 'Add a comment...',
  inputRef,
  displayName = 'You',
  avatarUrl,
  disabled = false,
}: Props) {
  const { theme } = useTheme();
  const canSend = !disabled && value.trim().length > 0 && !sending;

  return (
    <View style={[s.row, disabled && s.rowDisabled]}>
      <View style={s.avatarSlot}>
        <UserAvatar name={displayName} avatarUrl={avatarUrl} size={34} ring />
      </View>
      <View
        style={[
          s.inputWrap,
          { backgroundColor: theme.surface2, borderColor: theme.surface3 },
          disabled && {
            backgroundColor: theme.surface2,
            borderColor: theme.surface3,
            opacity: 0.65,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[s.input, { color: theme.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={onSubmit}
          editable={!disabled}
        />
      </View>
      <TouchableOpacity
        onPress={onSubmit}
        disabled={!canSend}
        style={[
          s.sendBtn,
          { backgroundColor: theme.tealPrimary, ...theme.shadows.teal },
          !canSend && s.sendBtnDisabled,
        ]}
        activeOpacity={0.85}
      >
        {sending ? (
          <ActivityIndicator size="small" color={theme.onTeal} />
        ) : (
          <Send size={16} strokeWidth={2.5} color={theme.onTeal} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowDisabled: { opacity: 0.72 },
  avatarSlot: {
    width: 38,
    height: COMPOSER_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    minHeight: COMPOSER_ROW_HEIGHT,
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  input: {
    minHeight: COMPOSER_ROW_HEIGHT - 2,
    maxHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: COMPOSER_ROW_HEIGHT,
    height: COMPOSER_ROW_HEIGHT,
    borderRadius: COMPOSER_ROW_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
