// frontend/app.config.js
module.exports = {
  expo: {
    name: "Safii",
    slug: "Safii",
    ios: {
      bundleIdentifier: "com.nightbase.firebase",
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.nightbase.firebase"
    },
    extra: {
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
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
      "./PodPatch.ts",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "dynamic"
          }
        }
      ]
    ],
  },
};
