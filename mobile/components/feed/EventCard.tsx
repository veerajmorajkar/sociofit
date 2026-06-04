import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, shadows, gradients } from '@/constants/theme';

export default function EventCard({
  clubName,
  time,
  location,
  goingCount,
  avatarInitial,
  isClub = true,
  category: _category,
  onRsvp,
  onPress,
}: {
  clubName: string;
  time: string;
  location: string;
  goingCount: number;
  avatarInitial: string;
  isClub?: boolean;
  category?: string;
  onRsvp?: () => void;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={s.card}>
      {/* ── Header ── */}
      <View style={s.header}>
        {/* Avatar */}
        <View style={[s.avatar, s.avatarRound]}>
          <Text style={s.avatarLetter}>{avatarInitial}</Text>
        </View>

        {/* Name + meta */}
        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>
              {clubName.toUpperCase()}
            </Text>
          </View>
          <Text style={s.meta}>
            {time} · {location}
          </Text>
        </View>

        {/* EVENT tag */}
        <View style={s.eventTag}>
          <Text style={s.eventTagText}>EVENT</Text>
        </View>
      </View>

      {/* ── Media well — category gradient ── */}
      <LinearGradient
        colors={gradients.eventRunning}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.media}
      />

      {/* ── Footer ── */}
      <View style={s.footer}>
        <Text style={s.going}>{goingCount} going</Text>

        {/* JOIN — teal primary CTA */}
        <TouchableOpacity onPress={onRsvp} activeOpacity={0.85} style={s.joinBtn}>
          <Text style={s.joinText}>JOIN →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surface3,
    ...shadows.md,
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
    borderRadius: 21,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.purpleHero,
  },
  avatarRound: { borderRadius: 21 },
  avatarLetter: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.purpleSoft,
  },
  info: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  name: {
    fontFamily: fonts.h2,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  meta: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  eventTag: {
    backgroundColor: 'rgba(168,130,255,0.12)',
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(168,130,255,0.22)',
  },
  eventTagText: {
    fontFamily: fonts.label,
    fontSize: 9,
    color: colors.purpleSoft,
    letterSpacing: 1.5,
  },

  // Media
  media: {
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    marginBottom: 14,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  going: {
    fontFamily: fonts.caption,
    fontSize: 13,
    color: colors.purpleSoft,
  },

  // JOIN button — teal primary CTA
  joinBtn: {
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.teal,
  },
  joinText: {
    fontFamily: fonts.button,
    fontSize: 12,
    color: colors.onTeal,
    letterSpacing: 1,
  },
});
