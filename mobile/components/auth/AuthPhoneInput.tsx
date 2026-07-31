import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  DEFAULT_PHONE_COUNTRY,
  findPhoneCountry,
  PHONE_COUNTRIES,
} from '@/constants/phoneCountries';
import { sanitizePhoneDigits } from '@/utils/authValidation';
import { fonts, radius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  countryCode: string;
  onCountryChange: (code: string) => void;
  value: string;
  onChange: (nationalDigits: string) => void;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  inputTextStyle?: TextStyle;
  countryButtonStyle?: ViewStyle;
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * Phone input with country picker. Used on themed (non-video) screens like
 * Edit Profile, so all defaults derive from the active theme; callers can
 * still override via the style props.
 */
export default function AuthPhoneInput({
  countryCode,
  onCountryChange,
  value,
  onChange,
  disabled,
  containerStyle,
  inputTextStyle,
  countryButtonStyle,
  inputStyle,
}: Props) {
  const { theme } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const country = findPhoneCountry(countryCode);

  const handleDigitsChange = (text: string) => {
    onChange(sanitizePhoneDigits(text, country.nationalLength));
  };

  const selectCountry = (code: string) => {
    const next = findPhoneCountry(code);
    onCountryChange(next.code);
    onChange(sanitizePhoneDigits(value, next.nationalLength));
    setPickerOpen(false);
  };

  const fieldChrome = {
    borderColor: theme.border,
    backgroundColor: theme.insetWell,
  };

  return (
    <View style={[s.row, containerStyle]}>
      <TouchableOpacity
        style={[s.countryBtn, fieldChrome, countryButtonStyle, disabled && s.disabled]}
        onPress={() => setPickerOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Country code ${country.label}`}
      >
        <Text style={[s.countryCode, { color: theme.textPrimary }, inputTextStyle]}>
          +{country.dialCode}
        </Text>
        <Text style={[s.chevron, { color: theme.textMuted }]}>▾</Text>
      </TouchableOpacity>

      <TextInput
        style={[s.input, fieldChrome, { color: theme.textPrimary }, inputStyle, inputTextStyle]}
        value={value}
        onChangeText={handleDigitsChange}
        keyboardType="phone-pad"
        maxLength={country.nationalLength}
        placeholder={`${country.nationalLength}-digit number`}
        placeholderTextColor={theme.textMuted}
        editable={!disabled}
        accessibilityLabel="Phone number"
      />

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setPickerOpen(false)}>
          {/* Solid panel — themes with light/dark mode */}
          <Pressable
            style={[s.sheet, { backgroundColor: theme.surface1 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={[s.sheetTitle, { color: theme.textPrimary, borderBottomColor: theme.border }]}
            >
              Select country
            </Text>
            <FlatList
              data={PHONE_COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const selected = item.code === country.code;
                return (
                  <TouchableOpacity
                    style={[
                      s.countryRow,
                      { borderBottomColor: theme.border },
                      selected && { backgroundColor: `${theme.tealPrimary}14` },
                    ]}
                    onPress={() => selectCountry(item.code)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[s.countryRowLabel, { color: theme.textPrimary }]}>
                      {item.label} (+{item.dialCode})
                    </Text>
                    {selected ? (
                      <Text style={[s.check, { color: theme.tealPrimary }]}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export { DEFAULT_PHONE_COUNTRY };

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 12,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 88,
    justifyContent: 'center',
  },
  countryCode: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  chevron: {
    fontSize: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    borderWidth: 1,
  },
  disabled: { opacity: 0.6 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '55%',
    paddingBottom: 24,
  },
  sheetTitle: {
    fontFamily: fonts.bodyStrong,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryRowLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
  },
  check: {
    fontFamily: fonts.bodyStrong,
    fontSize: 16,
  },
});
