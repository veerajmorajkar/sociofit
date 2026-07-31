import { View, Text, StyleSheet, type TextStyle } from 'react-native';
import { PASSWORD_HINT } from '@/utils/authValidation';
import { fonts } from '@/constants/theme';
import PasswordInput from '@/components/auth/PasswordInput';
import { onVideo } from '@/components/auth/onVideoColors';

interface Props {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  disabled?: boolean;
  onSubmit?: () => void;
  inputTextStyle?: TextStyle;
  showHint?: boolean;
}

export default function AuthPasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  disabled,
  onSubmit,
  inputTextStyle,
  showHint = true,
}: Props) {
  return (
    <View style={s.wrap}>
      <PasswordInput
        containerStyle={s.field}
        inputStyle={inputTextStyle}
        placeholder="Password"
        value={password}
        onChangeText={(text) => onPasswordChange(text.replace(/\s/g, '').slice(0, 128))}
        editable={!disabled}
        textContentType="newPassword"
        returnKeyType="next"
        accessibilityLabel="Password"
      />
      <PasswordInput
        containerStyle={s.confirmField}
        inputStyle={inputTextStyle}
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={(text) => onConfirmChange(text.replace(/\s/g, '').slice(0, 128))}
        editable={!disabled}
        textContentType="newPassword"
        returnKeyType={onSubmit ? 'done' : 'next'}
        onSubmitEditing={onSubmit}
        accessibilityLabel="Confirm password"
      />
      {showHint ? <Text style={s.hint}>{PASSWORD_HINT}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 8 },
  field: { marginBottom: 12 },
  confirmField: { marginBottom: 8 },
  hint: {
    fontFamily: fonts.caption,
    fontSize: 12,
    // on-video text: always light over dark video
    color: onVideo.textMuted,
    marginBottom: 12,
    lineHeight: 17,
  },
});
