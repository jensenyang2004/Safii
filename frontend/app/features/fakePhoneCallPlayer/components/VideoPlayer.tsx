import React, { useRef } from 'react'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { StyleSheet } from 'react-native'

interface VideoPlayerProps {
    source: any;
    paused: boolean;
    onProgress: (ms: number) => void;
}

export default function VideoPlayer({ source, paused, onProgress }: VideoPlayerProps) {
    const ref = useRef<Video>(null)

    return (
        <Video
            ref={ref}
            source={source}
            // style={{ width: '100%', aspectRatio: 16 / 9 }}
            style={styles.fullscreen}
            // useNativeControls
            //   resizeMode={ResizeMode.CONTAIN}
            resizeMode={ResizeMode.COVER}
            shouldPlay={!paused}
            onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                if (status.isLoaded && typeof status.positionMillis === 'number') {
                    onProgress(status.positionMillis)
                }
            }}
        />
    )
}

const styles = StyleSheet.create({
  fullscreen: {
    ...StyleSheet.absoluteFillObject,  // 2️⃣ top:0, left:0, right:0, bottom:0
  },
})