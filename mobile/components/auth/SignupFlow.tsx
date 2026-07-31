import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import AuthFormShell from '@/components/auth/AuthFormShell';
import AuthCtaButton from '@/components/auth/AuthCtaButton';
import AuthDateOfBirthField from '@/components/auth/AuthDateOfBirthField';
import AuthPasswordFields from '@/components/auth/AuthPasswordFields';
import ActivityPicker from '@/components/auth/ActivityPicker';
import AccountTypeIcon from '@/components/auth/AccountTypeIcon';
import StaggeredListItem from '@/components/ui/StaggeredListItem';
import { onVideo } from '@/components/auth/onVideoColors';
import { register } from '@/services/auth.service';
import { MIN_ACTIVITIES } from '@/constants/activities';
import { accountTypeSignupLabel, type AccountTypeValue } from '@/constants/accountType';
import { radius, fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import {
  sanitizeDisplayNameInput,
  sanitizeEmailInput,
  sanitizeUsernameInput,
  validateDisplayName,
  validateEmail,
  validatePasswordConfirm,
  validateUsername,
} from '@/utils/authValidation';
import { toBirthdateISO } from '@/utils/birthdate';

type Step = 'details' | 'activities';

interface Props {
  accountType: AccountTypeValue;
}

export default function SignupFlow({ accountType }: Props) {
  const { theme } = useTheme();
  const [step, setStep] = useState<Step>('details');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isClub = accountType === 'club';
  // Brand accent over the video: purple for clubs, teal for athletes.
  const accentBorder = isClub ? `${theme.purpleHero}A6` : `${theme.tealPrimary}8C`;

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const validateDetailsStep = (): boolean => {
    const nameError = validateDisplayName(displayName, isClub);
    if (nameError) {
      Alert.alert('Invalid name', nameError);
      return false;
    }
    const usernameError = validateUsername(username);
    if (usernameError) {
      Alert.alert('Invalid username', usernameError);
      return false;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      Alert.alert('Invalid email', emailError);
      return false;
    }
    if (!birthdate) {
      Alert.alert('Missing birthdate', 'Please select your date of birth.');
      return false;
    }
    const passwordError = validatePasswordConfirm(password, confirmPassword);
    if (passwordError) {
      Alert.alert('Invalid password', passwordError);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateDetailsStep()) return;
    setStep('activities');
  };

  const handleSignup = async () => {
    if (selectedActivities.length < MIN_ACTIVITIES) {
      Alert.alert('Select activities', `Please select at least ${MIN_ACTIVITIES} activities.`);
      return;
    }
    setLoading(true);
    try {
      const sanitizedEmail = sanitizeEmailInput(email);
      const result = await register({
        accountType,
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        email: sanitizedEmail,
        password,
        birthdate: toBirthdateISO(birthdate!),
        activities: selectedActivities,
      });

      if (result.success && result.data.needsEmailVerification) {
        router.replace({
          pathname: '/(auth)/verify-email',
          params: {
            email: result.data.email,
            maskedEmail: result.data.maskedEmail,
          },
        });
        return;
      }

      Alert.alert('Signup failed', result.error ?? 'Could not create account.');
    } catch {
      Alert.alert(
        'Connection error',
        'Could not reach the server. Check your internet connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormShell
      contentStyle={step === 'activities' ? s.scrollActivities : undefined}
      onBack={step === 'details' ? () => router.back() : () => setStep('details')}
    >
      <View style={s.stepRow}>
        <View style={[s.stepDot, { backgroundColor: theme.tealPrimary }]} />
        <View
          style={[s.stepLine, step === 'activities' && { backgroundColor: theme.tealPrimary }]}
        />
        <View
          style={[s.stepDot, step === 'activities' && { backgroundColor: theme.tealPrimary }]}
        />
      </View>

      <View style={[s.typeBadge, { borderColor: accentBorder }]}>
        <AccountTypeIcon type={accountType} size={28} selected />
        <Text style={s.typeBadgeLabel}>{accountTypeSignupLabel(accountType)} account</Text>
      </View>

      {step === 'details' ? (
        <>
          <StaggeredListItem index={0}>
            <Text style={s.title}>Create account</Text>
            <Text style={s.subtitle}>
              {isClub
                ? 'Set up your club profile on Mumbai Fitness Mafia.'
                : 'Join the community and find your next session.'}
            </Text>
          </StaggeredListItem>

          <StaggeredListItem index={1}>
            <TextInput
              style={s.input}
              placeholder={isClub ? 'Club name' : 'Full name'}
              placeholderTextColor={onVideo.textFaint}
              value={displayName}
              onChangeText={(text) => setDisplayName(sanitizeDisplayNameInput(text))}
              editable={!loading}
              autoCapitalize="words"
              maxLength={100}
              accessibilityLabel={isClub ? 'Club name' : 'Full name'}
            />
            <TextInput
              style={s.input}
              placeholder="Username"
              placeholderTextColor={onVideo.textFaint}
              value={username}
              onChangeText={(text) => setUsername(sanitizeUsernameInput(text))}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              maxLength={30}
              accessibilityLabel="Username"
            />
            <Text style={s.fieldHint}>
              Lowercase letters, numbers, and underscores only. No spaces.
            </Text>
          </StaggeredListItem>

          <StaggeredListItem index={2}>
            <Text style={s.sectionLabel}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="Email address"
              placeholderTextColor={onVideo.textFaint}
              value={email}
              onChangeText={(text) => setEmail(sanitizeEmailInput(text))}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
              maxLength={254}
              accessibilityLabel="Email input"
            />
          </StaggeredListItem>

          <StaggeredListItem index={3}>
            <View style={s.dobBlock}>
              <Text style={s.sectionLabel}>Date of birth</Text>
              <AuthDateOfBirthField value={birthdate} onChange={setBirthdate} disabled={loading} />
            </View>
          </StaggeredListItem>

          <StaggeredListItem index={4}>
            <AuthPasswordFields
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmChange={setConfirmPassword}
              disabled={loading}
              onSubmit={handleNextStep}
            />
          </StaggeredListItem>

          <StaggeredListItem index={5}>
            <AuthCtaButton label="Continue" onPress={handleNextStep} style={s.cta} />

            <View style={s.switchRow}>
              <Text style={s.switchLabel}>Already have an account? </Text>
              <Link href="/(auth)/login-options" asChild>
                <TouchableOpacity accessibilityRole="link">
                  <Text style={[s.switchAction, { color: theme.tealPrimary }]}>Log in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </StaggeredListItem>
        </>
      ) : (
        <>
          <StaggeredListItem index={0}>
            <Text style={s.title}>Your activities</Text>
            <Text style={s.subtitle}>
              Pick the sports you love.{'\n'}Select at least {MIN_ACTIVITIES}.
            </Text>
          </StaggeredListItem>

          <StaggeredListItem index={1}>
            <ActivityPicker selected={selectedActivities} onToggle={toggleActivity} />
          </StaggeredListItem>

          <StaggeredListItem index={2}>
            <AuthCtaButton
              label="Create account"
              onPress={() => void handleSignup()}
              disabled={selectedActivities.length < MIN_ACTIVITIES}
              loading={loading}
              style={s.cta}
            />
          </StaggeredListItem>
        </>
      )}
    </AuthFormShell>
  );
}

const s = StyleSheet.create({
  scrollActivities: { paddingBottom: 48 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
    width: 80,
  },
  // on-video chrome: inactive dots/lines stay light over dark video
  stepDot: { width: 10, height: 10, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.25)' },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  typeBadgeLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: onVideo.text,
    letterSpacing: 0.2,
  },
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
  fieldHint: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: onVideo.textFaint,
    marginTop: -6,
    marginBottom: 12,
  },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    marginBottom: 12,
    borderWidth: 1,
    // on-video glass input: always light over dark video
    color: onVideo.text,
    borderColor: onVideo.inputBorder,
    backgroundColor: onVideo.inputBg,
  },
  dobBlock: { marginBottom: 0 },
  cta: { marginBottom: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchLabel: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  switchAction: { fontFamily: fonts.bodyStrong, fontSize: 14 },
});
