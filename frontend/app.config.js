// frontend/app.config.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");

module.exports = {
  expo: {
    name: "Safii",
    slug: "Safii",
    version: "2.1.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "safii",
    userInterfaceStyle: "automatic",
    runtimeVersion: "1.0.0",

    // --- iOS 設定 ---
    ios: {
      bundleIdentifier: "com.nightbase.firebase",
      buildNumber: "8",
      supportsTablet: false,
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        usesNonExemptEncryption: false
      },
      googleServicesFile: "./GoogleService-Info.plist",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // 👇 從 app.json 搬過來的關鍵權限描述 (沒這幾行會崩潰)
        UIBackgroundModes: ["location", "fetch"],
        NSLocationWhenInUseUsageDescription: "Safii uses your location to keep your emergency contacts informed during active safety check-in sessions. For example, when you start a tracking session before walking home alone, your contacts can see your real-time location on a map, and if you miss a check-in, your last known location is automatically sent to them.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Safii needs background location access to continue updating your real-time position to emergency contacts when the app is not actively open. For example, if your phone is in your pocket while walking home, Safii keeps your contacts informed of your location in the background, and if you fail to check in on time, your last known position is automatically shared with them.",
        NSLocationAlwaysUsageDescription: "Safii needs background location access to continue updating your real-time position to emergency contacts when the app is not actively open. For example, if your phone is in your pocket while walking home, Safii keeps your contacts informed of your location in the background, and if you fail to check in on time, your last known position is automatically shared with them.",
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false
        }
      }
    },

    // --- Android 設定 ---
    android: {
      package: "com.nightbase.firebase",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      },
      googleServicesFile: "./google-services.json",
      // 👇 從 app.json 搬過來的權限
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION"
      ]
    },

    // --- Web 設定 ---
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },

    // --- 前端變數 ---
    extra: {
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      router: {
        origin: false
      },
      eas: {
        projectId: "e7d435f3-55a6-4e7d-88e3-bf34383bc8be"
      }
    },

    updates: {
      url: "https://u.expo.dev/e7d435f3-55a6-4e7d-88e3-bf34383bc8be"
    },

    // --- Plugins (合併了兩個檔案的內容) ---
    plugins: [
      "expo-router", // 👈 補上
      "expo-font",   // 👈 補上
      "expo-sqlite",
      "expo-web-browser",
      "expo-dev-client",
      "expo-secure-store",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#ffffff",
          sounds: ["./assets/notifications/safii_alert.wav"],
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Safii uses your background location to monitor your safety during active check-in sessions. For example, if you're walking home alone and miss a check-in, Safii checks whether you've arrived at your destination before notifying your emergency contacts.",
          locationAlwaysPermission: "Safii uses your background location to monitor your safety during active check-in sessions. For example, if you're walking home alone and miss a check-in, Safii checks whether you've arrived at your destination before notifying your emergency contacts.",
          locationWhenInUsePermission: "Safii uses your location to show nearby safe places such as hospitals and police stations. For example, when you tap 'Find Safe Spot', the app displays the three closest facilities within 1 km of your current position.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true
        }
      ],
      [
        "expo-image-picker",
        {
          cameraPermission: "Safii uses your camera to capture a profile photo. For example, when you tap 'Take Photo' on your profile page, the camera opens so you can take and upload a new profile picture.",
          photosPermission: "Safii accesses your photo library to let you choose a profile photo. For example, when you tap 'Choose from Library' on your profile page, you can select an existing photo to use as your profile picture."
        }
      ],


      "./app.plugin.js",
      [
        "expo-build-properties",
        {
          ios: {

            newArchEnabled: false,
            flipper: false,
            useFrameworks: "static",
            modularHeaders: true,
            fabricEnabled: false

          },
          android: {
            newArchEnabled: false
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    }
  },
};