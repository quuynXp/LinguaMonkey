import React, { useEffect } from "react";
import { View, Button, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import VoiceStreamService from "../../services/VoiceStreamService";
import WebSocketService from "../../services/WebSocketService";

const JitsiWebView = ({ route }) => {
  const { roomId = "test-room", jwtToken } = route.params || {};
  const jitsiURL = `https://meet.jit.si/${roomId}#userInfo.displayName="User Demo"`;

  useEffect(() => {
    WebSocketService.connect(jwtToken, (resp) => {
      console.log("🧠 AI response:", resp);
      // có thể play audio hoặc hiện text subtitle
    });
    return () => WebSocketService.disconnect();
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: jitsiURL }}
        style={styles.webview}
        allowsFullscreenVideo
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
      />
      <View style={styles.controls}>
        <Button title="Start Voice Stream" onPress={() => VoiceStreamService.startRecording()} />
        <Button title="Stop" color="red" onPress={() => VoiceStreamService.stopRecording()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  webview: { flex: 1 },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
  },
});

export default JitsiWebView;
