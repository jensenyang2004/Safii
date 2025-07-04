import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { Cue } from '../../../utils/subtitles'

const { width } = Dimensions.get('window')
const VIDEO_HEIGHT = (width * 9) / 16

interface SubtitleOverlayProps {
  cues: Cue[]
  currentMs: number
}

export default function SubtitleOverlay({ cues, currentMs }: SubtitleOverlayProps) {
  // pick the cue whose window contains currentMs
  const active = cues.find(c => currentMs >= c.startMs && currentMs <= c.endMs)
  if (!active) return null

  // split & highlight logic
  const words      = active.text.split(' ')
  const duration   = active.endMs - active.startMs
  const elapsed    = currentMs - active.startMs
  const fraction   = Math.max(0, Math.min(1, elapsed / duration))
  const count      = Math.floor(fraction * words.length)
  const highlighted = words.slice(0, count).join(' ')
  const rest        = words.slice(count).join(' ')

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        <Text style={styles.highlighted}>{highlighted}{highlighted ? ' ' : ''}</Text>
        <Text>{rest}</Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position:        'absolute',
    bottom:          20,
    width:           '100%',
    alignItems:      'center',
    paddingHorizontal: 10,
  },
  text: {
    color:    '#fff',
    fontSize: 24,
    textAlign:'center',
    width,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 4,
    borderRadius: 4,
  },
  highlighted: {
    color:       '#4ADE80',
    fontWeight: 'bold',
  },
})