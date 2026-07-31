import { View, Text, TextInput, Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import AuthFormShell from '@/components/auth/AuthFormShell';
import AuthCtaButton from '@/components/auth/AuthCtaButton';
import AuthDateOfBirthField from '@/components/auth/AuthDateOfBirthField';
import ActivityPicker from '@/components/auth/ActivityPicker';
import AccountTypeIcon from '@/components/auth/AccountTypeIcon';
import StaggeredListItem from '@/components/ui/StaggeredListItem';
import { onVideo } from '@/components/auth/onVideoColors';
import { completeOAuthProfile } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { MIN_ACTIVITIES } from '@/constants/activities';
import { accountTypeSignupLabel, type AccountTypeValue } from '@/constants/accountType';
import { radius, fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { toBirthdateISO } from '@/utils/birthdate';
import {
  sanitizeDisplayNameInput,
  sanitizeUsernameInput,
  validateDisplayName,
  validateUsername,
} from '@/utils/authValidation';

type Step = 'details' | 'activities';

export default function OAuthCompleteScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    accountType?: string;
    displayName?: string;
    username?: string;
    email?: string;
    provider?: string;
  }>();

  const accountType = (params.accountType === 'club' ? 'club' : 'personal') as AccountTypeValue;
  const oauthEmail = typeof params.email === 'string' ? params.email : '';
  const providerLabel =
    params.provider === 'apple' ? 'Apple' : params.provider === 'google' ? 'Google' : 'social';

  const [step, setStep] = useState<Step>('details');
  const [displayName, setDisplayName] = useState(params.displayName ?? '');
  const [username, setUsername] = useState((params.username ?? '').toLowerCase());
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const isClub = accountType === 'club';
  // Brand accent over the video: purple for clubs, teal for athletes.
  const accentBorder = isClub ? `${theme.purpleHero}A6` : `${theme.tealPrimary}8C`;

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleNextStep = () => {
    const nameError = validateDisplayName(displayName, isClub);
    if (nameError) {
      Alert.alert('Invalid name', nameError);
      return;
    }
    const usernameError = validateUsername(username);
    if (usernameError) {
      Alert.alert('Invalid username', usernameError);
      return;
    }
    if (!birthdate) {
      Alert.alert('Birthdate', 'Please select your date of birth.');
      return;
    }
    setStep('activities');
  };

  const handleComplete = async () => {
    if (selectedActivities.length < MIN_ACTIVITIES) {
      Alert.alert('Activities', `Select at least ${MIN_ACTIVITIES} activities.`);
      return;
    }

    setLoading(true);
    try {
      const result = await completeOAuthProfile({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        accountType,
        birthdate: toBirthdateISO(birthdate!),
        activities: selectedActivities,
      });
      if (result.success) {
        await setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Could not finish setup', result.error ?? 'Try again.');
      }
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
              Signed in with {providerLabel}. Fill in the rest to finish your profile.
            </Text>
          </StaggeredListItem>

          {oauthEmail ? (
            <StaggeredListItem index={1}>
              <Text style={s.sectionLabel}>Email</Text>
              <TextInput
                style={[s.input, s.inputReadOnly]}
                value={oauthEmail}
                editable={false}
                selectTextOnFocus={false}
                accessibilityLabel="Email (from your sign-in, read only)"
              />
            </StaggeredListItem>
          ) : null}

          <StaggeredListItem index={2}>
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
          </StaggeredListItem>

          <StaggeredListItem index={3}>
            <Text style={s.sectionLabel}>Username</Text>
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

          <StaggeredListItem index={4}>
            <View style={s.dobBlock}>
              <Text style={s.sectionLabel}>Date of birth</Text>
              <AuthDateOfBirthField value={birthdate} onChange={setBirthdate} disabled={loading} />
            </View>

            <Text style={s.hint}>You can add a phone number later in Edit Profile.</Text>
          </StaggeredListItem>

          <StaggeredListItem index={5}>
            <AuthCtaButton label="Continue" onPress={handleNextStep} style={s.cta} />
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
              onPress={() => void handleComplete()}
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
  inputReadOnly: {
    color: 'rgba(255,255,255,0.65)',
    backgroundColor: onVideo.inputBgSubtle,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dobBlock: { marginBottom: 8 },
  hint: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 20,
    lineHeight: 17,
  },
  cta: { marginBottom: 20 },
});
