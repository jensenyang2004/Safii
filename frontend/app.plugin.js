// app.plugin.js
const { withPodfile } = require("@expo/config-plugins");

module.exports = function withSafiiNativeTweaks(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;

    // Fabric is now enabled for Reanimated, so the explicit disable has been removed.

    // 2️⃣（如果你還想保留原本的 SAFII Patch for use_frameworks，可以在這裡接著塞）
    // 例如：
    if (!contents.includes("SAFII Patch: Fix use_frameworks issues")) {
      contents = contents.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|
    # --- SAFII Patch: Fix use_frameworks issues ---
    installer.pods_project.targets.each do |target|
      targets_to_fix = [
        'RNFBApp',
        'RNFBAnalytics',
        'RNFBCrashlytics',
        'RNFBRemoteConfig',
        'RNFBAppCheck',
        'react-native-maps'
      ]
      if targets_to_fix.include?(target.name) || target.name.include?('react-native-maps') || target.name == 'GoogleMaps'
        target.build_configurations.each do |cfg|
          cfg.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          cfg.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end
    end
    # --- END SAFII Patch ---

`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};