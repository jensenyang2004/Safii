const fs = require("fs");
const path = require("path");

module.exports = {
  expo: {
    name: "Safii",
    slug: "Safii",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    
    // ❌ 絕對不要在這裡寫 newArchEnabled: true
    
    runtimeVersion: {
      policy: "appVersion"
    },

    // --- iOS 設定 ---
    ios: {
      bundleIdentifier: "com.nightbase.firebase",
      supportsTablet: true,
      config: {
        googleMapsApiKey: "AIzaSyDeiltvsroXFIU0YWpNVnphyxv0V60_wTM" // Hardcoded for safety as per your request
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
          apiKey: "AIzaSyDeiltvsroXFIU0YWpNVnphyxv0V60_wTM"
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
      GOOGLE_MAPS_API_KEY: "AIzaSyDeiltvsroXFIU0YWpNVnphyxv0V60_wTM",
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
      
      // 👇 你的自定義 Plugin
      "./app.plugin.js", 
      
      // 👇 解決 Reanimated 崩潰
      "react-native-reanimated/plugin", 

      // 👇 解決地圖閃退的關鍵設定 (放在最後面比較保險)
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            newArchEnabled: false // ✅ 強制關閉新架構
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