<<<<<<< HEAD

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

// module.exports = function (api) {
//   api.cache(true);
//   return {
//     presets: ['babel-preset-expo'],
//     plugins: [
//       // 'expo-router/babel',
//       require.resolve('expo-router/babel'),

//       // [require.resolve('babel-plugin-module-resolver'), {
//       //   root: ['./'],
//       //   alias: { '@': './' },
//       //   extensions: ['.ios.ts', '.android.ts', '.ts', '.tsx', '.js', '.jsx', '.json'],
//       // }],

//       // [require.resolve('module:react-native-dotenv'), {
//       //   moduleName: '@env',
//       //   path: '.env',
//       // }],
//       [
//         'module:react-native-dotenv',
//         {
//           moduleName: '@env',
//           path: '.env',
//         },
//       ],
//       [
//         'module-resolver',
//         {
//           root: ['./'],
//           alias: { '@': './' },
//         },
//       ],
//       'react-native-reanimated/plugin',
//     ],
//   };
// };

// module.exports = function (api) {
//   api.cache(true);
//   return {
//     presets: ['babel-preset-expo'],
//     plugins: [
//       // Keep expo-router first
//       require.resolve('expo-router/babel'),
//       [
//         'module-resolver',
//         {
//           root: ['./'],
//           alias: { '@': './' },
//           extensions: ['.ios.ts', '.android.ts', '.ts', '.tsx', '.js', '.jsx', '.json'],
//         },
//         'nativewind/babel',
        
//       ],
//     ],
//   };
// };
=======
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
