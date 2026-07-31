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
  Pressable,
} from 'react-native';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { ChevronLeft, ImagePlus, MapPin, Search, X, Calendar, Clock } from 'lucide-react-native';
import { useCategories } from '@/hooks/useEvents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePlaceAutocomplete, usePlacesStatus } from '@/hooks/usePlaces';
import { createEvent } from '@/services/events.service';
import { getPlaceDetails } from '@/services/places.service';
import { uploadFile } from '@/services/upload.service';
import { fonts, radius, type ThemeType } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface SelectedPlace {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

type ActivePicker = 'date' | 'start' | 'end' | null;

const IOS_PICKER_HEIGHT = 216;

function tomorrowAtMidnight(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Time-only value for pickers — always anchored to today (date part ignored on submit). */
function timeTodayAt(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function applyTimeFromPicker(target: Date, picked: Date): Date {
  const next = new Date(target);
  next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return next;
}

function combineDateAndTime(date: Date, time: Date): Date {
  const out = new Date(date);
  out.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return out;
}

function formatPickerDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPickerTime(d: Date): string {
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function CreateEventScreen() {
  const { theme, pageBg, mode } = useTheme();
  const s = useMemo(() => createStyles(theme, pageBg), [theme, pageBg]);
  const pickerTheme = mode === 'dark' ? 'dark' : 'light';

  const PickerShell = ({ visible, children }: { visible: boolean; children: ReactNode }) => {
    if (!visible) return null;
    if (Platform.OS === 'ios') {
      return <View style={s.pickerShell}>{children}</View>;
    }
    return <>{children}</>;
  };

  const queryClient = useQueryClient();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: placesStatus } = usePlacesStatus();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [pickingPlace, setPickingPlace] = useState(false);
  const [eventDate, setEventDate] = useState(() => tomorrowAtMidnight());
  const [startTime, setStartTime] = useState(() => timeTodayAt(7, 0));
  const [endTime, setEndTime] = useState(() => timeTodayAt(9, 0));
  const [maxCapacity, setMaxCapacity] = useState('');
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const debouncedLocationQ = useDebouncedValue(locationQuery, 280);
  const {
    data: placeSuggestions = [],
    isFetching: placesLoading,
    isError: placesError,
  } = usePlaceAutocomplete(debouncedLocationQ);

  const placesConfigured = placesStatus?.configured === true;

  const togglePicker = (kind: ActivePicker) => {
    setActivePicker((prev) => (prev === kind ? null : kind));
  };

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setActivePicker(null);
    if (date) setEventDate(date);
  };

  const onStartTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setActivePicker(null);
    if (date) setStartTime((prev) => applyTimeFromPicker(prev, date));
  };

  const onEndTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setActivePicker(null);
    if (date) setEndTime((prev) => applyTimeFromPicker(prev, date));
  };

  const pickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to add a banner.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.88,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingCover(true);
    try {
      const fileName = asset.fileName ?? `event_cover_${Date.now()}.jpg`;
      const publicUrl = await uploadFile(asset.uri, fileName, 'image/jpeg');
      setCoverUri(publicUrl);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload image.');
    } finally {
      setUploadingCover(false);
    }
  };

  const clearCover = () => setCoverUri(null);

  const selectPlace = useCallback(
    async (placeId: string, fallbackName: string, fallbackAddress: string) => {
      setPickingPlace(true);
      try {
        const details = await getPlaceDetails(placeId);
        setSelectedPlace({
          placeId: details.placeId,
          name: details.name || fallbackName,
          address: details.formattedAddress || fallbackAddress,
          latitude: details.latitude,
          longitude: details.longitude,
        });
        setLocationQuery('');
      } catch {
        Alert.alert('Location error', 'Could not load place details. Try another result.');
      } finally {
        setPickingPlace(false);
      }
    },
    [],
  );

  const clearPlace = () => {
    setSelectedPlace(null);
    setLocationQuery('');
  };

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      if (!categoryId) throw new Error('Select a category');
      if (!selectedPlace) throw new Error('Select a location from search');
      const start = combineDateAndTime(eventDate, startTime);
      const end = combineDateAndTime(eventDate, endTime);
      if (end <= start) throw new Error('End time must be after start time');
      const cap = maxCapacity.trim() ? parseInt(maxCapacity, 10) : undefined;
      if (maxCapacity.trim() && (!cap || cap < 1)) {
        throw new Error('Max capacity must be a positive number');
      }
      return createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId,
        coverImageUrl: coverUri ?? undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        locationName: selectedPlace.name,
        locationAddress:
          [selectedPlace.address, locationDetails.trim()].filter(Boolean).join(' · ') || undefined,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        maxCapacity: cap,
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

  const titleOk = title.trim().length >= 5;
  const categoryOk = !!categoryId;
  const locationOk = !!selectedPlace;
  const categoriesLoaded = !catsLoading && (categories?.length ?? 0) > 0;

  const submitBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (!titleOk) {
      blockers.push(`Title needs at least 5 characters (${title.trim().length}/5)`);
    }
    if (!categoriesLoaded) {
      blockers.push('Categories are still loading or missing on the server');
    } else if (!categoryOk) {
      blockers.push('Select a category');
    }
    if (!locationOk) {
      blockers.push('Search location and tap a suggestion from the list');
    }
    if (uploadingCover) blockers.push('Banner image is still uploading');
    if (pickingPlace) blockers.push('Loading location details…');
    return blockers;
  }, [titleOk, title, categoriesLoaded, categoryOk, locationOk, uploadingCover, pickingPlace]);

  const canSubmit =
    titleOk &&
    categoryOk &&
    locationOk &&
    categoriesLoaded &&
    !isPending &&
    !uploadingCover &&
    !pickingPlace;

  const onCreate = () => {
    if (title.trim().length < 5) {
      Alert.alert('Title required', 'Event title must be at least 5 characters.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Category required', 'Please select a category.');
      return;
    }
    if (!selectedPlace) {
      Alert.alert('Location required', 'Search and select a venue on the map.');
      return;
    }
    submit();
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['top']} style={s.navSafe}>
        <View style={s.topRow}>
          <View style={s.navSide}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={s.backBtn}
              activeOpacity={0.65}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <ChevronLeft size={24} strokeWidth={2} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={s.navTitleWrap}>
            <Text style={s.screenTitle}>CREATE EVENT</Text>
          </View>
          <View style={[s.navSide, s.navSideRight]} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.form}>
          {/* Banner */}
          <Text style={[s.fieldLabel, s.fieldLabelFirst]}>BANNER IMAGE</Text>
          <View style={s.bannerBox}>
            <TouchableOpacity
              style={s.bannerPress}
              onPress={() => void pickCover()}
              activeOpacity={0.85}
              accessibilityLabel={coverUri ? 'Change banner image' : 'Add banner image'}
            >
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={s.bannerImg} contentFit="cover" />
              ) : (
                <View style={s.bannerPlaceholder}>
                  {uploadingCover ? (
                    <ActivityIndicator color={theme.tealPrimary} />
                  ) : (
                    <>
                      <ImagePlus size={28} strokeWidth={1.75} color={theme.textMuted} />
                      <Text style={s.bannerHint}>Tap to add banner</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
            {coverUri ? (
              <TouchableOpacity
                style={s.bannerRemove}
                onPress={clearCover}
                hitSlop={8}
                accessibilityLabel="Remove banner"
              >
                <X size={14} strokeWidth={2} color={theme.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Title */}
          <Text style={s.fieldLabel}>TITLE</Text>
          <TextInput
            style={s.input}
            placeholder="Sunday Morning Run"
            placeholderTextColor={theme.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
          <Text style={[s.hint, !titleOk && title.trim().length > 0 && s.hintError]}>
            {titleOk ? 'Title looks good' : `At least 5 characters (${title.trim().length}/5)`}
          </Text>

          {/* Description */}
          <Text style={s.fieldLabel}>DESCRIPTION</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="What to expect, what to bring..."
            placeholderTextColor={theme.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{description.length}/2000</Text>

          {/* Category */}
          <Text style={s.fieldLabel}>CATEGORY</Text>
          {catsLoading ? (
            <ActivityIndicator color={theme.tealPrimary} style={{ marginVertical: 12 }} />
          ) : (categories ?? []).length === 0 ? (
            <Text style={s.hintWarn}>
              No categories on the server yet. Ask the admin to run database seed on production.
            </Text>
          ) : (
            <View style={s.chipGrid}>
              {(categories ?? []).map((cat) => {
                const active = categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategoryId(cat.id)}
                    style={[s.chip, active && s.chipActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {!catsLoading && !categoryOk && (categories?.length ?? 0) > 0 ? (
            <Text style={s.hint}>Tap a category chip above</Text>
          ) : null}

          {/* Location search */}
          <Text style={s.fieldLabel}>LOCATION</Text>
          {selectedPlace ? (
            <View style={s.selectedPlaceCard}>
              <MapPin size={18} strokeWidth={1.75} color={theme.tealPrimary} />
              <View style={s.selectedPlaceText}>
                <Text style={s.selectedPlaceName} numberOfLines={1}>
                  {selectedPlace.name}
                </Text>
                <Text style={s.selectedPlaceAddress} numberOfLines={2}>
                  {selectedPlace.address}
                </Text>
              </View>
              <TouchableOpacity
                onPress={clearPlace}
                hitSlop={8}
                accessibilityLabel="Clear location"
              >
                <X size={16} strokeWidth={2} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.searchRow}>
                <Search size={16} strokeWidth={1.75} color={theme.textMuted} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search gyms, parks, venues..."
                  placeholderTextColor={theme.textMuted}
                  value={locationQuery}
                  onChangeText={setLocationQuery}
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {(placesLoading || pickingPlace) && (
                  <ActivityIndicator size="small" color={theme.tealPrimary} />
                )}
              </View>
              {!placesConfigured && (
                <Text style={s.hintWarn}>
                  Google Places is not configured on the server. Location search may be unavailable.
                </Text>
              )}
              {placesError && debouncedLocationQ.length >= 2 && (
                <Text style={s.hintError}>Could not load places. Try again.</Text>
              )}
              {debouncedLocationQ.length < 2 && !selectedPlace && (
                <Text style={s.hint}>Type at least 2 characters for suggestions</Text>
              )}
              {debouncedLocationQ.length >= 2 &&
                !placesLoading &&
                placeSuggestions.length === 0 && (
                  <Text style={s.hint}>No places found — try another search</Text>
                )}
              {placeSuggestions.map((place) => (
                <TouchableOpacity
                  key={place.placeId}
                  style={s.suggestionRow}
                  onPress={() => void selectPlace(place.placeId, place.mainText, place.description)}
                  activeOpacity={0.75}
                  disabled={pickingPlace}
                >
                  <View style={s.suggestionIcon}>
                    <MapPin size={16} strokeWidth={1.75} color={theme.tealPrimary} />
                  </View>
                  <View style={s.suggestionText}>
                    <Text style={s.suggestionMain} numberOfLines={1}>
                      {place.mainText}
                    </Text>
                    {place.secondaryText ? (
                      <Text style={s.suggestionSub} numberOfLines={1}>
                        {place.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={s.fieldLabel}>LOCATION DETAILS (OPTIONAL)</Text>
          <TextInput
            style={s.input}
            placeholder="Gate, floor, meeting point..."
            placeholderTextColor={theme.textMuted}
            value={locationDetails}
            onChangeText={setLocationDetails}
            maxLength={500}
          />

          {/* Date */}
          <Text style={s.fieldLabel}>DATE</Text>
          <Pressable style={s.pickerTrigger} onPress={() => togglePicker('date')}>
            <Calendar size={18} strokeWidth={1.75} color={theme.tealPrimary} />
            <Text style={s.pickerTriggerText}>{formatPickerDate(eventDate)}</Text>
          </Pressable>
          <PickerShell visible={activePicker === 'date'}>
            <DateTimePicker
              value={eventDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={onDateChange}
              themeVariant={pickerTheme}
              style={Platform.OS === 'ios' ? s.iosPicker : undefined}
            />
          </PickerShell>

          {/* Times */}
          <Text style={s.fieldLabel}>START TIME</Text>
          <Pressable style={s.pickerTrigger} onPress={() => togglePicker('start')}>
            <Clock size={18} strokeWidth={1.75} color={theme.tealPrimary} />
            <Text style={s.pickerTriggerText}>{formatPickerTime(startTime)}</Text>
          </Pressable>
          <PickerShell visible={activePicker === 'start'}>
            <DateTimePicker
              value={startTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onStartTimeChange}
              themeVariant={pickerTheme}
              style={Platform.OS === 'ios' ? s.iosPicker : undefined}
            />
          </PickerShell>

          <Text style={s.fieldLabel}>END TIME</Text>
          <Pressable style={s.pickerTrigger} onPress={() => togglePicker('end')}>
            <Clock size={18} strokeWidth={1.75} color={theme.tealPrimary} />
            <Text style={s.pickerTriggerText}>{formatPickerTime(endTime)}</Text>
          </Pressable>
          <PickerShell visible={activePicker === 'end'}>
            <DateTimePicker
              value={endTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onEndTimeChange}
              themeVariant={pickerTheme}
              style={Platform.OS === 'ios' ? s.iosPicker : undefined}
            />
          </PickerShell>

          {/* Capacity */}
          <Text style={s.fieldLabel}>MAX CAPACITY (OPTIONAL)</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. 50"
            placeholderTextColor={theme.textMuted}
            value={maxCapacity}
            onChangeText={setMaxCapacity}
            keyboardType="number-pad"
            maxLength={5}
          />

          {!canSubmit && submitBlockers.length > 0 ? (
            <View style={s.blockerBox}>
              <Text style={s.blockerTitle}>Still needed:</Text>
              {submitBlockers.map((line) => (
                <Text key={line} style={s.blockerLine}>
                  • {line}
                </Text>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            onPress={onCreate}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator color={theme.onTeal} />
            ) : (
              <Text style={s.submitBtnText}>CREATE EVENT</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: ThemeType, pageBg: string) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: pageBg },
    navSafe: {
      backgroundColor: pageBg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.surface3,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 10,
      minHeight: 44,
    },
    navSide: {
      width: 72,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    navSideRight: { alignItems: 'flex-end' },
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
      color: theme.textPrimary,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    blockerBox: {
      marginBottom: 14,
      padding: 14,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.surface3,
      backgroundColor: theme.surface1,
      gap: 4,
    },
    blockerTitle: {
      fontFamily: fonts.bodyStrong,
      fontSize: 13,
      color: theme.textPrimary,
      marginBottom: 4,
    },
    blockerLine: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 18,
    },
    submitBtn: {
      marginTop: 32,
      backgroundColor: theme.tealPrimary,
      borderRadius: radius.md,
      paddingVertical: 16,
      alignItems: 'center',
      ...theme.shadows.teal,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: {
      fontFamily: fonts.button,
      fontSize: 15,
      color: theme.onTeal,
      letterSpacing: 1,
    },
    scroll: { paddingBottom: 48 },
    form: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    fieldLabel: {
      fontFamily: fonts.label,
      fontSize: 10,
      color: theme.purpleSoft,
      letterSpacing: 1.5,
      marginBottom: 8,
      marginTop: 20,
    },
    fieldLabelFirst: { marginTop: 0 },
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
    textArea: {
      minHeight: 100,
      paddingTop: 14,
    },
    charCount: {
      fontFamily: fonts.caption,
      fontSize: 11,
      color: theme.textMuted,
      textAlign: 'right',
      marginTop: 5,
    },
    bannerBox: {
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.surface3,
      backgroundColor: theme.surface1,
      aspectRatio: 16 / 9,
    },
    bannerPress: { flex: 1, width: '100%' },
    bannerImg: { width: '100%', height: '100%', minHeight: 160 },
    bannerPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 160,
    },
    bannerHint: {
      fontFamily: fonts.caption,
      fontSize: 13,
      color: theme.textMuted,
    },
    bannerRemove: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 28,
      height: 28,
      borderRadius: 9999,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 9999,
      backgroundColor: theme.surface1,
      borderWidth: 1.5,
      borderColor: theme.surface3,
    },
    chipActive: {
      backgroundColor: theme.surface2,
      borderColor: theme.tealPrimary,
    },
    chipText: {
      fontFamily: fonts.bodyStrong,
      fontSize: 13,
      color: theme.textMuted,
    },
    chipTextActive: { color: theme.tealPrimary },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.surface1,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.surface3,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 15,
      color: theme.textPrimary,
      padding: 0,
    },
    selectedPlaceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.surface1,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.tealPrimary,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    selectedPlaceText: { flex: 1 },
    selectedPlaceName: {
      fontFamily: fonts.bodyStrong,
      fontSize: 15,
      color: theme.textPrimary,
    },
    selectedPlaceAddress: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.surface3,
    },
    suggestionIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: theme.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggestionText: { flex: 1 },
    suggestionMain: {
      fontFamily: fonts.bodyStrong,
      fontSize: 14,
      color: theme.textPrimary,
    },
    suggestionSub: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    hint: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 8,
    },
    hintWarn: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: theme.warning,
      marginTop: 8,
    },
    hintError: {
      fontFamily: fonts.caption,
      fontSize: 12,
      color: theme.error,
      marginTop: 8,
    },
    pickerTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.surface1,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.surface3,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    pickerTriggerText: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: theme.textPrimary,
    },
    pickerShell: {
      height: IOS_PICKER_HEIGHT,
      marginTop: 4,
      marginBottom: 4,
      overflow: 'hidden',
      justifyContent: 'center',
      backgroundColor: theme.surface1,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.surface3,
    },
    iosPicker: {
      height: IOS_PICKER_HEIGHT,
      width: '100%',
    },
  });
}
