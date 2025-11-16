// frontend/app.config.js

const fs = require("fs");  
const path = require("path"); 

module.exports = {
  expo: {
    name: "Safii",
    slug: "Safii",
    version: "1.0.0",
    runtimeVersion: {
      "policy": "appVersion"
    },
    ios: {
      bundleIdentifier: "com.nightbase.firebase",
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      },
      
      config: {
        googleMapsApiKey: "AIzaSyDeiltvsroXFIU0YWpNVnphyxv0V60_wTM" 
      }
    },
    android: {
      package: "com.nightbase.firebase",
      config: {
        googleMaps: {
          apiKey: "AIzaSyDeiltvsroXFIU0YWpNVnphyxv0V60_wTM" 
        }
      }
    },
    extra: {
      
      GOOGLE_MAPS_API_KEY: "AIzaSyDeiltvsroXFIU0YWpNVnphyxv0V60_wTM", 
      eas: {
        projectId: "e7d435f3-55a6-4e7d-88e3-bf34383bc8be"
      }
    },
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#ffffff",
          sounds: ["./assets/notifications/safii_alert.wav"],
        },
      ],
      "./app.plugin.js",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ],
  },
};