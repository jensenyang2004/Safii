const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * A custom Expo Config Plugin to patch the Podfile.
 * It injects custom post_install blocks for RNFirebase and react-native-maps.
 */
function withSafiiPodPatches(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      const combinedPatchCode = `
    installer.pods_project.targets.each do |target|
      # Allow non-modular includes for RNFirebase pods to fix
      # "include of non-modular header inside framework module" errors
      if ['RNFBApp', 'RNFBAnalytics', 'RNFBCrashlytics', 'RNFBRemoteConfig', 'RNFBAppCheck'].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          config.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end

      # Patch for react-native-maps header search paths and linker flags
      if target.name == 'react-native-maps'
        target.build_configurations.each do |config|
          config.build_settings['FRAMEWORK_SEARCH_PATHS'] = ['$(inherited)', '"$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'].join(' ')
          config.build_settings['HEADER_SEARCH_PATHS']    = ['$(inherited)', '"$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'].join(' ')
          current_ldflags = config.build_settings['OTHER_LDFLAGS']
          if current_ldflags.nil?
            config.build_settings['OTHER_LDFLAGS'] = '$(inherited) -ObjC'
          elsif !current_ldflags.to_s.include?('-ObjC')
            config.build_settings['OTHER_LDFLAGS'] = [current_ldflags, '-ObjC'].join(' ')
          end
        end
      end
    end
`;

      // Check if the patch is already applied to prevent duplicate insertions
      if (podfileContent.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = 'YES'") && podfileContent.includes("target.name == 'react-native-maps'")) {
        console.log('ℹ️ Podfile already contains both RNFirebase and react-native-maps patches. Skipping modification.');
        return config;
      }

      const newPodfileContent = podfileContent.replace(
        /(post_install do \|installer\|)/,
        `$1${combinedPatchCode}`
      );

      if (podfileContent !== newPodfileContent) {
        fs.writeFileSync(podfilePath, newPodfileContent, 'utf8');
        console.log('✅ Successfully patched Podfile for RNFirebase and react-native-maps.');
      } else {
        console.log('❌ Could not find the "post_install do |installer|" block to patch. Podfile was not modified.');
      }
      
      return config;
    },
  ]);
}

module.exports = withSafiiPodPatches;