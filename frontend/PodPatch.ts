const { withPodfile } = require('@expo/config-plugins');

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
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] = '$(inherited) "\${PODS_ROOT}/../react-native/ReactCommon"'
      end
    end
  end
`;

function withFinalPodfilePatch(config) {
  return withPodfile(config, (podfileConfig) => {
    let podfileContents = podfileConfig.modResults.contents;
    const postInstallHook = 'post_install do |installer|';

    if (podfileContents.includes("RNFBApp") || podfileContents.includes("react-native-maps")) {
      console.log("ℹ️  Podfile patch already applied, skipping.");
      return podfileConfig;
    }

    if (!podfileContents.includes(postInstallHook)) {
      podfileContents += `

${postInstallHook}
end
`;
    }

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