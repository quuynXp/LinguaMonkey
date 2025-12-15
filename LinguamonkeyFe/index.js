import "./src/utils/AppConfig";
import { registerRootComponent } from "expo";
import App from "./App";
import { AppRegistry } from "react-native";
import { name as appName } from "./app.config";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { decryptNotificationContent } from "./src/utils/notificationHelper";

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("⚡ Background Notification received:", remoteMessage.messageId);

  const { title, body, data } = await decryptNotificationContent(remoteMessage);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: data,
      sound: true,
      vibrate: [0, 250, 250, 250],
    },
    trigger: null,
  });
});

AppRegistry.registerComponent(appName, () => App);
registerRootComponent(App);
