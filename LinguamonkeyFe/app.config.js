export default () => ({
  name: "MonkeyLingua",
  assets: ["./assets/fonts/"],
  slug: "MonkeyLingua",
  jsEngine: "jsc",
  platforms: ["ios", "android", "web"],
  version: "1.0.0",
  orientation: "portrait",
  icon: "./src/assets/images/icon.png",
  scheme: "monkeylingua",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  sdkVersion: "54.0.0",
  androidStatusBar: {
    backgroundColor: "#ffffff",
  },

  android: {
    package: "com.monkeylingua.linguamonkey",
  },

  web: {
    build: {
      babel: true,
      jsEngine: "jsc",
      newArchEnabled: false,
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
  },
});
