import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthVideoBackdrop from '@/components/auth/AuthVideoBackdrop';
import AuthBackButton from '@/components/auth/AuthBackButton';
import AuthHeroBrand from '@/components/auth/AuthHeroBrand';
import AuthLegalFooter from '@/components/auth/AuthLegalFooter';
import AccountTypeIcon from '@/components/auth/AccountTypeIcon';
import { onVideo } from '@/components/auth/onVideoColors';
import { accountTypeSignupLabel } from '@/constants/accountType';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { selectHaptic } from '@/utils/haptics';

type AccountType = 'personal' | 'club';

/** Beat between the selection animation and navigating on. */
const SELECT_NAV_DELAY_MS = 260;

interface TypeCardProps {
  type: AccountType;
  selected: AccountType | null;
  onSelect: (type: AccountType) => void;
}

function TypeCard({ type, selected, onSelect }: TypeCardProps) {
  const { theme } = useTheme();
  const isSelected = selected === type;
  const isDimmed = selected !== null && !isSelected;

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isSelected ? 1.04 : 1,
        useNativeDriver: true,
        speed: 24,
        bounciness: 9,
      }),
      Animated.timing(opacity, {
        toValue: isSelected ? 1 : isDimmed ? 0.45 : 0.9,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected, isDimmed, scale, opacity]);

  // Brand accent per type: teal for athletes, purple for clubs.
  const accent = type === 'club' ? theme.purpleHero : theme.tealPrimary;

  return (
    <Pressable
      onPress={() => onSelect(type)}
      disabled={selected !== null}
      accessibilityRole="button"
      accessibilityLabel={`Join as ${accountTypeSignupLabel(type)}`}
      accessibilityState={{ selected: isSelected }}
    >
      <Animated.View
        style={[
          s.typeCard,
          { opacity, transform: [{ scale }] },
          isSelected && {
            borderColor: accent,
            shadowColor: accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.45,
            shadowRadius: 16,
            elevation: 10,
          },
        ]}
      >
        <View style={s.typeIconWrap}>
          <AccountTypeIcon type={type} size={48} selected={selected === null || isSelected} />
        </View>
        <Text style={s.typeLabel}>{accountTypeSignupLabel(type)}</Text>
        <Text style={s.typeHint}>
          {type === 'personal'
            ? 'Train, connect & join events'
            : 'Host sessions & grow your community'}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function SignupTypeScreen() {
  const [selected, setSelected] = useState<AccountType | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset selection when returning to this screen so no card stays "picked".
  useFocusEffect(
    useCallback(() => {
      setSelected(null);
      return () => {
        if (navTimer.current) clearTimeout(navTimer.current);
      };
    }, []),
  );

  const pick = (accountType: AccountType) => {
    selectHaptic();
    setSelected(accountType);
    // Let the selection spring/glow land before pushing the next screen.
    navTimer.current = setTimeout(() => {
      router.push({
        pathname: '/(auth)/login-options',
        params: { mode: 'signup', accountType },
      });
    }, SELECT_NAV_DELAY_MS);
  };

  return (
    <AuthVideoBackdrop>
      <StatusBar style="light" />
      <SafeAreaView style={s.safe}>
        <AuthBackButton style={s.back} />

        <View style={s.center}>
          <AuthHeroBrand />
          <Text style={s.prompt}>Who are you joining as?</Text>

          <View style={s.typeRow}>
            {(['personal', 'club'] as const).map((type) => (
              <TypeCard key={type} type={type} selected={selected} onSelect={pick} />
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
  back: { marginLeft: 20, marginTop: 4, marginBottom: 4 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 28 },
  prompt: {
    fontFamily: fonts.h3,
    fontSize: 18,
    // on-video text: always light over dark video
    color: onVideo.text,
    textAlign: 'center',
    marginTop: 8,
  },
  typeRow: { gap: 14 },
  typeCard: {
    // on-video glass card: unselected state is muted; selection adds accent + glow
    backgroundColor: onVideo.glassCard,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: onVideo.borderMuted,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  typeIconWrap: { marginBottom: 10 },
  typeLabel: {
    fontFamily: fonts.h2,
    fontSize: 17,
    color: onVideo.text,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  typeHint: {
    fontFamily: fonts.caption,
    fontSize: 13,
    color: onVideo.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottom: { paddingHorizontal: 28, paddingBottom: 24 },
});
