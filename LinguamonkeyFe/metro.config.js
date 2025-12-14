const { getDefaultConfig } = require("expo/metro-config");
const path = require("path"); // Cần import path

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

  // THÊM CẤU HÌNH QUAN TRỌNG NÀY ĐỂ GIẢI QUYẾT LỖI NOBLE CRYPTO
  // Điều này đảm bảo Metro biết cách tìm các subpath imports như '@noble/curves/p256'
  // mà không cần thêm .js hoặc các thủ thuật khác.
  config.resolver.nodeModulesPaths = [
    path.resolve(path.join(__dirname, "node_modules", "@noble", "curves")),
    path.resolve(path.join(__dirname, "node_modules", "@noble", "hashes")),
    path.resolve(__dirname, "node_modules"),
  ];

  return config;
})();
