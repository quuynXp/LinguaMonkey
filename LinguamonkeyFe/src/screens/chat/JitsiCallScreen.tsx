// path: src/screens/JitsiCallScreen.js
import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

const JitsiCallScreen = ({ route }) => {
  const { roomId = "language-learning-test-room" } = route.params || {};
  const jitsiUrl = `https://meet.jit.si/${roomId}`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: jitsiUrl }}
        style={styles.webview}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
      />
    </View>
  );
};

export default JitsiCallScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
