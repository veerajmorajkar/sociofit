import { View, Text, TextInput, Platform } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search as SearchIcon, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BG = '#0E0E0E';
const SURFACE = '#161616';
const TEXT1 = '#E8E0D0';
const TEXT3 = '#706860';
const TEXT4 = '#4A4440';

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BG }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: SURFACE,
              borderRadius: 14,
              paddingHorizontal: 14,
              gap: 10,
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.5, shadowRadius: 12 },
                android: { elevation: 4 },
              }),
            }}
          >
            <SearchIcon size={18} strokeWidth={1.75} color={TEXT3} />
            <TextInput
              style={{ flex: 1, paddingVertical: 14, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', color: TEXT1, letterSpacing: 0.5 }}
              placeholder="SEARCH PEOPLE, CLUBS, EVENTS..."
              placeholderTextColor={TEXT4}
              value={query}
              onChangeText={setQuery}
              accessibilityLabel="Search input"
            />
          </View>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <TrendingUp size={40} strokeWidth={1.5} color={TEXT4} />
          <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, color: TEXT1, marginTop: 16, textAlign: 'center', textTransform: 'uppercase', letterSpacing: -0.5 }}>
            DISCOVER FITSOCIAL
          </Text>
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: TEXT3, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            Search for people, clubs, and events near you
          </Text>
        </View>

        <LinearGradient
          colors={['rgba(14,14,14,0)', 'rgba(14,14,14,0.85)', '#0E0E0E']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, pointerEvents: 'none' }}
        />
      </View>
    </View>
  );
}
