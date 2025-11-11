// frontend/PodPatch.ts
const { withPodfile } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

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

function withPodfilePatch(config) {
  return withPodfile(config, (podfileConfig) => {
    const podfilePath = path.join(podfileConfig.modRequest.platformProjectRoot, "Podfile");

    // ✅ 1. 檢查 Podfile 是否存在（避免 prebuild 階段報錯）
    if (!fs.existsSync(podfilePath)) {
      console.log("⚠️  Skipping PodPatch: No Podfile found yet (prebuild not completed).");
      return podfileConfig;
    }

    let contents = fs.readFileSync(podfilePath, "utf8");
    const postInstallHook = "post_install do |installer|";

    // ✅ 2. 若沒有 post_install，建立一個空的
    if (!contents.includes(postInstallHook)) {
      contents += `\n${postInstallHook}\nend\n`;
    }

    // ✅ 3. 避免重複插入相同 patch
    if (!contents.includes("RNFBApp") && !contents.includes("react-native-maps")) {
      contents = contents.replace(postInstallHook, `${postInstallHook}\n${patchCode}`);
      fs.writeFileSync(podfilePath, contents, "utf8");
      console.log("✅ PodPatch successfully applied to Podfile.");
    } else {
      console.log("ℹ️  PodPatch already applied, skipping duplicate.");
    }

    podfileConfig.modResults.contents = contents;
    return podfileConfig;
  });
}

module.exports = withPodfilePatch;