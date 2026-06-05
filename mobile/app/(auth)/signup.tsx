import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import AuthFormShell from '@/components/auth/AuthFormShell';
import { register } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { radius, fonts } from '@/constants/theme';
import { API_URL } from '@/constants/config';
import { ACTIVITIES, MIN_ACTIVITIES } from '@/constants/activities';
import { accountTypeSignupLabel } from '@/constants/accountType';

type AccountType = 'personal' | 'club';
type Step = 'details' | 'activities';

export default function SignupScreen() {
  const params = useLocalSearchParams<{ accountType?: string }>();
  const initialType = (params.accountType === 'club' ? 'club' : 'personal') as AccountType;

  const [step, setStep] = useState<Step>('details');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(initialType);
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

  const inputStyle = [s.input, { borderColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }];

  return (
    <AuthFormShell contentStyle={step === 'activities' ? s.scrollActivities : undefined}>
      <View style={s.stepRow}>
        <View style={[s.stepDot, s.stepDotActive]} />
        <View style={[s.stepLine, step === 'activities' && s.stepLineActive]} />
        <View style={[s.stepDot, step === 'activities' && s.stepDotActive]} />
      </View>

      {step === 'details' ? (
        <>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={s.title}>Create account</Text>
          <Text style={s.subtitle}>Join as {accountTypeSignupLabel(accountType)}</Text>

          <Text style={s.sectionLabel}>ACCOUNT TYPE</Text>
          <View style={s.typeRow}>
            {(['personal', 'club'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  s.typeBtn,
                  accountType === type && (type === 'personal' ? s.typeBtnAthlete : s.typeBtnClub),
                ]}
                onPress={() => setAccountType(type)}
                activeOpacity={0.75}
                accessibilityRole="radio"
                accessibilityState={{ selected: accountType === type }}
              >
                <Text style={s.typeEmoji}>{type === 'personal' ? '🏃' : '🏢'}</Text>
                <Text style={[s.typeLabel, accountType === type && s.typeLabelActive]}>
                  {accountTypeSignupLabel(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={inputStyle}
            placeholder={accountType === 'club' ? 'Club name' : 'Display name'}
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!loading}
          />
          <TextInput
            style={inputStyle}
            placeholder="Username"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!loading}
          />
          <TextInput
            style={inputStyle}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          {accountType === 'personal' && (
            <View style={s.dobBlock}>
              <Text style={s.sectionLabel}>BIRTHDATE</Text>
              <TouchableOpacity
                onPress={() => setShowDobPicker(true)}
                style={[s.dobBtn, { borderColor: 'rgba(255,255,255,0.15)' }]}
              >
                <Text
                  style={[s.dobText, { color: birthdate ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }]}
                >
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
            style={[...inputStyle, s.inputLast]}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            returnKeyType="next"
            onSubmitEditing={handleNextStep}
          />

          <TouchableOpacity style={s.btn} onPress={handleNextStep} activeOpacity={0.8}>
            <Text style={s.btnText}>CONTINUE</Text>
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Already have an account? </Text>
            <Link href="/(auth)/login-options" asChild>
              <TouchableOpacity>
                <Text style={s.switchAction}>Log in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </>
      ) : (
        <>
          <TouchableOpacity style={s.back} onPress={() => setStep('details')}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={s.title}>Your activities</Text>
          <Text style={s.subtitle}>
            Pick the sports you love.{'\n'}Select at least {MIN_ACTIVITIES}.
          </Text>

          <View style={s.activityGrid}>
            {ACTIVITIES.map((activity) => {
              const picked = selectedActivities.includes(activity.id);
              return (
                <TouchableOpacity
                  key={activity.id}
                  style={[s.chip, picked && s.chipPicked]}
                  onPress={() => toggleActivity(activity.id)}
                  activeOpacity={0.75}
                >
                  <Text style={s.chipIcon}>{activity.icon}</Text>
                  <Text style={[s.chipLabel, picked && s.chipLabelPicked]}>{activity.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.countText, selectedActivities.length >= MIN_ACTIVITIES && s.countReady]}>
            {selectedActivities.length} selected
            {selectedActivities.length < MIN_ACTIVITIES
              ? ` — need ${MIN_ACTIVITIES - selectedActivities.length} more`
              : ' — good to go!'}
          </Text>

          <TouchableOpacity
            style={[
              s.btn,
              (loading || selectedActivities.length < MIN_ACTIVITIES) && s.btnDisabled,
            ]}
            onPress={() => void handleSignup()}
            disabled={loading || selectedActivities.length < MIN_ACTIVITIES}
          >
            {loading ? (
              <ActivityIndicator color="#001A14" />
            ) : (
              <Text style={s.btnText}>CREATE ACCOUNT</Text>
            )}
          </TouchableOpacity>
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
    marginBottom: 20,
    alignSelf: 'center',
    width: 80,
  },
  stepDot: { width: 10, height: 10, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.25)' },
  stepDotActive: { backgroundColor: '#00E5C3' },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepLineActive: { backgroundColor: '#00E5C3' },
  back: { marginBottom: 12 },
  backText: { fontFamily: fonts.bodyStrong, fontSize: 15, color: '#A882FF' },
  title: { fontFamily: fonts.h1, fontSize: 28, color: '#FFFFFF', marginBottom: 8 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 24,
    lineHeight: 22,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: '#A882FF',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  typeBtnAthlete: { borderColor: '#00E5C3', backgroundColor: 'rgba(0,229,195,0.1)' },
  typeBtnClub: { borderColor: '#7B4DFF', backgroundColor: 'rgba(123,77,255,0.12)' },
  typeEmoji: { fontSize: 22, marginBottom: 6 },
  typeLabel: {
    fontFamily: fonts.h3,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1,
  },
  typeLabelActive: { color: '#FFFFFF' },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  inputLast: { marginBottom: 24 },
  dobBlock: { marginBottom: 12 },
  dobBtn: { borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1 },
  dobText: { fontFamily: fonts.body, fontSize: 15 },
  btn: {
    borderRadius: radius.md,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#00E5C3',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: fonts.h2, fontSize: 15, color: '#001A14', letterSpacing: 1 },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipPicked: { borderColor: '#00E5C3', backgroundColor: 'rgba(0,229,195,0.12)' },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontFamily: fonts.bodyStrong, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  chipLabelPicked: { color: '#00E5C3' },
  countText: {
    textAlign: 'center',
    fontFamily: fonts.caption,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 24,
  },
  countReady: { color: '#00E5C3' },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchLabel: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  switchAction: { fontFamily: fonts.bodyStrong, fontSize: 14, color: '#00E5C3' },
});
