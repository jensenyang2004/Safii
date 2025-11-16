import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { RouteInfo, Step } from '../types';
import { findNearestPointOnPolyline, getDistance } from '../utils/route';
// import { decodePolyline } from '../utils/polyline'; // No longer needed here

// Helper to strip HTML tags for speech
const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>?/gm, '');
};

export interface UseLiveNavigationProps {
  onReroute: (origin: Location.LocationObject) => void;
}

export const useLiveNavigation = ({ onReroute }: UseLiveNavigationProps) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteInfo | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [remainingDistance, setRemainingDistance] = useState(0);
  const [eta, setEta] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [traveledPath, setTraveledPath] = useState<any[]>([]);
  const [remainingPath, setRemainingPath] = useState<any[]>([]);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const testInterval = useRef<any>(null);
  const lastRerouteTime = useRef<number>(0);

  useEffect(() => {
    if (currentStep) {
      const instruction = stripHtml(currentStep.html_instructions);
      Speech.speak(instruction, { language: 'zh-TW' });
    }
  }, [currentStep]);

  // This effect runs whenever the user's location changes during navigation.
  // It contains all the core logic for rerouting, path tracking, and step-by-step instructions.
  useEffect(() => {
    if (!isNavigating || !userLocation || !activeRoute) {
      return;
    }

    // activeRoute.polyline is now expected to be an array of coordinates
    const polylineCoordinates = activeRoute.polyline;
    const nearestPoint = findNearestPointOnPolyline(userLocation.coords, polylineCoordinates);

    // --- Deviation Detection ---
    const DEVIATION_THRESHOLD = 40; // meters
    const REROUTE_COOLDOWN = 10000; // 10 seconds

    if (nearestPoint.distance && nearestPoint.distance > DEVIATION_THRESHOLD) {
      const now = Date.now();
      if (now - lastRerouteTime.current > REROUTE_COOLDOWN) {
        console.log('User has deviated. Rerouting...');
        Speech.speak('重新規劃路線...', { language: 'zh-TW' });
        lastRerouteTime.current = now;
        onReroute(userLocation);
      }
    }

    // --- Path and Progress Update ---
    const newTraveledPath = polylineCoordinates.slice(0, nearestPoint.index + 1);
    newTraveledPath.push({ latitude: nearestPoint.latitude, longitude: nearestPoint.longitude });
    setTraveledPath(newTraveledPath);

    const newRemainingPath = polylineCoordinates.slice(nearestPoint.index);
    newRemainingPath.unshift({ latitude: nearestPoint.latitude, longitude: nearestPoint.longitude });
    setRemainingPath(newRemainingPath);

    // --- Step-by-step Instruction Logic ---
    const steps = activeRoute.legs[0].steps;
    let upcomingStepIndex = currentStepIndex;

    if (upcomingStepIndex < steps.length) {
      const endOfCurrentStep = steps[upcomingStepIndex].end_location;
      const distanceToEnd = getDistance(userLocation.coords, { latitude: endOfCurrentStep.lat, longitude: endOfCurrentStep.lng });

      if (distanceToEnd < 25) { // 25 meters threshold to advance to next step
        upcomingStepIndex++;
        setCurrentStepIndex(prev => prev + 1);
      }
    }

    if (upcomingStepIndex < steps.length) {
      setCurrentStep(steps[upcomingStepIndex]);
      let dist = 0;
      let time = 0;
      for (let i = upcomingStepIndex; i < steps.length; i++) {
        dist += steps[i].distance.value;
        time += steps[i].duration.value;
      }
      setRemainingDistance(dist);
      setEta(time);
    } else {
      setCurrentStep(null);
      setRemainingDistance(0);
      setEta(0);
      if (isNavigating) {
        Speech.speak('您已抵達目的地。', { language: 'zh-TW' });
        stopNavigation();
      }
    }
  }, [userLocation, isNavigating, activeRoute]);


  const updateRoute = (newRoute: RouteInfo) => {
    setActiveRoute(newRoute);
    setCurrentStepIndex(0);
  };

  const startNavigation = async (route: RouteInfo) => {
    console.log('Starting real navigation...');
    setActiveRoute(route);
    setIsNavigating(true);
    setCurrentStepIndex(0);
    lastRerouteTime.current = 0;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Location permission not granted');
      setIsNavigating(false);
      return;
    }

    // Just set the user location, the useEffect will handle the rest
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 10,
      },
      setUserLocation
    );
  };

  const startTestNavigation = (route: RouteInfo, startLocation: any) => {
    console.log('Starting test navigation...');
    setActiveRoute(route);
    setIsNavigating(true);
    setCurrentStepIndex(0);
    setUserLocation({ coords: startLocation, timestamp: Date.now() });

    testInterval.current = setInterval(() => {
      // Just update the location, the useEffect will handle the rest
      setUserLocation(prevLocation => {
        if (!prevLocation) return null;
        const newCoords = {
          ...prevLocation.coords,
          latitude: prevLocation.coords.latitude + 0.0001,
          longitude: prevLocation.coords.longitude + 0.0001,
          heading: 45,
        };
        return { ...prevLocation, coords: newCoords, timestamp: Date.now() };
      });
    }, 2000);
  };

  const stopNavigation = () => {
    console.log('Stopping navigation...');
    Speech.stop();
    setIsNavigating(false);
    setActiveRoute(null);
    setTraveledPath([]);
    setRemainingPath([]);
    setCurrentStep(null);
    setCurrentStepIndex(0);
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    if (testInterval.current) {
      clearInterval(testInterval.current);
    }
  };
  
  useEffect(() => {
    if (isNavigating && activeRoute) {
        // activeRoute.polyline is already decoded
        setRemainingPath(activeRoute.polyline);
        setTraveledPath([]);
    }
  }, [activeRoute]);


  return {
    isNavigating,
    activeRoute,
    userLocation,
    traveledPath,
    remainingPath,
    startNavigation,
    startTestNavigation,
    stopNavigation,
    updateRoute,
    currentStep,
    remainingDistance,
    eta,
  };
};
