import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { colors, fonts } from '@/constants/theme';

export default function MessagesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 20, color: colors.cream, textTransform: 'uppercase', letterSpacing: -0.5 }}>
            MESSAGES
          </Text>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <MessageCircle size={40} strokeWidth={1.5} color={colors.text4} />
        <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.text1, marginTop: 16, textAlign: 'center', textTransform: 'uppercase' }}>
          NO CONVERSATIONS YET
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text3, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          Message someone from a club or event you joined
        </Text>
      </View>
    </View>
  );
}
