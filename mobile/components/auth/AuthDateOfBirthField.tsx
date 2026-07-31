import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { defaultBirthdatePickerValue, formatBirthdateLabel } from '@/utils/birthdate';
import { onVideo } from '@/components/auth/onVideoColors';

interface Props {
  value: Date | null;
  onChange: (date: Date) => void;
  disabled?: boolean;
  maximumDate?: Date;
}

export default function AuthDateOfBirthField({
  value,
  onChange,
  disabled,
  maximumDate = new Date(),
}: Props) {
  const { theme, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? defaultBirthdatePickerValue());

  const openPicker = () => {
    if (disabled) return;
    setDraft(value ?? defaultBirthdatePickerValue());
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'dismissed' || !date) return;
      onChange(date);
      return;
    }
    if (date) setDraft(date);
  };

  const confirmIOS = () => {
    onChange(draft);
    closePicker();
  };

  return (
    <View style={s.block}>
      <TouchableOpacity
        onPress={openPicker}
        // on-video glass field: always light over dark video
        style={s.btn}
        disabled={disabled}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Select date of birth"
      >
        <Text style={[s.btnText, { color: value ? onVideo.text : onVideo.textFaint }]}>
          {value ? formatBirthdateLabel(value) : 'Select date of birth'}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={closePicker}>
          <Pressable style={s.backdrop} onPress={confirmIOS}>
            {/* Solid panel — themes with light/dark mode */}
            <Pressable
              style={[s.sheet, { backgroundColor: theme.surface1 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[s.sheetHeader, { borderBottomColor: theme.border }]}>
                <Pressable
                  onPress={closePicker}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel date of birth"
                >
                  <Text style={[s.sheetActionMuted, { color: theme.textMuted }]}>Cancel</Text>
                </Pressable>
                <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>Date of birth</Text>
                <Pressable
                  onPress={confirmIOS}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm date of birth"
                >
                  <Text style={[s.sheetAction, { color: theme.tealPrimary }]}>Done</Text>
                </Pressable>
              </View>
              <View style={s.pickerWrap}>
                <DateTimePicker
                  value={draft}
                  mode="date"
                  display="spinner"
                  maximumDate={maximumDate}
                  onChange={handleChange}
                  themeVariant={isDark ? 'dark' : 'light'}
                  style={s.picker}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        open && (
          <DateTimePicker
            value={draft}
            mode="date"
            display="default"
            maximumDate={maximumDate}
            onChange={handleChange}
          />
        )
      )}
    </View>
  );
}

const s = StyleSheet.create({
  block: { marginBottom: 12 },
  btn: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: onVideo.inputBorder,
    backgroundColor: onVideo.inputBg,
  },
  btnText: { fontFamily: fonts.body, fontSize: 15 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  sheetAction: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  sheetActionMuted: {
    fontFamily: fonts.body,
    fontSize: 15,
  },
  pickerWrap: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  picker: {
    width: Dimensions.get('window').width,
    height: 216,
  },
});
