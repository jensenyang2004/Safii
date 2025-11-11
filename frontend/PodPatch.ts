// frontend/PodPatch.ts
const { withPodfile } = require('@expo/config-plugins');

const patchCode = `
  installer.pods_project.targets.each do |target|
    # ✅ 修補 Firebase 相關 targets（非模組化引用）
    if ['RNFBApp', 'RNFBAnalytics', 'RNFBCrashlytics', 'RNFBRemoteConfig', 'RNFBAppCheck'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['DEFINES_MODULE'] = 'NO'
      end
    end

    # ✅ 修補 react-native-maps 缺少 React 框架的問題
    if target.name == 'react-native-maps'
      target.build_configurations.each do |config|
        # Framework 搜尋路徑
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= '$(inherited)'
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/React/CoreModules"'
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/ReactCommon/UIUtilities"'

        # Header 搜尋路徑
        config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited)'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/ReactCommon"'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/../../node_modules/react-native/React/CoreModules"'

        # ObjC 類別載入
        config.build_settings['OTHER_LDFLAGS'] = '$(inherited) -ObjC'
      end
    end
  end
`;

function withFinalPodfilePatch(config) {
  return withPodfile(config, (podfileConfig) => {
    let contents = podfileConfig.modResults.contents;
    const postInstallHook = 'post_install do |installer|';

    // 避免重複 patch
    if (contents.includes('ReactCommon/UIUtilities')) {
      console.log('ℹ️ Podfile patch already applied, skipping.');
      return podfileConfig;
    }

    // 確保存在 post_install hook
    if (!contents.includes(postInstallHook)) {
      contents += `

${postInstallHook}
end
`;
    }

    // 插入 patch
    contents = contents.replace(postInstallHook, `${postInstallHook}\n${patchCode}`);
    podfileConfig.modResults.contents = contents;
    return podfileConfig;
  });
}

module.exports = withFinalPodfilePatch;