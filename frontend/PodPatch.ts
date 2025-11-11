const { withPodfile } = require('@expo/config-plugins');

// Use single quotes to avoid template literal issues
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
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= '$(inherited)'
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'
        config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited)'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'
      end
    end
  end
`;

function withFinalPodfilePatch(config) {
  return withPodfile(config, (podfileConfig) => {
    let podfileContents = podfileConfig.modResults.contents;
    const postInstallHook = 'post_install do |installer|';

    // Idempotency check
    if (podfileContents.includes("ReactCommon")) {
      console.log("ℹ️  Podfile patch for react-native-maps already applied, skipping.");
      return podfileConfig;
    }

    // Ensure hook exists
    if (!podfileContents.includes(postInstallHook)) {
      podfileContents += `

${postInstallHook}
end
`;
    }

    // Insert patch
    podfileContents = podfileContents.replace(
      postInstallHook,
      `${postInstallHook}
${patchCode}`
    );

    podfileConfig.modResults.contents = podfileContents;
    return podfileConfig;
  });
}

module.exports = withFinalPodfilePatch;