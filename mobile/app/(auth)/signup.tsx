import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { register } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, fonts, shadows } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_URL } from '@/constants/config';
import { ACTIVITIES, MIN_ACTIVITIES } from '@/constants/activities';

type AccountType = 'personal' | 'club';
type Step = 'details' | 'activities';

export default function SignupScreen() {
  const [step, setStep] = useState<Step>('details');

  // Step 1 fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('personal');

  // Step 2 fields
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleNextStep = () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (accountType === 'personal' && !birthdate) {
      Alert.alert('Missing birthdate', 'Please select your birthdate.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setStep('activities');
  };

  const handleSignup = async () => {
    if (selectedActivities.length < MIN_ACTIVITIES) {
      Alert.alert('Select activities', `Please select at least ${MIN_ACTIVITIES} activities.`);
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        email: email.trim(),
        password,
        accountType,
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        birthdate: birthdate ? birthdate.toISOString() : undefined,
        activities: selectedActivities,
      });
      if (result.success) {
        await setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Signup failed', result.error ?? 'Could not create account.');
      }
    } catch (err) {
      Alert.alert(
        'Connection error',
        `${err instanceof Error ? err.message : 'Could not reach the server.'}\n\nAPI: ${API_URL}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Step indicator ── */}
          <View style={s.stepRow}>
            <View style={[s.stepDot, s.stepDotActive]} />
            <View style={[s.stepLine, step === 'activities' && s.stepLineActive]} />
            <View style={[s.stepDot, step === 'activities' && s.stepDotActive]} />
          </View>

          {step === 'details' ? (
            <>
              <Text style={s.title}>CREATE ACCOUNT</Text>
              <Text style={s.subtitle}>Join Mumbai Fitness Mafia</Text>

              <Text style={s.sectionLabel}>ACCOUNT TYPE</Text>
              <View style={s.typeRow}>
                {(['personal', 'club'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      s.typeBtn,
                      accountType === type &&
                        (type === 'personal' ? s.typeBtnActiveTeal : s.typeBtnActivePurple),
                    ]}
                    onPress={() => setAccountType(type)}
                    activeOpacity={0.75}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: accountType === type }}
                  >
                    <Text style={s.typeEmoji}>{type === 'personal' ? '🏃' : '🏢'}</Text>
                    <Text
                      style={[
                        s.typeLabel,
                        accountType === type &&
                          (type === 'personal' ? s.typeLabelActiveTeal : s.typeLabelActivePurple),
                      ]}
                    >
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={s.input}
                placeholder={accountType === 'club' ? 'CLUB NAME' : 'DISPLAY NAME'}
                placeholderTextColor={colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                editable={!loading}
                accessibilityLabel="Display name"
              />
              <TextInput
                style={s.input}
                placeholder="USERNAME"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!loading}
                accessibilityLabel="Username"
              />
              <TextInput
                style={s.input}
                placeholder="EMAIL"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                accessibilityLabel="Email"
              />

              {accountType === 'personal' && (
                <View style={s.dobBlock}>
                  <Text style={s.sectionLabel}>BIRTHDATE</Text>
                  <TouchableOpacity
                    onPress={() => setShowDobPicker(true)}
                    style={s.dobBtn}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                  >
                    <Text style={[s.dobText, !birthdate && s.dobPlaceholder]}>
                      {birthdate ? birthdate.toISOString().slice(0, 10) : 'Select date of birth'}
                    </Text>
                  </TouchableOpacity>
                  {showDobPicker && (
                    <DateTimePicker
                      value={birthdate ?? new Date(2000, 0, 1)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()}
                      onChange={(_, date) => {
                        setShowDobPicker(Platform.OS === 'ios');
                        if (date) setBirthdate(date);
                      }}
                    />
                  )}
                </View>
              )}

              <TextInput
                style={[s.input, s.inputLast]}
                placeholder="PASSWORD"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={handleNextStep}
                accessibilityLabel="Password"
              />

              <TouchableOpacity
                style={s.btn}
                onPress={handleNextStep}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={s.btnText}>CONTINUE</Text>
              </TouchableOpacity>

              <View style={s.switchRow}>
                <Text style={s.switchLabel}>Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity accessibilityRole="link">
                    <Text style={s.switchAction}>SIGN IN</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => setStep('details')}
                activeOpacity={0.7}
              >
                <Text style={s.backBtnText}>← Back</Text>
              </TouchableOpacity>

              <Text style={s.title}>YOUR ACTIVITIES</Text>
              <Text style={s.subtitle}>
                Pick the sports and activities you love.{'\n'}
                Select at least {MIN_ACTIVITIES}.
              </Text>

              <View style={s.activityGrid}>
                {ACTIVITIES.map((activity) => {
                  const selected = selectedActivities.includes(activity.id);
                  return (
                    <TouchableOpacity
                      key={activity.id}
                      style={[s.activityChip, selected && s.activityChipSelected]}
                      onPress={() => toggleActivity(activity.id)}
                      activeOpacity={0.75}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <Text style={s.activityIcon}>{activity.icon}</Text>
                      <Text style={[s.activityLabel, selected && s.activityLabelSelected]}>
                        {activity.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.selectedCount}>
                <Text
                  style={[
                    s.selectedCountText,
                    selectedActivities.length >= MIN_ACTIVITIES && s.selectedCountTextReady,
                  ]}
                >
                  {selectedActivities.length} selected
                  {selectedActivities.length < MIN_ACTIVITIES
                    ? ` — need ${MIN_ACTIVITIES - selectedActivities.length} more`
                    : ' — good to go!'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  s.btn,
                  (loading || selectedActivities.length < MIN_ACTIVITIES) && s.btnDisabled,
                ]}
                onPress={() => void handleSignup()}
                disabled={loading || selectedActivities.length < MIN_ACTIVITIES}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                {loading ? (
                  <ActivityIndicator color={colors.onTeal} />
                ) : (
                  <Text style={s.btnText}>CREATE ACCOUNT</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },

  /* ── Step indicator ── */
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    alignSelf: 'center',
    width: 80,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 9999,
    backgroundColor: colors.surface3,
  },
  stepDotActive: {
    backgroundColor: colors.tealPrimary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.surface3,
  },
  stepLineActive: {
    backgroundColor: colors.tealPrimary,
  },

  title: {
    fontFamily: fonts.h1,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 32,
    lineHeight: 22,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.purpleSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  /* ── Account type ── */
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surface3,
    ...shadows.sm,
  },
  typeBtnActiveTeal: {
    backgroundColor: colors.surface2,
    borderColor: colors.tealPrimary,
  },
  typeBtnActivePurple: {
    backgroundColor: colors.surface2,
    borderColor: colors.purpleHero,
  },
  typeEmoji: { fontSize: 22, marginBottom: 6 },
  typeLabel: {
    fontFamily: fonts.h3,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  typeLabelActiveTeal: { color: colors.tealPrimary },
  typeLabelActivePurple: { color: colors.purpleHero },

  /* ── Inputs ── */
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surface3,
  },
  inputLast: { marginBottom: 24 },
  dobBlock: { marginBottom: 12 },
  dobBtn: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.surface3,
  },
  dobText: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary },
  dobPlaceholder: { color: colors.textMuted },

  /* ── Buttons ── */
  btn: {
    backgroundColor: colors.tealPrimary,
    borderRadius: radius.md,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    fontFamily: fonts.h2,
    fontSize: 15,
    color: colors.onTeal,
    letterSpacing: 1,
  },
  backBtn: { marginBottom: 12 },
  backBtnText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
    color: colors.purpleSoft,
  },

  /* ── Activity grid ── */
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 9999,
    backgroundColor: colors.surface1,
    borderWidth: 1.5,
    borderColor: colors.surface3,
  },
  activityChipSelected: {
    backgroundColor: colors.surface2,
    borderColor: colors.tealPrimary,
  },
  activityIcon: { fontSize: 16 },
  activityLabel: {
    fontFamily: fonts.bodyStrong,
    fontSize: 13,
    color: colors.textMuted,
  },
  activityLabelSelected: { color: colors.tealPrimary },

  /* ── Selected count ── */
  selectedCount: { alignItems: 'center', marginBottom: 28 },
  selectedCountText: {
    fontFamily: fonts.caption,
    fontSize: 13,
    color: colors.textMuted,
  },
  selectedCountTextReady: { color: colors.tealPrimary },

  /* ── Footer ── */
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  switchAction: { fontFamily: fonts.bodyStrong, fontSize: 14, color: colors.tealPrimary },
});
