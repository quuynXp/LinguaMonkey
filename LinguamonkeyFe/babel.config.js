// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      "babel-preset-expo",
    ],
    plugins: [
      // Giữ lại plugin react-native-dotenv và reanimated vì chúng là custom
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env",
          safe: false,
          allowUndefined: true,
        },
      ],
      // Reanimated PHẢI LUÔN Ở CUỐI CÙNG
      "react-native-reanimated/plugin",
    ],
  };
};