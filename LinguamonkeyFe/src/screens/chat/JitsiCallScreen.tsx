// import React, { useEffect, useRef, useState } from "react";
// import { View, Text, StyleSheet } from "react-native";
// import JitsiMeet, { JitsiMeetView } from "react-native-jitsi-meet";

// const JitsiCallScreen = ({ route, navigation }) => {
//   const { roomId = "test-room" } = route.params || {};
//   const [subtitle, setSubtitle] = useState("");
//   const jitsiRef = useRef(null); // Ref để tương tác với JitsiMeetView
//   const wsRef = useRef(null);

//   useEffect(() => {
//     // Khởi tạo WebSocket subtitle
//     wsRef.current = new WebSocket("wss://your-backend/ws/subtitle");

//     wsRef.current.onmessage = (msg) => {
//       try {
//         const data = JSON.parse(msg.data);
//         if (data.text) setSubtitle(data.text);
//       } catch (e) {
//         console.error("Invalid WS data:", msg.data);
//       }
//     };

//     // Khởi tạo Jitsi Meet BẰNG CÁCH DÙNG REF CỦA JitsiMeetView
//     const url = `https://meet.jit.si/${roomId}`;
//     const userInfo = {
//       displayName: "User Demo",
//       email: "user@example.com",
//       avatar: "https://i.pravatar.cc/100",
//     };

//     // Dùng setTimeout ngắn để đảm bảo jitsiRef đã được gán (component đã mount)
//     const timer = setTimeout(() => {
//       if (jitsiRef.current) {
//         // GỌI PHƯƠNG THỨC JOIN() TRÊN REF CỦA COMPONENT
//         // Đây là cách đúng để khởi tạo cuộc gọi khi dùng JitsiMeetView
//         jitsiRef.current.join(url, userInfo);
//       }
//     }, 100); // Đảm bảo ref sẵn sàng trước khi gọi

//     return () => {
//       // Dọn dẹp: JitsiMeetView tự dọn dẹp khi unmount, nhưng gọi endCall() là an toàn.
//       JitsiMeet.endCall();
//       clearTimeout(timer);
//       wsRef.current?.close();
//     };
//   }, [roomId]); // Dependency cho roomId

//   // Các hàm xử lý sự kiện vẫn giữ nguyên...
//   const onConferenceTerminated = (nativeEvent) => {
//     console.log("Conference terminated:", nativeEvent);
//     navigation.goBack();
//   };

//   const onConferenceJoined = (nativeEvent) => {
//     console.log("Conference joined:", nativeEvent);
//   };

//   const onConferenceWillJoin = (nativeEvent) => {
//     console.log("Conference will join:", nativeEvent);
//   };

//   return (
//     <View style={styles.container}>
//       {/* View video Jitsi */}
//       <JitsiMeetView
//         ref={jitsiRef} // Đảm bảo ref được gán ở đây
//         style={styles.jitsiView}
//         onConferenceTerminated={onConferenceTerminated}
//         onConferenceJoined={onConferenceJoined}
//         onConferenceWillJoin={onConferenceWillJoin}
//         // Thêm các props cấu hình khác nếu cần thiết (ví dụ: config, features)
//       />

//       {/* Overlay subtitle (giữ nguyên để hiển thị phụ đề) */}
//       {subtitle ? (
//         <View style={styles.subtitleContainer}>
//           <Text style={styles.subtitleText}>{subtitle}</Text>
//         </View>
//       ) : null}
//     </View>
//   );
// };

// export default JitsiCallScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "black" },
//   jitsiView: { flex: 1 },
//   subtitleContainer: {
//     position: "absolute",
//     bottom: 60,
//     width: "100%",
//     alignItems: "center",
//   },
//   subtitleText: {
//     backgroundColor: "rgba(0,0,0,0.6)",
//     color: "#fff",
//     fontSize: 16,
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 8,
//   },
// });
