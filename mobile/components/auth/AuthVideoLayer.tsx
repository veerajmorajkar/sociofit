import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { getAuthVideoSource } from '@/constants/auth';

interface Props {
  children?: React.ReactNode;
}

export default function AuthVideoLayer({ children }: Props) {
  const [videoFailed, setVideoFailed] = useState(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const source = getAuthVideoSource();

  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [contentOpacity]);

  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        player.loop = true;
        player.muted = true;
        player.play();
      }
      if (status === 'error') {
        setVideoFailed(true);
      }
    });

    return () => statusSub.remove();
  }, [player]);

  return (
    <View style={s.root}>
      {!videoFailed ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          pointerEvents="none"
        />
      ) : null}

      <LinearGradient
        colors={
          videoFailed
            ? ['rgba(14,14,20,0.85)', 'rgba(14,14,20,0.92)', 'rgba(14,14,20,0.98)']
            : ['rgba(14,14,20,0.35)', 'rgba(14,14,20,0.55)', 'rgba(14,14,20,0.92)']
        }
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Animated.View style={[s.content, { opacity: contentOpacity }]}>{children}</Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    // Deliberately dark in BOTH themes — floor behind the dark looping video.
    backgroundColor: '#0E0E14',
  },
  content: {
    flex: 1,
  },
});
