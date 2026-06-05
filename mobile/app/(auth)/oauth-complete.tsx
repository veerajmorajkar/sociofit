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
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import AuthFormShell from '@/components/auth/AuthFormShell';
import { completeOAuthProfile } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { ACTIVITIES, MIN_ACTIVITIES } from '@/constants/activities';
import { accountTypeSignupLabel } from '@/constants/accountType';
import { radius, fonts } from '@/constants/theme';
import { API_URL } from '@/constants/config';

type AccountType = 'personal' | 'club';

export default function OAuthCompleteScreen() {
  const params = useLocalSearchParams<{
    accountType?: string;
    displayName?: string;
    username?: string;
  }>();

  const accountType = (params.accountType === 'club' ? 'club' : 'personal') as AccountType;
  const [username, setUsername] = useState((params.username ?? '').toLowerCase());
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleComplete = async () => {
    if (!username.trim() || username.length < 3) {
      Alert.alert('Username', 'Pick a username with at least 3 characters.');
      return;
    }
    if (accountType === 'personal' && !birthdate) {
      Alert.alert('Birthdate', 'Please select your birthdate.');
      return;
    }
    if (selectedActivities.length < MIN_ACTIVITIES) {
      Alert.alert('Activities', `Select at least ${MIN_ACTIVITIES} activities.`);
      return;
    }

    setLoading(true);
    try {
      const result = await completeOAuthProfile({
        username: username.trim().toLowerCase(),
        accountType,
        birthdate: birthdate ? birthdate.toISOString() : undefined,
        activities: selectedActivities,
      });
      if (result.success) {
        await setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Could not finish setup', result.error ?? 'Try again.');
      }
    } catch (err) {
      Alert.alert(
        'Connection error',
        `${err instanceof Error ? err.message : 'Could not reach server.'}\n\nAPI: ${API_URL}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [s.input, { borderColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }];

  return (
    <AuthFormShell>
      <Text style={s.title}>Almost there</Text>
      <Text style={s.subtitle}>
        Welcome{params.displayName ? `, ${params.displayName}` : ''}! Finish your{' '}
        {accountTypeSignupLabel(accountType).toLowerCase()} profile.
      </Text>

      <Text style={s.label}>USERNAME</Text>
      <TextInput
        style={inputStyle}
        placeholder="username"
        placeholderTextColor="rgba(255,255,255,0.45)"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        editable={!loading}
      />

      {accountType === 'personal' && (
        <View style={s.dobBlock}>
          <Text style={s.label}>BIRTHDATE</Text>
          <TouchableOpacity
            onPress={() => setShowDobPicker(true)}
            style={[s.dobBtn, { borderColor: 'rgba(255,255,255,0.15)' }]}
          >
            <Text style={[s.dobText, { color: birthdate ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }]}>
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

      <Text style={[s.label, { marginTop: 8 }]}>YOUR ACTIVITIES</Text>
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

      <TouchableOpacity
        style={[s.btn, (loading || selectedActivities.length < MIN_ACTIVITIES) && s.btnDisabled]}
        onPress={() => void handleComplete()}
        disabled={loading || selectedActivities.length < MIN_ACTIVITIES}
      >
        {loading ? (
          <ActivityIndicator color="#001A14" />
        ) : (
          <Text style={s.btnText}>ENTER THE MAFIA</Text>
        )}
      </TouchableOpacity>
    </AuthFormShell>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: fonts.h1, fontSize: 28, color: '#FFFFFF', marginBottom: 8 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 24,
    lineHeight: 22,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: '#A882FF',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    marginBottom: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dobBlock: { marginBottom: 8 },
  dobBtn: { borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1 },
  dobText: { fontFamily: fonts.body, fontSize: 15 },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipPicked: { borderColor: '#00E5C3', backgroundColor: 'rgba(0,229,195,0.12)' },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontFamily: fonts.bodyStrong, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  chipLabelPicked: { color: '#00E5C3' },
  btn: {
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E5C3',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: fonts.h2, fontSize: 15, color: '#001A14', letterSpacing: 1 },
});
