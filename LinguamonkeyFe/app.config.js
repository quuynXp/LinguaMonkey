import "dotenv/config";

// Tự động lấy tất cả biến EXPO_PUBLIC_* từ .env
const EXPO_ENV_VARS = Object.keys(process.env)
  .filter((key) => key.startsWith("EXPO_PUBLIC_"))
  .reduce((acc, key) => {
    acc[key] = process.env[key];
    return acc;
  }, {});

export default ({ config }) => {
  return {
    ...config, // Merge với config cũ (nếu có trong app.json)
    // KHÔNG dùng key "expo" ở đây, viết trực tiếp thuộc tính ra root
    name: "MonkeyLingua",
    slug: "MonkeyLingua",
    assets: ["./assets/fonts/"], // Đã sửa đường dẫn (lưu ý check lại folder assets có tồn tại ở root không)
    jsEngine: "jsc",
    platforms: ["ios", "android", "web"],
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/images/icon.png",
    scheme: "monkeylingua", // scheme nên là string, không phải array (trừ khi cấu hình deep link đặc biệt, nhưng standard là string)
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.quyen10924.MonkeyLingua",
      associatedDomains: ["applinks:monkeylingua.com"],
      infoPlist: {
        UIBackgroundModes: ["remote-notification"],
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["fb1230650165201263", "monkeylingua"],
          },
        ],
      },
    },

    android: {
      usesCleartextTraffic: true,
      config: {
        facebook: {
          appId: "1230650165201263",
          displayName: "LinguaMonkey",
          autoLogAppEventsEnabled: true,
          advertiserIDCollectionEnabled: true,
        },
      },
      icon: "./src/assets/images/icon.png",
      adaptiveIcon: {
        foregroundImage: "./src/assets/images/icon.png",
        backgroundColor: "#ffffff",
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "monkeylingua",
            },
            {
              scheme: "https",
              host: "monkeylingua.vercel.app",
              pathPrefix: "/",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      package: "com.lingua.monkey",
      // edgeToEdgeEnabled: true, // Cẩn thận với flag này nếu UI chưa handle safe area tốt
      permissions: [
        "android.permission.INTERNET",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
      ],
    },

    web: {
      build: {
        babel: true,
        jsEngine: "jsc",
      },
      bundler: "metro",
      favicon: "./src/assets/images/icon.png",
    },

    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./src/assets/images/icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            ndkVersion: "26.1.10909125",
            // Thêm đoạn này nếu gặp lỗi duplicate class hoặc memory
            kotlinVersion: "1.9.22",
          },
        },
      ],
      "expo-localization",
      "expo-font",
      "expo-web-browser",
      "expo-audio",
      "expo-video",
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      eas: {
        projectId: "ed8fe959-8841-4ea7-a53e-62273a0f3b13",
      },
      ...EXPO_ENV_VARS,
    },
  };
};
