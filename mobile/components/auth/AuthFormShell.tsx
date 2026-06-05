import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthVideoBackdrop from '@/components/auth/AuthVideoBackdrop';

interface Props {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}

export default function AuthFormShell({ children, contentStyle }: Props) {
  return (
    <AuthVideoBackdrop>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={s.flex}>
          <ScrollView
            contentContainerStyle={[s.scroll, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.card}>{children}</View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </AuthVideoBackdrop>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  card: {
    backgroundColor: 'rgba(14,14,20,0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
});
