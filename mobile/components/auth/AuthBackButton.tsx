import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';

interface Props {
  onPress?: () => void;
  style?: ViewStyle;
  color?: string;
}

// Default chevron color is on-video: always light over the dark auth video.
export default function AuthBackButton({ onPress, style, color = '#FFFFFF' }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      style={[s.btn, style]}
      hitSlop={10}
      activeOpacity={0.65}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <ChevronLeft size={24} strokeWidth={2} color={color} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
});
