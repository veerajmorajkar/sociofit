import { View, Text } from 'react-native';
import { PlusSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppHeader from '@/components/ui/AppHeader';

const BG = '#0E0E0E';
const TEXT1 = '#E8E0D0';
const TEXT3 = '#706860';
const TEXT4 = '#4A4440';

export default function PostScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <AppHeader title="CREATE" showActions={false} />

      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <PlusSquare size={40} strokeWidth={1.5} color={TEXT4} />
          <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, color: TEXT1, marginTop: 16, textAlign: 'center', textTransform: 'uppercase', letterSpacing: -0.5 }}>
            SHARE SOMETHING
          </Text>
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: TEXT3, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            Post a photo, video, or share an event with the community
          </Text>
        </View>

        <LinearGradient
          colors={['rgba(14,14,14,0)', 'rgba(14,14,14,0.85)', '#0E0E0E']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, pointerEvents: 'none' }}
        />
      </View>
    </View>
  );
}
