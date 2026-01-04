// frontend/app.config.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");

module.exports = {
  expo: {
    name: "Safii",
    slug: "Safii",
    version: "1.2.1",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",

    // ❌ 絕對不要在這裡寫 newArchEnabled: true

    runtimeVersion: "1.0.0",

    // --- iOS 設定 ---
    ios: {
      bundleIdentifier: "com.nightbase.firebase",
      buildNumber: "1", 
      supportsTablet: true,
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        usesNonExemptEncryption: false
      },
      googleServicesFile: "./GoogleService-Info.plist",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // 👇 從 app.json 搬過來的關鍵權限描述 (沒這幾行會崩潰)
        UIBackgroundModes: ["location", "fetch"],
        NSLocationWhenInUseUsageDescription: "Safii 需要您的位置來顯示周邊安全設施與緊急追蹤。",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Safii 需要在背景存取您的位置以進行緊急狀況追蹤。",
        NSLocationAlwaysUsageDescription: "Safii 需要在背景存取您的位置以進行緊急狀況追蹤。",
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
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
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.RECORD_AUDIO"
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
          locationAlwaysAndWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location for emergency tracking.",
          locationAlwaysPermission: "Allow $(PRODUCT_NAME) to use your location in the background for emergency tracking.",
          locationWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you share them with your friends."
        }
      ],


      "./app.plugin.js",
      [
        "expo-build-properties",
        {
          ios: {

            newArchEnabled: true,
            flipper: false,
            useFrameworks: "static",
            modularHeaders: true,    
            fabricEnabled: true      

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