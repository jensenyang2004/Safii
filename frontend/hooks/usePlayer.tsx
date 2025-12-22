import { Player, Types } from "expo-audio-streaming";
import { useCallback } from "react";

export const usePlayer = () => {
  const play = useCallback(() => {
    Player.play();
  }, []);

  const pause = useCallback(() => {
    Player.pause();
  }, []);

  const addToBuffer = useCallback((base64: string) => {
    Player.addToQueue(base64);
  }, []);

  return {
    play,
    pause,
    addToBuffer,
    resetBuffer: Player.resetBuffer,
  };
};
