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
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { COMPOSER_ROW_HEIGHT } from '@/constants/composer';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  sending?: boolean;
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
}: Props) {
  const canSend = value.trim().length > 0 && !sending;

  return (
    <View style={s.row}>
      <View style={s.avatarSlot}>
        <UserAvatar name={displayName} avatarUrl={avatarUrl} size={34} ring />
      </View>
      <View style={s.inputWrap}>
        <TextInput
          ref={inputRef}
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={onSubmit}
        />
      </View>
      <TouchableOpacity
        onPress={onSubmit}
        disabled={!canSend}
        style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
        activeOpacity={0.85}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.onTeal} />
        ) : (
          <Send size={16} strokeWidth={2.5} color={colors.onTeal} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    paddingBottom: 6,
  },
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
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surface3,
    paddingHorizontal: 4,
  },
  input: {
    minHeight: COMPOSER_ROW_HEIGHT - 2,
    maxHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: COMPOSER_ROW_HEIGHT,
    height: COMPOSER_ROW_HEIGHT,
    borderRadius: COMPOSER_ROW_HEIGHT / 2,
    backgroundColor: colors.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.teal,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
