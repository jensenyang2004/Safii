const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

<<<<<<< HEAD
// 修改默认配置
const { transformer, resolver } = config;

// 将 svg 从 assetExts 移到 sourceExts
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer")
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"]
};

=======
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
config.resolver.assetExts = [
  // keep everything Metro was already bundling…
  ...config.resolver.assetExts,
  // …then add your subtitle (and transcript) extensions:
  "srt",
  "txt",
  'mp4',
  'mov',
  'm4v'
];


module.exports = withNativeWind(config, { input: "./global.css" });