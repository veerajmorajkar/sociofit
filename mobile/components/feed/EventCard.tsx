import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function EventCard({
  clubName,
  time,
  location,
  goingCount,
  avatarInitial,
  isClub = true,
  onRsvp,
  onPress,
}: {
  clubName: string;
  time: string;
  location: string;
  goingCount: number;
  avatarInitial: string;
  isClub?: boolean;
  onRsvp?: () => void;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={s.card}>

      {/* ── Header ── */}
      <View style={s.header}>
        {/* Avatar */}
        <View style={[s.avatar, !isClub && s.avatarRound]}>
          <Text style={s.avatarLetter}>{avatarInitial}</Text>
        </View>

        {/* Name + meta */}
        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{clubName.toUpperCase()}</Text>
          </View>
          <Text style={s.meta}>{time} · {location}</Text>
        </View>

        {/* EVENT tag */}
        <View style={s.eventTag}>
          <Text style={s.eventTagText}>EVENT</Text>
        </View>
      </View>

      {/* ── Media well ── */}
      <View style={s.media} />

      {/* ── Footer ── */}
      <View style={s.footer}>
        <Text style={s.going}>{goingCount} going</Text>

        {/* JOIN — kinetic: lime block, sharp corners, bold */}
        <TouchableOpacity
          onPress={onRsvp}
          activeOpacity={0.75}
          style={s.joinBtn}
        >
          <Text style={s.joinText}>JOIN →</Text>
        </TouchableOpacity>
      </View>

    </TouchableOpacity>
  );
}

const LIME = '#D4EA4D';
const LIME_DARK = '#BEDD1A';
const BG = '#0E0E0E';
const SURFACE = '#161616';
const SURFACE2 = '#1E1E1E';
const SURFACE3 = '#262626';
const TEXT1 = '#E8E0D0';
const TEXT3 = '#706860';

const s = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: SURFACE3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: LIME,
  },
  avatarRound: { borderRadius: 21 },
  avatarLetter: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: LIME,
  },
  info: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  name: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: TEXT1,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  meta: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: TEXT3,
    marginTop: 2,
  },
  eventTag: {
    backgroundColor: 'rgba(212,234,77,0.10)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(212,234,77,0.18)',
  },
  eventTagText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    color: LIME,
    letterSpacing: 1.5,
  },

  // Media
  media: {
    height: 180,
    borderRadius: 12,
    backgroundColor: SURFACE2,
    marginBottom: 14,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  going: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: TEXT3,
  },

  // JOIN button — kinetic: sharp, lime block, proportional
  joinBtn: {
    backgroundColor: LIME,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: BG,
    letterSpacing: 1.5,
  },
});
