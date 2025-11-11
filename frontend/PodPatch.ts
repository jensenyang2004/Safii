const { withPodfile } = require('@expo/config-plugins');

const patchCode = `
  installer.pods_project.targets.each do |target|
    if target.name == 'react-native-maps'
      target.build_configurations.each do |config|
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= '$(inherited)'
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'
        config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited)'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'
        config.build_settings['OTHER_LDFLAGS'] ||= '$(inherited)'
        config.build_settings['OTHER_LDFLAGS'] << ' -ObjC'
      end
    end
  end
`;

function withMinimalPodPatch(config) {
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

module.exports = withMinimalPodPatch;
