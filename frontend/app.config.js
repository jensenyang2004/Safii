module.exports = {
  expo: {
    name: "Safii",
    slug: "Safii",
    // ... other existing expo config
    extra: {
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
};