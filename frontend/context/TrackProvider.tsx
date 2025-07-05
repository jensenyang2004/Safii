// TrackingContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';


const TrackingContext = createContext(null);

export const TrackingProvider = ({ children }) => {
  const [trackingModes, setTrackingModes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timers, setTimers] = useState({}); // optional: track multiple countdowns
  const fetchTrackingModesWithContacts = async () => {
    try {
      const colRef = collection(db, 'TrackingMode');
      const snapshot = await getDocs(colRef);

      const data = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const trackingData = docSnap.data();
          const contacts = await Promise.all(
            (trackingData.emergencyContactIds || []).map(async (id : string) => {
              const contactDoc = await getDoc(doc(db, 'users', id));
              return { id: contactDoc.id, ...contactDoc.data() };
            })
          );
          return {
            id: docSnap.id,
            ...trackingData,
            contacts
          };
        })
      );

      console.log("in the context!")

      console.log(data)
      console.log(data[0].contacts)
      setTrackingModes(data);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching tracking modes with contacts:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingModesWithContacts();
  }, []);



  return (
    <TrackingContext.Provider value={{ trackingModes, loading}}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => useContext(TrackingContext);