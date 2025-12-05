const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  // --- Cấu hình SVG Transformer ---
  // 1. Dùng react-native-svg-transformer để xử lý file .svg
  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
  };

  // 2. Loại bỏ 'svg' khỏi danh sách asset (để không bị copy nguyên file)
  //    và thêm vào sourceExts (để được compile như code React)
  config.resolver.assetExts = resolver.assetExts.filter((ext) => ext !== "svg");
  config.resolver.sourceExts = [...resolver.sourceExts, "svg"];

  // --- Cấu hình Extension khác (nếu cần) ---
  // Thêm .cjs, .mjs nếu chưa có (mặc định Expo SDK mới đã có, nhưng thêm cho chắc)
  config.resolver.sourceExts = [
    ...new Set([...config.resolver.sourceExts, "cjs", "mjs"]),
  ];

  // ❌ QUAN TRỌNG: Đã XÓA dòng config.watchFolders gây lỗi
  // ❌ QUAN TRỌNG: Không push 'env' vào assetExts/sourceExts trừ khi bạn import file .env trực tiếp

  return config;
})();
