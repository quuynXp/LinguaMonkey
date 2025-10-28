export default {
  expo: {
    name: "MonkeyLingua",
    slug: "MonkeyLingua",
    jsEngine: "jsc",
    platforms: [
      "ios",
      "android",
      "web"
    ],
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/images/icon.png",
    scheme: "monkeylingua",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.quyen10924.MonkeyLingua",
      infoPlist: {
        UIBackgroundModes: [
          "remote-notification"
        ]
      }
    },
    android: {
      icon: "./src/assets/images/icon.png",
      adaptiveIcon: {
        foregroundImage: "./src/assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ],
      package: "com.quyen10924.MonkeyLingua"
    },
    web: {
      build: {
        babel: true,
        jsEngine: "jsc",
        newArchEnabled: false
      },
      bundler: "metro",
      favicon: "./src/assets/images/icon.png"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./src/assets/images/icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      "expo-localization",
      "expo-font",
      "expo-web-browser",
      "expo-audio",
      "expo-video"
    ],
    experiments: {
      typedRoutes: true
    },
    
    extra: {
      eas: {
        projectId: "ed8fe959-8841-4ea7-a53e-62273a0f3b13"
      },
      apiUrl: process.env.API_URL 
    }
  }
};