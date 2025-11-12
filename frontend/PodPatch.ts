

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

      const patchCode = `
    installer.pods_project.targets.each do |target|
      # Allow non-modular includes for RNFirebase pods to fix
      # "include of non-modular header inside framework module" errors
      if ['RNFBApp', 'RNFBAnalytics', 'RNFBCrashlytics', 'RNFBRemoteConfig', 'RNFBAppCheck'].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          config.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end
    end
`;

      const newPodfileContent = podfileContent.replace(
        /(post_install do \|installer\|\s*)/,
        `$1${patchCode}`
      );

      if (podfileContent !== newPodfileContent) {
        fs.writeFileSync(podfilePath, newPodfileContent, 'utf8');
        console.log('✅ Successfully patched Podfile for RNFirebase non-modular includes.');
      } else {
        console.log('❌ Could not find the "post_install do |installer|" block to patch. Podfile was not modified.');
      }
      
      return config;
    },
  ]);
}

module.exports = withFirebasePodPatch;


// const { withPodfile } = require('@expo/config-plugins');

// const patchCode = `
//   installer.pods_project.targets.each do |target|
//     if target.name == 'react-native-maps'
//       target.build_configurations.each do |config|
//         config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= '$(inherited)'
//         config.build_settings['FRAMEWORK_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'
//         config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited)'
//         config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'
//         config.build_settings['OTHER_LDFLAGS'] ||= '$(inherited)'
//         config.build_settings['OTHER_LDFLAGS'] << ' -ObjC'
//       end
//     end
//   end
// `;

// function withMinimalPodPatch(config) {
//   return withPodfile(config, (podfileConfig) => {
//     let podfileContents = podfileConfig.modResults.contents;
//     const postInstallHook = 'post_install do |installer|';

//     // Idempotency check
//     if (podfileContents.includes("ReactCommon")) {
//       console.log("ℹ️  Podfile patch for react-native-maps already applied, skipping.");
//       return podfileConfig;
//     }

//     // Ensure hook exists
//     if (!podfileContents.includes(postInstallHook)) {
//       podfileContents += `

// ${postInstallHook}
// end
// `;
//     }

//     // Insert patch
//     podfileContents = podfileContents.replace(
//       postInstallHook,
//       `${postInstallHook}
// ${patchCode}`
//     );

//     podfileConfig.modResults.contents = podfileContents;
//     return podfileConfig;
//   });
// }

// module.exports = withMinimalPodPatch;
