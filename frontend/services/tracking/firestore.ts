import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  Timestamp, 
  serverTimestamp, 
  deleteDoc 
} from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from '@/libs/firebase';
import { TrackingMode } from '@/types/tracking';

/**
 * Updates the user's location in Firestore (both real-time and history).
 */
export const updateLocationInFirestore = async (location: Location.LocationObject, userId: string) => {
  if (!userId) {
    console.error("❌ updateLocationInFirestore: could not find user ID.");
    return;
  }
  try {
    const { latitude, longitude } = location.coords;
    const updateTime = new Date(location.timestamp);

    // console.log('📍 Location Update:', { latitude, longitude, timestamp: updateTime.toISOString() });

    // Update user doc timestamp (optional, but good for "last seen")
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {}, { merge: true });

    const locationData = {
      lat: latitude,
      long: longitude,
      updateTime: Timestamp.fromDate(updateTime),
    };

    // Update current location
    const realTimeRef = doc(db, 'users', userId, 'real_time_location', 'current');
    await setDoc(realTimeRef, locationData, { merge: true });

    // Add to history
    const historyRef = collection(db, 'users', userId, 'location_history');
    await addDoc(historyRef, locationData);

    // console.log(`✅ Successfully updated location for user ${userId}`);

  } catch (dbError) {
    console.error("❌ Failed to write location to Firebase:", dbError);
    // Depending on requirements, we might want to throw this or just log it.
    // For background tasks, logging is usually safer to prevent crash loops.
  }
};

/**
 * Creates the "Dead Man's Switch" document in Firestore.
 * This document is watched by Cloud Functions to trigger alerts if not updated.
 */
export const startDeadManSwitch = async (
  userId: string, 
  emergencyActivationTimeMs: number, 
  emergencyContactIds: string[],
  activeMode: Partial<TrackingMode>
): Promise<string> => {
  try {
    const trackingDocRef = doc(collection(db, 'active_tracking'));
    const emergencyActivationTime = Timestamp.fromMillis(emergencyActivationTimeMs);

    const contactStatusMap: Record<string, { status: 'active'; notificationCount: number }> = {};
    emergencyContactIds.forEach((id: string) => {
      contactStatusMap[id] = {
        status: 'active',
        notificationCount: 0
      };
    });

    await setDoc(trackingDocRef, {
      trackedUserId: userId,
      emergencyContactIds: emergencyContactIds,
      emergencyActivationTime: emergencyActivationTime,
      lastUpdateTime: serverTimestamp(),
      isActive: true,
      nextNotificationTime: emergencyActivationTime,
      overallStatus: 'notifying',
      contactStatus: contactStatusMap,
      activity: activeMode.activity || '',
      activityLocation: activeMode.activityLocation || '',
      notes: activeMode.notes || '',
    });

    console.log("✅ Dead man's switch set in Firestore.");
    return trackingDocRef.id;
  } catch (error) {
    console.error("❌ Failed to start Dead Man's Switch:", error);
    throw error;
  }
};

/**
 * Updates the activation time of the Dead Man's Switch (reporting safety).
 */
export const updateDeadManSwitch = async (trackingDocId: string, newActivationTimeMs: number) => {
  try {
    const trackingDocRef = doc(db, 'active_tracking', trackingDocId);
    const newEmergencyActivationTime = Timestamp.fromMillis(newActivationTimeMs);
    
    await updateDoc(trackingDocRef, {
      emergencyActivationTime: newEmergencyActivationTime,
      lastUpdateTime: serverTimestamp()
    });
    console.log("✅ Dead man's switch updated in Firestore.");
  } catch (error) {
    console.error("❌ Failed to update Dead Man's Switch:", error);
    throw error;
  }
};

/**
 * Deactivates the Dead Man's Switch.
 */
export const stopDeadManSwitch = async (trackingDocId: string, isEmergency: boolean, reason: 'user_stopped' | 'sign_out' = 'user_stopped') => {
  try {
    if (isEmergency) {
      console.log("Emergency stop: Leaving dead man's switch active in Firestore.");
      return;
    }

    const trackingDocRef = doc(db, 'active_tracking', trackingDocId);
    await updateDoc(trackingDocRef, {
      isActive: false,
      stoppedAt: serverTimestamp(),
      overallStatus: reason === 'sign_out' ? 'cancelled_by_sign_out' : 'stopped'
    });
    console.log("✅ Dead man's switch deactivated in Firestore.");
  } catch (error) {
    console.error("❌ Failed to stop Dead Man's Switch:", error);
    throw error; 
  }
};

/**
 * Toggles the 'On' status of a Tracking Mode definition.
 */
export const setTrackingModeActiveStatus = async (modeId: string, isOn: boolean) => {
  try {
    const modeRef = doc(db, 'TrackingMode', modeId);
    await updateDoc(modeRef, { On: isOn });
    console.log(`✅ Set TrackingMode ${modeId} On = ${isOn}`);
  } catch (e) {
    console.warn(`Could not update TrackingMode ${modeId} status:`, e);
  }
};

export const createTrackingModeDoc = async (userId: string, newMode: Omit<TrackingMode, 'id' | 'userId'>) => {
    const trackingModeCollection = collection(db, 'TrackingMode');
    const { On, ...rest } = newMode as any;
    return await addDoc(trackingModeCollection, {
      ...rest,
      On: On ?? false,
      userId: userId,
    });
}

export const updateTrackingModeDoc = async (modeId: string, updates: Partial<TrackingMode>) => {
    const modeRef = doc(db, 'TrackingMode', modeId);
    // Filter allowed fields logic could live here or in the caller. 
    // For now, assume caller passes valid updates or we pass as is.
    // Ideally, we validate.
    await updateDoc(modeRef, {
        ...updates,
        updatedAt: serverTimestamp(),
    });
}

export const deleteTrackingModeDoc = async (modeId: string) => {
    const modeRef = doc(db, 'TrackingMode', modeId);
    await deleteDoc(modeRef);
}
