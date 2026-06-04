import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCategories } from '@/hooks/useEvents';
import { createEvent } from '@/services/events.service';
import { colors, fonts, radius, shadows } from '@/constants/theme';

// Fallback if location permission is denied
const DEFAULT_LAT = 19.076;
const DEFAULT_LNG = 72.8777;

async function resolveEventCoordinates(): Promise<{ latitude: number; longitude: number }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
  }
}

function buildIsoDate(dateStr: string, timeStr: string): string {
  const [y = 1970, m = 1, d = 1] = dateStr.split('-').map(Number);
  const [hh = 10, mm = 0] = timeStr.split(':').map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0);
  return dt.toISOString();
}

export default function CreateEventScreen() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading: catsLoading } = useCategories();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('09:00');
  const [maxCapacity, setMaxCapacity] = useState('');

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      if (!categoryId) throw new Error('Pick a category');
      const startIso = buildIsoDate(date, startTime);
      const endIso = buildIsoDate(date, endTime);
      if (new Date(endIso) <= new Date(startIso)) {
        throw new Error('End time must be after start time');
      }
      const { latitude, longitude } = await resolveEventCoordinates();
      return createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId,
        startTime: startIso,
        endTime: endIso,
        locationName: locationName.trim(),
        locationAddress: locationAddress.trim() || undefined,
        latitude,
        longitude,
        maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : undefined,
        priceInr: 0,
      });
    },
    onSuccess: (event) => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['events', 'hosted'] });
      router.replace(`/event/${event.id}` as never);
    },
    onError: (err) => {
      Alert.alert('Could not create event', err instanceof Error ? err.message : 'Try again');
    },
  });

  const canSubmit =
    title.trim().length >= 5 && locationName.trim().length > 0 && !!categoryId && !isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bgPrimary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.label}>TITLE</Text>
          <TextInput
            style={s.input}
            placeholder="Sunday Morning Run"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />

          <Text style={s.label}>DESCRIPTION</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="What to expect, what to bring..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={2000}
          />

          <Text style={s.label}>CATEGORY</Text>
          {catsLoading ? (
            <ActivityIndicator color={colors.tealPrimary} style={{ marginVertical: 12 }} />
          ) : (
            <View style={s.chipRow}>
              {(categories ?? []).map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  style={[s.chip, categoryId === cat.id && s.chipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, categoryId === cat.id && s.chipTextActive]}>
                    {cat.name.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={s.label}>LOCATION</Text>
          <TextInput
            style={s.input}
            placeholder="Marine Drive, Mumbai"
            placeholderTextColor={colors.textMuted}
            value={locationName}
            onChangeText={setLocationName}
          />
          <TextInput
            style={[s.input, { marginTop: 8 }]}
            placeholder="Full address (optional)"
            placeholderTextColor={colors.textMuted}
            value={locationAddress}
            onChangeText={setLocationAddress}
          />

          <Text style={s.label}>DATE & TIME</Text>
          <TextInput
            style={s.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            value={date}
            onChangeText={setDate}
            autoCapitalize="none"
          />
          <View style={s.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.subLabel}>START</Text>
              <TextInput
                style={s.input}
                placeholder="07:00"
                placeholderTextColor={colors.textMuted}
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.subLabel}>END</Text>
              <TextInput
                style={s.input}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
          </View>

          <Text style={s.label}>MAX CAPACITY (OPTIONAL)</Text>
          <TextInput
            style={s.input}
            placeholder="50"
            placeholderTextColor={colors.textMuted}
            value={maxCapacity}
            onChangeText={setMaxCapacity}
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            onPress={() => submit()}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator color={colors.onTeal} />
            ) : (
              <Text style={s.submitText}>CREATE EVENT</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  label: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.purpleSoft,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 16,
  },
  subLabel: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface3,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.surface3,
  },
  chipActive: { backgroundColor: colors.purpleBrand, borderColor: colors.purpleHero },
  chipText: { fontFamily: fonts.label, fontSize: 10, color: colors.textMuted, letterSpacing: 1 },
  chipTextActive: { color: colors.textPrimary },
  timeRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  submitBtn: {
    marginTop: 28,
    backgroundColor: colors.tealPrimary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadows.teal,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: {
    fontFamily: fonts.button,
    fontSize: 15,
    color: colors.onTeal,
    letterSpacing: 1,
  },
});
