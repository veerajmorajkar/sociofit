import { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts } from '@/constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 16;
export const CAROUSEL_W = SCREEN_W - H_PAD * 2;
export const CAROUSEL_H = Math.round(SCREEN_W * 0.88);

interface Props {
  urls: string[];
  onPress?: () => void;
  /** When false, taps pass through for feed navigation only on single-image posts */
  interactive?: boolean;
}

function PostMediaCarousel({ urls, onPress, interactive = true }: Props) {
  const [index, setIndex] = useState(0);
  const count = urls.length;

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / CAROUSEL_W);
      setIndex(Math.min(Math.max(0, next), count - 1));
    },
    [count],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<string>) => {
      const image = (
        <Image
          source={{ uri: item }}
          style={s.slideImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={item}
        />
      );

      if (onPress) {
        return (
          <Pressable onPress={onPress} style={s.slide}>
            {image}
          </Pressable>
        );
      }

      return <View style={s.slide}>{image}</View>;
    },
    [onPress],
  );

  if (count === 0) return null;

  return (
    <View style={s.wrap}>
      <FlatList
        data={urls}
        horizontal
        pagingEnabled
        bounces={count > 1}
        scrollEnabled={interactive && count > 1}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        nestedScrollEnabled
        snapToInterval={CAROUSEL_W}
        snapToAlignment="start"
        disableIntervalMomentum
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        renderItem={renderItem}
        getItemLayout={(_, i) => ({
          length: CAROUSEL_W,
          offset: CAROUSEL_W * i,
          index: i,
        })}
        style={s.list}
      />

      {count > 1 && (
        <>
          <View style={s.counter} pointerEvents="none">
            <Text style={s.counterText}>
              {index + 1}/{count}
            </Text>
          </View>
          <View style={s.dots} pointerEvents="none">
            {urls.map((uri, i) => (
              <View key={`dot-${uri}-${i}`} style={[s.dot, i === index && s.dotActive]} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    width: CAROUSEL_W,
    height: CAROUSEL_H,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  list: {
    width: CAROUSEL_W,
    height: CAROUSEL_H,
  },
  slide: {
    width: CAROUSEL_W,
    height: CAROUSEL_H,
  },
  slideImage: {
    width: CAROUSEL_W,
    height: CAROUSEL_H,
  },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  counterText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: colors.tealPrimary,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});

export default memo(PostMediaCarousel);
