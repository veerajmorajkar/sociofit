import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy route — redirects to athlete/club signup screens. */
export default function SignupRedirectScreen() {
  const params = useLocalSearchParams<{ accountType?: string; contact?: string }>();
  const isClub = params.accountType === 'club';

  return (
    <Redirect
      href={{
        pathname: isClub ? '/(auth)/signup-club' : '/(auth)/signup-athlete',
        params: params.contact ? { contact: params.contact } : undefined,
      }}
    />
  );
}
