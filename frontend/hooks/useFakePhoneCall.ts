// app/features/fakePhoneCallPlayer/hooks/useFakePhoneCall.ts

import { useState } from 'react';

export function useFakePhoneCall() {
  const [incoming, setIncoming] = useState(false);
  const [paused,   setPaused]   = useState(false);

  function startFakeCall() {
    // setPaused(true);
    setIncoming(true);
  }

  function answerCall() {
    setIncoming(false);
    setPaused(false);
  }

  function declineCall() {
    setIncoming(false);
    setPaused(false);
  }

  return {
    incoming,
    paused,
    startFakeCall,
    answerCall,
    declineCall,
  };
}