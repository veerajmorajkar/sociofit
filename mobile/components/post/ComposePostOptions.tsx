import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MapPin, AtSign, ChevronRight, X, Search } from 'lucide-react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePlaceAutocomplete, usePlacesStatus } from '@/hooks/usePlaces';
import { useUserSearch } from '@/hooks/useSearch';
import { getPlaceDetails } from '@/services/places.service';
import type { UserSummary } from '@/types/user';

export interface SelectedLocation {
  placeId: string;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface Props {
  location: SelectedLocation | null;
  onLocationChange: (location: SelectedLocation | null) => void;
  taggedUsers: UserSummary[];
  onTaggedUsersChange: (users: UserSummary[]) => void;
  excludeUserId?: string;
}

const MAX_TAGS = 10;

function ExpandChevron({ open }: { open: boolean }) {
  return (
    <View style={s.chevronSlot}>
      <ChevronRight
        size={18}
        strokeWidth={1.75}
        color={colors.textMuted}
        style={open ? s.chevronOpen : undefined}
      />
    </View>
  );
}

export default function ComposePostOptions({
  location,
  onLocationChange,
  taggedUsers,
  onTaggedUsersChange,
  excludeUserId,
}: Props) {
  const [locationOpen, setLocationOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [pickingPlace, setPickingPlace] = useState(false);

  const debouncedLocationQ = useDebouncedValue(locationQuery, 280);
  const debouncedTagQ = useDebouncedValue(tagQuery.replace(/^@/, ''), 280);

  const { data: placesStatus } = usePlacesStatus();
  const {
    data: placeSuggestions = [],
    isFetching: placesLoading,
    isError: placesError,
  } = usePlaceAutocomplete(debouncedLocationQ);

  const {
    data: userSuggestions = [],
    isFetching: usersLoading,
    isError: usersError,
  } = useUserSearch(debouncedTagQ);

  const filteredUsers = userSuggestions.filter(
    (u) => u.id !== excludeUserId && !taggedUsers.some((t) => t.id === u.id),
  );

  const toggleLocation = () => {
    setLocationOpen((v) => !v);
    if (!locationOpen) setTagsOpen(false);
  };

  const toggleTags = () => {
    setTagsOpen((v) => !v);
    if (!tagsOpen) setLocationOpen(false);
  };

  const clearLocation = () => {
    onLocationChange(null);
    setLocationQuery('');
    setLocationOpen(false);
  };

  const selectPlace = useCallback(
    async (placeId: string, fallbackLabel: string, fallbackAddress: string) => {
      setPickingPlace(true);
      try {
        const details = await getPlaceDetails(placeId);
        onLocationChange({
          placeId: details.placeId,
          label: details.name || fallbackLabel,
          address: details.formattedAddress || fallbackAddress,
          latitude: details.latitude,
          longitude: details.longitude,
        });
        setLocationQuery('');
        setLocationOpen(false);
      } catch {
        onLocationChange({
          placeId,
          label: fallbackLabel,
          address: fallbackAddress,
        });
        setLocationQuery('');
        setLocationOpen(false);
      } finally {
        setPickingPlace(false);
      }
    },
    [onLocationChange],
  );

  const addTaggedUser = (user: UserSummary) => {
    if (taggedUsers.some((t) => t.id === user.id)) {
      setTagQuery('');
      return;
    }
    if (taggedUsers.length >= MAX_TAGS) {
      Alert.alert('Limit reached', `You can tag up to ${MAX_TAGS} people.`);
      return;
    }
    onTaggedUsersChange([...taggedUsers, user]);
    setTagQuery('');
  };

  const removeTaggedUser = (userId: string) => {
    onTaggedUsersChange(taggedUsers.filter((u) => u.id !== userId));
  };

  const placesConfigured = placesStatus?.configured === true;

  return (
    <View style={s.optionsCard}>
      <View style={s.optionsRim} pointerEvents="none" />

      {/* Location */}
      <View style={s.optionRow}>
        <Pressable style={s.optionRowPress} onPress={toggleLocation}>
          <View style={s.optionIcon}>
            <MapPin
              size={18}
              strokeWidth={1.75}
              color={location ? colors.tealPrimary : colors.textMuted}
            />
          </View>
          <View style={s.optionTextWrap}>
            <Text style={s.optionLabel}>Add location</Text>
            {location ? (
              <Text style={s.optionValue} numberOfLines={1}>
                {location.label}
              </Text>
            ) : (
              <Text style={s.optionHint}>Search gyms, parks, venues in Mumbai</Text>
            )}
          </View>
          {!location && <ExpandChevron open={locationOpen} />}
        </Pressable>
        {location ? (
          <Pressable onPress={clearLocation} hitSlop={8} style={s.clearHit}>
            <X size={16} strokeWidth={2} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {locationOpen && !location && (
        <View style={s.optionExpand}>
          <View style={s.searchBox}>
            <Search size={16} strokeWidth={1.75} color={colors.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Search for a place..."
              placeholderTextColor={colors.textMuted}
              value={locationQuery}
              onChangeText={setLocationQuery}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
            />
            {(placesLoading || pickingPlace) && (
              <ActivityIndicator size="small" color={colors.tealPrimary} />
            )}
          </View>

          {!placesConfigured && (
            <Text style={s.hintWarn}>
              Google Places is not set up on the server yet. Ask your admin to add
              GOOGLE_PLACES_API_KEY.
            </Text>
          )}

          {placesError && debouncedLocationQ.length >= 2 && (
            <Text style={s.hintError}>Could not load places. Try again.</Text>
          )}

          {debouncedLocationQ.length < 2 && (
            <Text style={s.hint}>Type at least 2 characters for suggestions</Text>
          )}

          {debouncedLocationQ.length >= 2 && !placesLoading && placeSuggestions.length === 0 && (
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
                <MapPin size={16} strokeWidth={1.75} color={colors.tealPrimary} />
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
        </View>
      )}

      <View style={s.optionDivider} />

      {/* Tag people */}
      <View style={s.optionRow}>
        <Pressable style={s.optionRowPress} onPress={toggleTags}>
          <View style={s.optionIcon}>
            <AtSign
              size={18}
              strokeWidth={1.75}
              color={taggedUsers.length > 0 ? colors.tealPrimary : colors.textMuted}
            />
          </View>
          <View style={s.optionTextWrap}>
            <Text style={s.optionLabel}>Tag people</Text>
            {taggedUsers.length > 0 ? (
              <Text style={s.optionValue}>{taggedUsers.length} tagged</Text>
            ) : (
              <Text style={s.optionHint}>Find friends by name or @username</Text>
            )}
          </View>
          <ExpandChevron open={tagsOpen} />
        </Pressable>
      </View>

      {tagsOpen && (
        <View style={s.optionExpand}>
          <View style={s.searchBox}>
            <AtSign size={16} strokeWidth={1.75} color={colors.purpleSoft} />
            <TextInput
              style={s.searchInput}
              placeholder="Search username or name"
              placeholderTextColor={colors.textMuted}
              value={tagQuery}
              onChangeText={setTagQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {usersLoading && <ActivityIndicator size="small" color={colors.tealPrimary} />}
          </View>

          {usersError && debouncedTagQ.length >= 1 && (
            <Text style={s.hintError}>Could not search users. Try again.</Text>
          )}

          {debouncedTagQ.length < 1 && <Text style={s.hint}>Start typing to see suggestions</Text>}

          {debouncedTagQ.length >= 1 && !usersLoading && filteredUsers.length === 0 && (
            <Text style={s.hint}>No users found</Text>
          )}

          {filteredUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={s.suggestionRow}
              onPress={() => addTaggedUser(user)}
              activeOpacity={0.75}
            >
              <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size={36} ring />
              <View style={s.suggestionText}>
                <Text style={s.suggestionMain} numberOfLines={1}>
                  {user.displayName}
                </Text>
                <Text style={s.suggestionSub} numberOfLines={1}>
                  @{user.username}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {taggedUsers.length > 0 && (
            <View style={s.tagPills}>
              {taggedUsers.map((user) => (
                <View key={user.id} style={s.tagPill}>
                  <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size={22} />
                  <Text style={s.tagPillText}>@{user.username}</Text>
                  <Pressable onPress={() => removeTaggedUser(user.id)} hitSlop={6}>
                    <X size={12} strokeWidth={2.5} color={colors.purpleSoft} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  optionsCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface3,
    overflow: 'hidden',
    ...shadows.sm,
  },
  optionsRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.035)',
    zIndex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingRight: 10,
  },
  optionRowPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  chevronSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: { flex: 1, minWidth: 0 },
  optionLabel: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary },
  optionValue: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.tealPrimary,
    marginTop: 2,
  },
  optionHint: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  clearHit: { padding: 8, marginRight: 4 },
  optionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface3,
    marginLeft: 62,
  },
  optionExpand: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface3,
    paddingHorizontal: 12,
    gap: 8,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: { flex: 1, minWidth: 0 },
  suggestionMain: {
    fontFamily: fonts.bodyStrong,
    fontSize: 14,
    color: colors.textPrimary,
  },
  suggestionSub: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  hint: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  hintWarn: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.purpleSoft,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  hintError: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: '#E57373',
    paddingHorizontal: 4,
  },
  tagPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surface3,
    borderRadius: radius.full,
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 5,
  },
  tagPillText: { fontFamily: fonts.bodyStrong, fontSize: 12, color: colors.purpleSoft },
});
