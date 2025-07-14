const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

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