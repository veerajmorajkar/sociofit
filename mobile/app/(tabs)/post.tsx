import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { colors, fonts, radius, shadows } from '@/constants/theme';

/** Post tab — tap to open create post (no auto-redirect). */
export default function PostTab() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <SafeAreaView style={s.container}>
        <Text style={s.title}>SHARE YOUR WORKOUT</Text>
        <Text style={s.subtitle}>Post a photo, update, or moment with the community</Text>
        <TouchableOpacity
          style={s.btn}
          onPress={() => router.push('/post/create')}
          activeOpacity={0.85}
          accessibilityLabel="Create post"
        >
          <Plus size={22} strokeWidth={2.5} color={colors.onTeal} />
          <Text style={s.btnText}>CREATE POST</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: fonts.h1,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: radius.md,
    ...shadows.teal,
  },
  btnText: {
    fontFamily: fonts.button,
    fontSize: 15,
    color: colors.onTeal,
    letterSpacing: 1,
  },
});
