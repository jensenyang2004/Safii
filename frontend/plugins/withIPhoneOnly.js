const { withXcodeProject } = require('@expo/config-plugins');

const withIPhoneOnly = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();

    for (const key in configurations) {
      const buildSettings = configurations[key].buildSettings;
      if (buildSettings && buildSettings.PRODUCT_NAME !== undefined) {
        // "1" = iPhone only, "1,2" = Universal (iPhone + iPad)
        buildSettings.TARGETED_DEVICE_FAMILY = '"1"';
      }
    }

    return config;
  });
};

module.exports = withIPhoneOnly;