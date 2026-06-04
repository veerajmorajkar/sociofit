import { Text, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, gradients } from '@/constants/theme';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  /** Thin ring around avatar */
  ring?: boolean;
}

export default function UserAvatar({ name, avatarUrl, size = 40, ring = false }: UserAvatarProps) {
  const initial = (name?.charAt(0) ?? '?').toUpperCase();
  const radius = size / 2;

  const inner = avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      style={{ width: size, height: size, borderRadius: radius }}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={avatarUrl}
    />
  ) : (
    <LinearGradient
      colors={gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.h2, fontSize: size * 0.38, color: colors.textPrimary }}>
        {initial}
      </Text>
    </LinearGradient>
  );

  if (!ring) return inner;

  return (
    <View
      style={[
        s.ring,
        {
          width: size + 4,
          height: size + 4,
          borderRadius: (size + 4) / 2,
        },
      ]}
    >
      {inner}
    </View>
  );
}

const s = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.purpleHero,
    overflow: 'hidden',
  },
});
