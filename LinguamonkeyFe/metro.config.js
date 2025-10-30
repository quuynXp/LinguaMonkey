const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // Thêm các extensions cần thiết
  config.resolver.sourceExts = [
    ...new Set([
      ...config.resolver.sourceExts,
      "ts",
      "tsx",
      "mjs",
      "cjs",
      "jsx",
      "svg",
    ]),
  ];

  // Nếu bạn dùng SVG, sử dụng transformer riêng cho SVG (không ghi đè toàn bộ transformer mặc định)
  const svgTransformer = require.resolve("react-native-svg-transformer");
  config.transformer.babelTransformerPath = svgTransformer;

  config.resolver.assetExts.push("env");
  config.resolver.sourceExts.push("env");

  config.watchFolders = [path.resolve(__dirname, "node_modules/react-native")];
  config.resolver.unstable_enablePackageExports = false;
  // Không override nodeModulesPaths / extraNodeModules / blockList trừ khi hiểu rõ
  // Nếu cần inspect/ép transpile một lib cụ thể, ta xử lý riêng (hướng dẫn phía dưới)

  return config;
})();
