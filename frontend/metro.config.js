const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const resolveFrom = require('resolve-from');

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

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('event-target-shim') &&
    context.originModulePath.includes('@videosdk.live/react-native-webrtc')
  ) {
    const updated = moduleName.replace(/\/index$/, '');
    const filePath = resolveFrom(context.originModulePath, updated);
    return { filePath, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};


module.exports = withNativeWind(config, { input: "./global.css" });