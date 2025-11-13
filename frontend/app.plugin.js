const { withPodfile } = require("@expo/config-plugins");

module.exports = function withSafiiPodPatch(config) {
  return withPodfile(config, (config) => {
    let podfile = config.modResults.contents;

    const patch = `
    # --- SAFII Firebase + Reachability Patch ---
    installer.pods_project.targets.each do |target|

      # Firebase 非模組 header 修正
      if ['RNFBApp', 'RNFBAnalytics', 'RNFBCrashlytics', 'RNFBRemoteConfig', 'RNFBAppCheck'].include?(target.name)
        target.build_configurations.each do |cfg|
          cfg.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          cfg.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end

      # ReachabilitySwift：排除 arm64 (模擬器)
      if target.name == 'ReachabilitySwift'
        target.build_configurations.each do |cfg|
          cfg.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
        end
      end
    end
    # --- END SAFII Patch ---
`;

    // 防止重複加入
    if (!podfile.includes("SAFII Firebase + Reachability Patch")) {
      podfile = podfile.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|\n${patch}`
      );
    }

    config.modResults.contents = podfile;
    return config;
  });
};