import "./src/utils/AppConfig";
import { registerRootComponent } from "expo";
import App from "./App";
import { AppRegistry } from "react-native";
import { name as appName } from "./app.config";

AppRegistry.registerComponent(appName, () => App);
registerRootComponent(App);
