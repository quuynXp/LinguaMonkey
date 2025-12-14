const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
  };

  config.resolver.assetExts = resolver.assetExts.filter((ext) => ext !== "svg");
  config.resolver.sourceExts = [...resolver.sourceExts, "svg"];

  config.resolver.sourceExts = [
    ...new Set([...config.resolver.sourceExts, "cjs", "mjs"]),
  ];

  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
  };

  return config;
})();
