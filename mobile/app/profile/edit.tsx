import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { ChevronLeft, Camera, Link as LinkIcon, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMyProfile, useUpdateProfile } from '@/hooks/useProfile';
import { uploadFile } from '@/services/upload.service';
import { fonts, radius, type ThemeType } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { ACTIVITIES, MIN_ACTIVITIES } from '@/constants/activities';
import AuthPhoneInput, { DEFAULT_PHONE_COUNTRY } from '@/components/auth/AuthPhoneInput';
import {
  buildPhoneE164,
  findPhoneCountry,
  sanitizeDisplayNameInput,
  sanitizeEmailInput,
  validateDisplayName,
  validateEmail,
  validatePhone,
} from '@/utils/authValidation';

const HERO_INK = '#FFFFFF';
const HERO_INK_MUTED = 'rgba(255,255,255,0.55)';

export default function EditProfileScreen() {
  const { theme, pageBg } = useTheme();
  const s = useMemo(() => createStyles(theme, pageBg), [theme, pageBg]);
  const { data: profile, isLoading } = useMyProfile();
  const { mutate: save, isPending } = useUpdateProfile();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_PHONE_COUNTRY.code);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [bio, setBio] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setEmail(profile.email ?? '');
      setPhoneCountry(DEFAULT_PHONE_COUNTRY.code);
      setPhoneDigits('');
      setBio(profile.bio ?? '');
      setWebsiteUrl(profile.websiteUrl ?? '');
      setSelectedActivities((profile as { activities?: string[] }).activities ?? []);
      setAvatarUri(profile.avatarUrl ?? null);
    }
  }, [profile]);

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const fileName = asset.fileName ?? `avatar_${Date.now()}.jpg`;
      const publicUrl = await uploadFile(asset.uri, fileName, 'image/jpeg');
      setAvatarUri(publicUrl);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSave = () => {
    const nameError = validateDisplayName(displayName);
    if (nameError) {
      Alert.alert('Invalid name', nameError);
      return;
    }
    if (selectedActivities.length < MIN_ACTIVITIES) {
      Alert.alert('Activities required', `Please select at least ${MIN_ACTIVITIES} activities.`);
      return;
    }
    if (!profile?.email && email.trim()) {
      const emailError = validateEmail(email);
      if (emailError) {
        Alert.alert('Invalid email', emailError);
        return;
      }
    }
    if (!profile?.phone && phoneDigits.trim()) {
      const phoneError = validatePhone(phoneCountry, phoneDigits);
      if (phoneError) {
        Alert.alert('Invalid phone', phoneError);
        return;
      }
    }
    save(
      {
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        websiteUrl: websiteUrl.trim() || null,
        activities: selectedActivities,
        avatarUrl: avatarUri,
        ...(!profile?.email && email.trim() ? { email: sanitizeEmailInput(email) } : {}),
        ...(!profile?.phone && phoneDigits.trim()
          ? { phone: buildPhoneE164(findPhoneCountry(phoneCountry), phoneDigits) }
          : {}),
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          Alert.alert('Update failed', err instanceof Error ? err.message : 'Try again');
        },
      },
    );
  };

  if (isLoading && !profile) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={theme.tealPrimary} size="large" />
      </View>
    );
  }

  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Gradient header with avatar ── */}
        <LinearGradient
          colors={['#2A1570', '#5B2ECC', '#6D3AE8']}
          locations={[0, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.headerGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={s.topRow}>
              <View style={s.navSide}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={s.backBtn}
                  activeOpacity={0.65}
                  accessibilityLabel="Go back"
                  accessibilityRole="button"
                >
                  <ChevronLeft size={24} strokeWidth={2} color={HERO_INK} />
                </TouchableOpacity>
              </View>
              <View style={s.navTitleWrap}>
                <Text style={[s.screenTitle, { color: HERO_INK }]}>EDIT PROFILE</Text>
              </View>
              <View style={[s.navSide, s.navSideRight]}>
                <TouchableOpacity
                  onPress={onSave}
                  style={[s.saveBtn, isPending && { opacity: 0.5 }]}
                  disabled={isPending || uploadingAvatar}
                  activeOpacity={0.7}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color={theme.onTeal} />
                  ) : (
                    <Text style={s.saveBtnText}>SAVE</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Avatar */}
            <TouchableOpacity
              style={s.avatarWrap}
              onPress={() => void pickAvatar()}
              activeOpacity={0.8}
              accessibilityLabel="Change avatar"
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatarImg} contentFit="cover" />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitial}>{displayInitial || '?'}</Text>
                </View>
              )}
              <View style={s.cameraOverlay}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera size={16} strokeWidth={2} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={[s.changePhotoHint, { color: HERO_INK_MUTED }]}>Tap to change photo</Text>
          </SafeAreaView>
        </LinearGradient>

        {/* ── Form ── */}
        <View style={s.form}>
          {/* Display Name */}
          <Text style={s.fieldLabel}>DISPLAY NAME</Text>
          <TextInput
            style={s.input}
            value={displayName}
            onChangeText={(text) => setDisplayName(sanitizeDisplayNameInput(text))}
            placeholderTextColor={theme.textMuted}
            placeholder="Your name"
            maxLength={100}
          />

          {!profile?.email ? (
            <>
              <Text style={s.fieldLabel}>EMAIL (OPTIONAL)</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={(text) => setEmail(sanitizeEmailInput(text))}
                placeholder="Add your email"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                maxLength={254}
              />
            </>
          ) : (
            <>
              <Text style={s.fieldLabel}>EMAIL</Text>
              <Text style={s.readOnlyValue}>{profile.email}</Text>
            </>
          )}

          {!profile?.phone ? (
            <>
              <Text style={s.fieldLabel}>PHONE (OPTIONAL)</Text>
              <AuthPhoneInput
                countryCode={phoneCountry}
                onCountryChange={setPhoneCountry}
                value={phoneDigits}
                onChange={setPhoneDigits}
                containerStyle={s.phoneInput}
                inputStyle={s.input}
                inputTextStyle={{ color: theme.textPrimary }}
                countryButtonStyle={{
                  borderColor: theme.surface3,
                  backgroundColor: theme.surface1,
                }}
              />
            </>
          ) : (
            <>
              <Text style={s.fieldLabel}>PHONE</Text>
              <Text style={s.readOnlyValue}>{profile.phone}</Text>
            </>
          )}

          {/* Bio */}
          <Text style={s.fieldLabel}>BIO</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
            placeholder="Tell people about yourself"
            placeholderTextColor={theme.textMuted}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{bio.length}/500</Text>

          {/* Link */}
          <Text style={s.fieldLabel}>LINK</Text>
          <View style={s.inputIconRow}>
            <LinkIcon
              size={15}
              strokeWidth={2}
              color={theme.textMuted}
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={s.inputInner}
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              placeholder="https://yourwebsite.com"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              maxLength={200}
            />
            {websiteUrl.length > 0 && (
              <TouchableOpacity
                onPress={() => setWebsiteUrl('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} strokeWidth={2} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Activities */}
          <View style={s.activitiesHeader}>
            <Text style={s.fieldLabel}>ACTIVITIES</Text>
            <Text
              style={[
                s.activityCount,
                selectedActivities.length >= MIN_ACTIVITIES && s.activityCountReady,
              ]}
            >
              {selectedActivities.length} selected
              {selectedActivities.length < MIN_ACTIVITIES ? ` (min ${MIN_ACTIVITIES})` : ''}
            </Text>
          </View>
          <View style={s.activityGrid}>
            {ACTIVITIES.map((activity) => {
              const active = selectedActivities.includes(activity.id);
              return (
                <TouchableOpacity
                  key={activity.id}
                  style={[s.activityChip, active && s.activityChipActive]}
                  onPress={() => toggleActivity(activity.id)}
                  activeOpacity={0.75}
                >
                  <Text style={s.activityIcon}>{activity.icon}</Text>
                  <Text style={[s.activityLabel, active && s.activityLabelActive]}>
                    {activity.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: ThemeType, pageBg: string) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: pageBg },
    centered: {
      flex: 1,
      backgroundColor: pageBg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* ── Header gradient ── */
    headerGradient: {
      paddingHorizontal: 20,
      paddingBottom: 28,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      marginBottom: 24,
    },
    navSide: {
      width: 72,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    navSideRight: {
      alignItems: 'flex-end',
    },
    navTitleWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -8,
    },
    screenTitle: {
      fontFamily: fonts.h2,
      fontSize: 16,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    saveBtn: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 9999,
      backgroundColor: theme.tealPrimary,
      ...theme.shadows.teal,
    },
    saveBtnText: {
      fontFamily: fonts.button,
      fontSize: 12,
      color: theme.onTeal,
      letterSpacing: 1,
    },

    /* ── Avatar ── */
    avatarWrap: {
      alignSelf: 'center',
      marginBottom: 10,
    },
    avatarImg: {
      width: 90,
      height: 90,
      borderRadius: 9999,
      borderWidth: 2.5,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarPlaceholder: {
      width: 90,
      height: 90,
      borderRadius: 9999,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarInitial: {
      fontFamily: fonts.h1,
      fontSize: 36,
      color: 'rgba(255,255,255,0.85)',
    },
    cameraOverlay: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 28,
      height: 28,
      borderRadius: 9999,
      backgroundColor: theme.purpleBrand,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: pageBg,
    },
    changePhotoHint: {
      fontFamily: fonts.caption,
      fontSize: 12,
      textAlign: 'center',
      marginBottom: 4,
    },

    /* ── Form ── */
    form: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    fieldLabel: {
      fontFamily: fonts.label,
      fontSize: 10,
      color: theme.purpleSoft,
      letterSpacing: 1.5,
      marginBottom: 8,
      marginTop: 20,
    },
    readOnlyValue: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: theme.textSecondary,
      paddingVertical: 4,
    },
    input: {
      backgroundColor: theme.surface1,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.surface3,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: fonts.body,
      fontSize: 15,
      color: theme.textPrimary,
    },
    phoneInput: { marginBottom: 0 },
    textArea: {
      minHeight: 90,
      paddingTop: 14,
    },
    charCount: {
      fontFamily: fonts.caption,
      fontSize: 11,
      color: theme.textMuted,
      textAlign: 'right',
      marginTop: 5,
    },
    inputIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface1,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.surface3,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    inputInner: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 15,
      color: theme.textPrimary,
      padding: 0,
    },

    /* ── Activities ── */
    activitiesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      marginBottom: 12,
    },
    activityCount: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: theme.textMuted,
    },
    activityCountReady: { color: theme.tealPrimary },
    activityGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    activityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 9999,
      backgroundColor: theme.surface1,
      borderWidth: 1.5,
      borderColor: theme.surface3,
    },
    activityChipActive: {
      backgroundColor: theme.surface2,
      borderColor: theme.tealPrimary,
    },
    activityIcon: { fontSize: 15 },
    activityLabel: {
      fontFamily: fonts.bodyStrong,
      fontSize: 13,
      color: theme.textMuted,
    },
    activityLabelActive: { color: theme.tealPrimary },
  });
}
