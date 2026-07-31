import { View, StyleSheet } from 'react-native';
import { MFMLogoHero } from '@/components/ui/MFMLogo';

export default function AuthHeroBrand() {
  return (
    <View style={s.wrap} accessibilityRole="header">
      <MFMLogoHero />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
});
