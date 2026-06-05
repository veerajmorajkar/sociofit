import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AUTH_VIDEO_URI } from '@/constants/auth';

const POSTER = require('@/assets/auth/poster.jpg');

interface Props {
  children?: React.ReactNode;
}

export default function AuthVideoBackdrop({ children }: Props) {
  const [videoFailed, setVideoFailed] = useState(false);
  const player = useVideoPlayer(AUTH_VIDEO_URI, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'error' || error) setVideoFailed(true);
    });
    return () => sub.remove();
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
        />
      ) : (
        <Image
          source={POSTER}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      )}

      <LinearGradient
        colors={['rgba(14,14,20,0.35)', 'rgba(14,14,20,0.55)', 'rgba(14,14,20,0.92)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0E0E14',
  },
});
