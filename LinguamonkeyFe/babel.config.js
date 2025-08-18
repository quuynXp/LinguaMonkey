module.exports = function (api) {
  api.cache(true);
  return {
    // Với project Expo: dùng babel-preset-expo để giữ mọi thứ mặc định của Expo
    presets: [
      "babel-preset-expo",
      "@babel/preset-typescript"
    ],
    plugins: [
      // tất cả phải cùng loose: true để không bị conflict
      ["@babel/plugin-proposal-class-properties", { loose: true }],
      ["@babel/plugin-proposal-private-methods", { loose: true }],
      ["@babel/plugin-transform-private-property-in-object", { loose: true }],

      // dotenv (nếu bạn dùng)
      ["module:react-native-dotenv", { moduleName: "@env", path: ".env", allowUndefined: true }],

      // luôn để reanimated plugin cuối cùng
      "react-native-reanimated/plugin"
    ]
  };
};
