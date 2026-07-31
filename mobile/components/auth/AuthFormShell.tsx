import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthVideoBackdrop from '@/components/auth/AuthVideoBackdrop';
import AuthBackButton from '@/components/auth/AuthBackButton';

interface Props {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  onBack?: () => void;
  showBack?: boolean;
}

export default function AuthFormShell({ children, contentStyle, onBack, showBack = true }: Props) {
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
            {showBack ? <AuthBackButton onPress={onBack} /> : null}
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </AuthVideoBackdrop>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 40 },
});
