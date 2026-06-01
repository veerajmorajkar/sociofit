import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useState } from 'react';
import { Home as HomeIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppHeader from '@/components/ui/AppHeader';
import PostCard from '@/components/feed/PostCard';
import EventCard from '@/components/feed/EventCard';
import { colors, fonts } from '@/constants/theme';
import { SCROLL_BOTTOM_PADDING } from '@/constants/layout';

const DEMO_FEED = [
  {
    id: '1',
    type: 'post' as const,
    username: 'Aarav_Runs',
    activity: '5K personal best',
    timestamp: '2h ago',
    caption: 'Finally broke my 5K PR this morning at Marine Drive. The sunrise was incredible.',
    likeCount: 41,
    commentCount: 9,
    isLiked: false,
    avatarInitial: 'A',
  },
  {
    id: '2',
    type: 'event' as const,
    clubName: 'PBCO Run Club',
    time: 'Sun 6AM',
    location: 'Bandra',
    goingCount: 52,
    avatarInitial: 'P',
    isClub: true,
  },
  {
    id: '3',
    type: 'post' as const,
    username: 'Maya_Cycles',
    activity: '40km ride',
    timestamp: '5h ago',
    caption: 'Weekend ride through the Western Ghats. The climb was brutal but the views made it worth every pedal stroke.',
    likeCount: 87,
    commentCount: 14,
    isLiked: true,
    avatarInitial: 'M',
  },
  {
    id: '4',
    type: 'event' as const,
    clubName: 'Mumbai Yoga Collective',
    time: 'Sat 7AM',
    location: 'Juhu Beach',
    goingCount: 28,
    avatarInitial: 'M',
    isClub: true,
  },
];

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />

      <View style={{ flex: 1 }}>
        <FlatList
          data={DEMO_FEED}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.type === 'event') {
              return (
                <EventCard
                  clubName={item.clubName}
                  time={item.time}
                  location={item.location}
                  goingCount={item.goingCount}
                  avatarInitial={item.avatarInitial}
                  isClub={item.isClub}
                />
              );
            }
            return (
              <PostCard
                username={item.username}
                activity={item.activity}
                timestamp={item.timestamp}
                caption={item.caption}
                likeCount={item.likeCount}
                commentCount={item.commentCount}
                isLiked={item.isLiked}
                avatarInitial={item.avatarInitial}
              />
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.lime} />
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 }}>
              <HomeIcon size={40} strokeWidth={1.5} color={colors.text4} />
              <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.text1, marginTop: 16, textTransform: 'uppercase', letterSpacing: -0.5 }}>
                YOUR FEED IS QUIET
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text3, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
                Follow clubs and athletes to see their posts here
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingTop: 4, paddingBottom: SCROLL_BOTTOM_PADDING }}
          showsVerticalScrollIndicator={false}
        />

        {/* Gradient fade — separates feed from nav bar visually */}
        <LinearGradient
          colors={['rgba(14,14,14,0)', 'rgba(14,14,14,0.85)', '#0E0E0E']}
          locations={[0, 0.5, 1]}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            pointerEvents: 'none',
          }}
        />
      </View>
    </View>
  );
}
