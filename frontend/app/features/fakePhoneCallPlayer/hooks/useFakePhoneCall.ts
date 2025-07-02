// app/services/useFakePhoneCall.ts
import { useState, useRef } from 'react';
import { Audio } from 'expo-av';

export function useFakePhoneCall() {
  const [incoming, setIncoming] = useState(false);
  const [paused, setPaused] = useState(false);
  const ringtone = useRef<Audio.Sound | null>(null);

  /** Trigger the “incoming call” */
  async function startFakeCall() {
    // Pause whatever you’re playing (video)
    setPaused(true);
    setIncoming(true);

    // Load & play ringtone on loop
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/ringtone.mp3'),
      { isLooping: true, volume: 0.7 }
    );
    ringtone.current = sound;
    await sound.playAsync();
  }

  /** User taps “Answer” */
  async function answerCall() {
    if (ringtone.current) {
      await ringtone.current.stopAsync();
      await ringtone.current.unloadAsync();
      ringtone.current = null;
    }
    setIncoming(false);
    // Resume video if you like
    setPaused(false);
  }

  /** User taps “Decline” */
  async function declineCall() {
    if (ringtone.current) {
      await ringtone.current.stopAsync();
      await ringtone.current.unloadAsync();
      ringtone.current = null;
    }
    setIncoming(false);
    // Decide: leave video paused or resume
    setPaused(false);
  }

  return {
    incoming,        // boolean: whether the overlay is shown
    paused,          // boolean: whether the video should be paused
    startFakeCall,
    answerCall,
    declineCall,
  };
}