import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

const JitsiWebView = ({ route }) => {
  const { roomId = "test-room" } = route.params || {};
  const jitsiURL = `https://meet.jit.si/${roomId}#userInfo.displayName="User Demo"`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: jitsiURL }}
        style={styles.webview}
        allowsFullscreenVideo
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
};

export default JitsiWebView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  webview: { flex: 1 },
});
