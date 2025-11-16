const { withPodfile } = require("@expo/config-plugins");

module.exports = function withSafiiPodPatch(config) {
  return withPodfile(config, (config) => {
    let podfile = config.modResults.contents;

    const patch = `
    # --- SAFII Patch: Fix use_frameworks issues ---
    installer.pods_project.targets.each do |target|
      
      # 定義需要修正 Header 權限的目標
      # 包含 Firebase 系列 以及 react-native-maps
      targets_to_fix = [
        'RNFBApp',
        'RNFBAnalytics',
        'RNFBCrashlytics',
        'RNFBRemoteConfig',
        'RNFBAppCheck',
        'react-native-maps' # 👈 關鍵新增：解決地圖報錯
      ]

      # 判斷邏輯：
      # 1. 在清單內的套件
      # 2. 或者名稱包含 'react-native-maps' 的套件 (更保險的寫法)
      # 3. 或是 GoogleMaps 核心
      if targets_to_fix.include?(target.name) || target.name.include?('react-native-maps') || target.name == 'GoogleMaps'
        target.build_configurations.each do |cfg|
          # 允許引用非模組化的 React Header
          cfg.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          # 關閉模組定義，避免與靜態庫衝突
          cfg.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end

    end
    # --- END SAFII Patch ---
`;

    // 防止重複加入
    if (!podfile.includes("SAFII Patch: Fix use_frameworks issues")) {
      podfile = podfile.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|\n${patch}`
      );
    }

    config.modResults.contents = podfile;
    return config;
  });
};