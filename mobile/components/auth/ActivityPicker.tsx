import { StyleSheet, Text, View } from 'react-native';
import PressableScale from '@/components/ui/PressableScale';
import { ACTIVITIES, MIN_ACTIVITIES } from '@/constants/activities';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { selectHaptic } from '@/utils/haptics';
import { onVideo } from '@/components/auth/onVideoColors';

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
}

export default function ActivityPicker({ selected, onToggle }: Props) {
  const { theme } = useTheme();

  return (
    <>
      <View style={s.grid}>
        {ACTIVITIES.map((activity) => {
          const picked = selected.includes(activity.id);
          return (
            <PressableScale
              key={activity.id}
              style={[
                s.chip,
                picked && {
                  borderColor: theme.tealPrimary,
                  backgroundColor: `${theme.tealPrimary}1F`,
                },
              ]}
              pressedScale={0.94}
              onPress={() => {
                selectHaptic();
                onToggle(activity.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={activity.label}
              accessibilityState={{ selected: picked }}
            >
              <Text style={s.chipIcon}>{activity.icon}</Text>
              <Text style={[s.chipLabel, picked && { color: theme.tealPrimary }]}>
                {activity.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <Text
        style={[s.countText, selected.length >= MIN_ACTIVITIES && { color: theme.tealPrimary }]}
      >
        {selected.length} selected
        {selected.length < MIN_ACTIVITIES
          ? ` — need ${MIN_ACTIVITIES - selected.length} more`
          : ' — good to go!'}
      </Text>
    </>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1.5,
    // on-video glass chip: always light border over dark video
    borderColor: onVideo.inputBorder,
  },
  chipIcon: { fontSize: 14 },
  // on-video text: always light over dark video
  chipLabel: { fontFamily: fonts.bodyStrong, fontSize: 12, color: onVideo.textMuted },
  countText: {
    textAlign: 'center',
    fontFamily: fonts.caption,
    fontSize: 13,
    color: onVideo.textMuted,
    marginBottom: 24,
  },
});
