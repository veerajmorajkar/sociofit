import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthVideoBackdrop from '@/components/auth/AuthVideoBackdrop';
import AuthHeroBrand from '@/components/auth/AuthHeroBrand';
import AuthLegalFooter from '@/components/auth/AuthLegalFooter';
import { accountTypeSignupLabel } from '@/constants/accountType';
import { fonts, radius } from '@/constants/theme';

type AccountType = 'personal' | 'club';

export default function SignupTypeScreen() {
  const pick = (accountType: AccountType) => {
    router.push({
      pathname: '/(auth)/login-options',
      params: { mode: 'signup', accountType },
    });
  };

  return (
    <AuthVideoBackdrop>
      <StatusBar style="light" />
      <SafeAreaView style={s.safe}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} accessibilityRole="button">
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={s.center}>
          <AuthHeroBrand />
          <Text style={s.prompt}>Who are you joining as?</Text>

          <View style={s.typeRow}>
            {(['personal', 'club'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[s.typeCard, type === 'club' && s.typeCardClub]}
                onPress={() => pick(type)}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={s.typeEmoji}>{type === 'personal' ? '🏃' : '🏢'}</Text>
                <Text style={s.typeLabel}>{accountTypeSignupLabel(type)}</Text>
                <Text style={s.typeHint}>
                  {type === 'personal'
                    ? 'Train, connect & join events'
                    : 'Host sessions & grow your community'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.bottom}>
          <AuthLegalFooter />
        </View>
      </SafeAreaView>
    </AuthVideoBackdrop>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  back: { paddingHorizontal: 24, paddingTop: 8 },
  backText: { fontFamily: fonts.bodyStrong, fontSize: 16, color: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 28 },
  prompt: {
    fontFamily: fonts.h3,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  typeRow: { gap: 14 },
  typeCard: {
    backgroundColor: 'rgba(23,23,42,0.82)',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(0,229,195,0.55)',
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  typeCardClub: {
    borderColor: 'rgba(123,77,255,0.65)',
  },
  typeEmoji: { fontSize: 28, marginBottom: 8 },
  typeLabel: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  typeHint: {
    fontFamily: fonts.caption,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottom: { paddingHorizontal: 28, paddingBottom: 24 },
});
