module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // presets: ['babel-preset-expo'],
    // presets: [
    //   ['babel-preset-expo', { jsxImportSource: "nativewind"}],
    //   "nativewind/bable",
    // ],
    // plugins: ["nativewind/babel"],
  };
}