import { registerRootComponent } from "expo";
import App from "./App";
import { AppRegistry, LogBox } from "react-native";
import { name as appName } from "./app.config";

LogBox.ignoreLogs([
  "new NativeEventEmitter",
  "This method is deprecated",
  "Non-serializable values were found",
]);

AppRegistry.registerComponent(appName, () => App);
registerRootComponent(App);
