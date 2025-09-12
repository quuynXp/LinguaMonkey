// path: src/screens/JitsiCallScreen.js
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import JitsiMeet, { JitsiMeetEvents } from "react-native-jitsi-meet";

const JitsiCallScreen = ({ route, navigation }) => {
  const { roomId = "test-room" } = route.params || {};
  const jitsiUrl = `https://meet.jit.si/${roomId}`;

  useEffect(() => {
    // Join room ngay khi màn hình mount
    const userInfo = {
      displayName: "User Demo",
      email: "user@example.com",
      avatar: "https://i.pravatar.cc/100" // optional
    };

    JitsiMeet.call(jitsiUrl, userInfo);

    // Lắng nghe event
    JitsiMeetEvents.addListener("CONFERENCE_TERMINATED", (data) => {
      console.log("Conference terminated:", data);
      navigation.goBack();
    });

    JitsiMeetEvents.addListener("CONFERENCE_JOINED", (data) => {
      console.log("Conference joined:", data);
    });

    JitsiMeetEvents.addListener("CONFERENCE_WILL_JOIN", (data) => {
      console.log("Conference will join:", data);
    });

    return () => {
      JitsiMeet.endCall();
      JitsiMeetEvents.removeAllListeners();
    };
  }, [roomId]);

  return <View style={styles.container} />;
};

export default JitsiCallScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
});
