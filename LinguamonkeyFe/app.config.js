import "dotenv/config";

const EXPO_ENV_VARS = Object.keys(process.env)
  .filter((key) => key.startsWith("EXPO_PUBLIC_"))
  .reduce((acc, key) => {
    acc[key] = process.env[key];
    return acc;
  }, {});

export default ({ config }) => {
  return {
    ...config,
    expo: {
      name: "MonkeyLingua",
      assets: ["./assets/fonts/"],
      slug: "MonkeyLingua",
      jsEngine: "jsc",
      platforms: ["ios", "android", "web"],
      version: "1.0.0",
      orientation: "portrait",
      icon: "./src/assets/images/icon.png",
      scheme: ["monkeylingua", "fb1230650165201263"],
      userInterfaceStyle: "automatic",
      newArchEnabled: true,
      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.quyen10924.MonkeyLingua",
        associatedDomains: ["applinks:monkeylingua.com"],
        infoPlist: {
          UIBackgroundModes: ["remote-notification"],
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
                host: "monkeylingua.vercle.app",
                pathPrefix: "/",
              },
            ],
            category: ["BROWSABLE", "DEFAULT"],
          },
        ],
        package: "com.lingua.monkey",
        edgeToEdgeEnabled: true,
        permissions: [
          "android.permission.INTERNET",
          "android.permission.RECORD_AUDIO",
          "android.permission.MODIFY_AUDIO_SETTINGS",
        ],
      },
      web: {
        build: {
          babel: true,
          jsEngine: "hermes",
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
              cmakeVersion: "3.22.1",
              gradleProperties: {
                "org.gradle.jvmargs": "-Xmx3072m -XX:MaxMetaspaceSize=512m",
              },
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
    },
  };
};
