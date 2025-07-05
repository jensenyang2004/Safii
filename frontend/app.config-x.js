// app.config.js
// Pure CommonJS—no TS annotations, no ESM imports

const videoSdkPlugin    = require('@videosdk.live/expo-config-plugin');
const webRtcPlugin      = require('@config-plugins/react-native-webrtc');

module.exports = ({ config }) => {
  return {
    ...config,
    expo: {
      ...config.expo,

      name:                 'Safii',
      slug:                 'Safii',
      version:              '1.0.0',
      orientation:          'portrait',
      icon:                 './assets/images/icon.png',
      scheme:               'myapp',
      userInterfaceStyle:   'automatic',
      // --- iOS specific ---
      ios: {
        ...config.expo.ios,
        supportsTablet: true,
        bundleIdentifier: 'com.nightbase.firebase',
        googleServicesFile: './GoogleService-Info.plist',
        infoPlist: {
          ITSAppUsesNonExemptEncryption: false,
          UIBackgroundModes: [
            'location',
            'fetch',
          ],
          NSLocationWhenInUseUsageDescription:
            'This app needs access to location when open to track your location in emergencies.',
          NSLocationAlwaysAndWhenInUseUsageDescription:
            'This app needs access to location when in background for emergency tracking.',
          NSLocationAlwaysUsageDescription:
            'This app needs access to location when in background for emergency tracking.',
        },
      },

      // --- Android specific ---
      android: {
        ...config.expo.android,
        adaptiveIcon: {
          foregroundImage: './assets/images/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
        package: 'com.nightbasemorning.firebase',
        googleServicesFile: './google-services.json',
        permissions: [
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_COARSE_LOCATION',
        ],
      },

      // --- Web config ---
      web: {
        ...config.expo.web,
        bundler: 'metro',
        output: 'static',
        favicon: './assets/images/favicon.png',
      },

      // --- Plugins ---
      plugins: [
        // 1) VideoSDK native setup
        videoSdkPlugin,

        // 2) iOS WebRTC permissions
        [
          webRtcPlugin,
          {
            cameraPermission:
              'Allow $(PRODUCT_NAME) to access your camera',
            microphonePermission:
              'Allow $(PRODUCT_NAME) to access your microphone',
          },
        ],

        // 3) Your other plugins
        'expo-router',
        [
          'expo-location',
          {
            locationAlwaysAndWhenInUsePermission:
              'Allow $(PRODUCT_NAME) to use your location for emergency tracking.',
            locationAlwaysPermission:
              'Allow $(PRODUCT_NAME) to use your location in the background for emergency tracking.',
            locationWhenInUsePermission:
              'Allow $(PRODUCT_NAME) to use your location.',
            isIosBackgroundLocationEnabled: true,
            isAndroidBackgroundLocationEnabled: true,
          },
        ],
        [
          'expo-splash-screen',
          {
            image: './assets/images/splash-icon.png',
            imageWidth: 200,
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
          },
        ],
        [
          'expo-build-properties',
          {
            ios: { useFrameworks: 'static' },
          },
        ],
        '@react-native-firebase/app',
        '@react-native-firebase/auth',
        'expo-secure-store',
      ],

      experiments: {
        typedRoutes: true,
      },

      extra: {
        router: { origin: false },
        eas:    { projectId: '29161d9f-2ce5-4549-8e0c-585579fdaa80' },
      },
    },
  };
};