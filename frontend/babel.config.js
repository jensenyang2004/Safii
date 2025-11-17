// frontend/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      "expo-router/babel",
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
          },
          extensions: [
            ".ios.ts",
            ".android.ts",
            ".ts",
            ".tsx",
            ".json",
            ".js",
            ".jsx",
          ],
        },
      ],
      // (other plugins like module-resolver, nativewind, dotenv, etc.)
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
