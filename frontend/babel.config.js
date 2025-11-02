module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // (other plugins like module-resolver, nativewind, dotenv, etc.)
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
