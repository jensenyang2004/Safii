const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * A custom Expo Config Plugin to patch the Podfile.
 * It injects the custom post_install block for RNFirebase.
 */
function withFirebasePodPatch(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Add post_install block for RNFirebase
      const patchCode = `
  installer.pods_project.targets.each do |target|
    if ['RNFBApp', 'RNFBAnalytics', 'RNFBCrashlytics', 'RNFBRemoteConfig', 'RNFBAppCheck'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['DEFINES_MODULE'] = 'NO'
      end
    end

    if target.name == 'react-native-maps'
      target.build_configurations.each do |config|
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] = '$(inherited) "${PODS_ROOT}/../react-native/ReactCommon"'
      end
    end
  end
`;
      const postInstallHook = 'post_install do |installer|';
      if (podfileContent.includes(postInstallHook) && !podfileContent.includes('RNFBApp')) {
        const lines = podfileContent.split('\n');
        const postInstallIndex = lines.findIndex(line => line.includes(postInstallHook));
        lines.splice(postInstallIndex + 1, 0, patchCode);
        podfileContent = lines.join('\n');
      }

      fs.writeFileSync(podfilePath, podfileContent, 'utf8');
      
      return config;
    },
  ]);
}

module.exports = withFirebasePodPatch;
