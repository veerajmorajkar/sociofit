import {
  Animated,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import AuthFormShell from '@/components/auth/AuthFormShell';
import AuthCtaButton from '@/components/auth/AuthCtaButton';
import StaggeredListItem from '@/components/ui/StaggeredListItem';
import { onVideo } from '@/components/auth/onVideoColors';
import { resendVerification, verifyEmail } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { radius, fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { sanitizeEmailInput } from '@/utils/authValidation';
import { successHaptic } from '@/utils/haptics';

const RESEND_COOLDOWN_SEC = 30;
const CODE_LENGTH = 6;

interface OtpCellProps {
  digit: string;
  active: boolean;
}

function OtpCell({ digit, active }: OtpCellProps) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: active ? 1.06 : 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  }, [active, scale]);

  return (
    <Animated.View
      style={[
        s.cell,
        { transform: [{ scale }] },
        active && {
          borderColor: theme.tealPrimary,
          shadowColor: theme.tealPrimary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        },
      ]}
    >
      <Text style={s.cellDigit}>{digit}</Text>
    </Animated.View>
  );
}

export default function VerifyEmailScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ email?: string; maskedEmail?: string }>();
  const email = typeof params.email === 'string' ? sanitizeEmailInput(params.email) : '';
  const maskedEmail =
    typeof params.maskedEmail === 'string' && params.maskedEmail
      ? params.maskedEmail
      : email || 'your email';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SEC);
  const setAuth = useAuthStore((s) => s.setAuth);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendSeconds]);

  const handleVerify = async () => {
    if (!email) {
      Alert.alert('Missing email', 'Go back and sign up again.');
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmail({ email, code: code.trim() });
      if (!result.success) {
        Alert.alert('Verification failed', result.error ?? 'Try again.');
        return;
      }
      successHaptic();
      await setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
      router.replace('/(tabs)');
    } catch {
      Alert.alert(
        'Verification failed',
        'Could not reach the server. Check your internet connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendSeconds > 0) return;
    setLoading(true);
    try {
      await resendVerification({ email });
      setResendSeconds(RESEND_COOLDOWN_SEC);
      Alert.alert('Code sent', 'If that email needs verification, a new code is on its way.');
    } catch {
      Alert.alert(
        'Could not resend',
        'Could not reach the server. Check your internet connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const activeIndex = inputFocused && code.length < CODE_LENGTH ? code.length : -1;

  return (
    <AuthFormShell onBack={() => router.replace('/(auth)/login')}>
      <StaggeredListItem index={0}>
        <Text style={s.title}>Check your email</Text>
        <Text style={s.subtitle}>
          We sent a 6-digit code to {maskedEmail}. Enter it below to finish creating your account.
        </Text>
      </StaggeredListItem>

      <StaggeredListItem index={1}>
        <Text style={s.sectionLabel}>Verification code</Text>
        {/* Six visual cells driven by one hidden TextInput (standard OTP pattern). */}
        <Pressable
          style={s.cellRow}
          onPress={() => inputRef.current?.focus()}
          accessibilityRole="button"
          accessibilityLabel="Enter 6-digit verification code"
        >
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <OtpCell key={i} digit={code[i] ?? ''} active={i === activeIndex} />
          ))}
        </Pressable>
        <TextInput
          ref={inputRef}
          style={s.hiddenInput}
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          editable={!loading}
          maxLength={CODE_LENGTH}
          onSubmitEditing={() => void handleVerify()}
          returnKeyType="go"
          accessibilityLabel="Email verification code"
        />
      </StaggeredListItem>

      <StaggeredListItem index={2}>
        <AuthCtaButton
          label="Verify email"
          onPress={() => void handleVerify()}
          loading={loading}
          style={s.cta}
        />
      </StaggeredListItem>

      <StaggeredListItem index={3}>
        <View style={s.resendRow}>
          {resendSeconds > 0 ? (
            <View style={s.cooldownPill}>
              <Text style={s.cooldownLabel}>Resend code in</Text>
              <Text style={s.cooldownNum}>{resendSeconds}s</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => void handleResend()}
              disabled={loading}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Resend code"
            >
              <Text style={[s.resendText, { color: theme.tealPrimary }]}>Resend code</Text>
            </TouchableOpacity>
          )}
        </View>
      </StaggeredListItem>
    </AuthFormShell>
  );
}

const s = StyleSheet.create({
  // on-video text: always light over dark video
  title: { fontFamily: fonts.h1, fontSize: 28, color: onVideo.text, marginBottom: 8 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: onVideo.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: onVideo.label,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  cellRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  cell: {
    flex: 1,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    // on-video glass cell: always light over dark video
    borderColor: onVideo.inputBorder,
    backgroundColor: onVideo.inputBg,
  },
  cellDigit: {
    fontFamily: fonts.stat,
    fontSize: 24,
    color: onVideo.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  cta: { marginBottom: 16 },
  resendRow: { alignItems: 'center' },
  cooldownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: onVideo.hairline,
    backgroundColor: onVideo.inputBg,
  },
  cooldownLabel: {
    fontFamily: fonts.caption,
    fontSize: 13,
    color: onVideo.textMuted,
  },
  cooldownNum: {
    fontFamily: fonts.stat,
    fontSize: 14,
    color: onVideo.text,
  },
  resendText: { fontFamily: fonts.bodyStrong, fontSize: 14 },
});
