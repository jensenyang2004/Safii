module.exports = {
  expo: {
    name: "Safii",
    slug: "Safii",
    ios: {
      bundleIdentifier: "com.nightbase.firebase",
      supportsTablet: true,
    },
    // ... other existing expo config
    extra: {
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
};