import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { fonts, radius } from '@/constants/theme';
import { onVideo } from './onVideoColors';

interface Props extends Omit<TextInputProps, 'secureTextEntry'> {
  containerStyle?: StyleProp<ViewStyle>;
  /** Extra style merged into the TextInput (e.g. per-screen padding). */
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * On-video password input with a show/hide visibility toggle.
 * Visual-only wrapper — value/handlers are passed straight through.
 */
export default function PasswordInput({ containerStyle, inputStyle, style, ...inputProps }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[s.wrap, containerStyle]}>
      <TextInput
        // on-video glass input: always light over dark video
        style={[s.input, inputStyle, style]}
        placeholderTextColor={onVideo.textFaint}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
      />
      <Pressable
        style={s.toggle}
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <EyeOff size={20} strokeWidth={2} color={onVideo.textMuted} />
        ) : (
          <Eye size={20} strokeWidth={2} color={onVideo.textMuted} />
        )}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'relative', justifyContent: 'center' },
  input: {
    borderRadius: radius.md,
    paddingLeft: 16,
    paddingRight: 52,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    color: onVideo.text,
    borderWidth: 1,
    borderColor: onVideo.inputBorder,
    backgroundColor: onVideo.inputBg,
  },
  toggle: {
    // 44x44 minimum touch target, vertically centered on the field
    position: 'absolute',
    right: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
