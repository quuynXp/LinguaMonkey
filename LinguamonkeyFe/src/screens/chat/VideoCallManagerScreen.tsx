// import React, { useState } from "react";
// import {
//     View,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     FlatList,
//     ActivityIndicator,
//     Alert,
//     KeyboardAvoidingView,
//     Platform,

// } from "react-native";
// import { useNavigation } from "@react-navigation/native";
// import { useVideoCalls } from "../../hooks/useVideos";
// import { v4 as uuidv4 } from "uuid";
// import { gotoTab } from "../../utils/navigationRef";
// import { useTranslation } from "react-i18next";
// import ScreenLayout from "../../components/layout/ScreenLayout";
// import type { VideoCallResponse, VideoCallRequest, CreateGroupCallRequest, UpdateParticipantStatusRequest, PageResponse } from "../../types/dto";
// import type { VideoCallParticipant } from "../../types/entity";
// import { VideoCallParticipantStatus } from "../../types/enums";
// import { createScaledSheet } from "../../utils/scaledStyles";

// const VALID_STATUSES = Object.values(VideoCallParticipantStatus);

// const Button = ({ title, onPress, disabled }: { title: string, onPress: () => void, disabled: boolean }) => (
//     <TouchableOpacity
//         style={[styles.button, disabled && styles.buttonDisabled]}
//         onPress={onPress}
//         disabled={disabled}
//     >
//         <Text style={styles.buttonText}>{title}</Text>
//     </TouchableOpacity>
// );

// const VideoCallManagerScreen = ({ route }: any) => {
//     const { t } = useTranslation();
//     const navigation = useNavigation<any>();
//     const { userId: initialUserId = null } = route.params || {};
//     const {
//         useVideoCallsList,
//         useVideoCall,
//         useCreateGroupCall,
//         useCreateVideoCall,
//         useGetParticipants,
//         useAddParticipant,
//         useRemoveParticipant,
//         useUpdateParticipantStatus,
//         useVideoCallHistory,
//     } = useVideoCalls();

//     const createGroupCall = useCreateGroupCall();
//     const createVideoCall = useCreateVideoCall();
//     const addParticipant = useAddParticipant();
//     const removeParticipant = useRemoveParticipant();
//     const updateParticipantStatus = useUpdateParticipantStatus();

//     const [callerId, setCallerId] = useState(initialUserId || "");
//     const [videoCallId, setVideoCallId] = useState("");
//     const [roomId, setRoomId] = useState("");
//     const [newParticipantId, setNewParticipantId] = useState("");
//     const [filterCallerId, setFilterCallerId] = useState("");
//     const [filterStatus, setFilterStatus] = useState("");
//     const [historyUserId, setHistoryUserId] = useState(initialUserId || "");

//     const videoCallQuery = useVideoCall(videoCallId);
//     const participantsQuery = useGetParticipants(videoCallId);
//     const historyQuery = useVideoCallHistory(historyUserId);
//     const filteredCallsQuery = useVideoCallsList({
//         callerId: filterCallerId || undefined,
//         status: filterStatus || undefined,
//         page: 0,
//         limit: 20,
//     });

//     const isCreating =
//         createGroupCall.isPending ||
//         createVideoCall.isPending ||
//         addParticipant.isPending;

//     const onCreateGroup = () => {
//         if (!callerId) return Alert.alert(t("enterCallerId"));
//         const participantIds = newParticipantId ? [newParticipantId] : [];

//         const payload: CreateGroupCallRequest = { callerId, participantIds, roomId: "" };

//         createGroupCall.mutate(
//             payload,
//             {
//                 onSuccess: (res) => {
//                     setVideoCallId(res.videoCallId);
//                     setRoomId(res.roomId || "");
//                     Alert.alert(t("groupCallCreated"));
//                 },
//                 onError: (err: any) => Alert.alert(t("groupCallError"), err.message),
//             }
//         );
//     };

//     const onCreateOneToOne = () => {
//         if (!callerId) return Alert.alert(t("enterCallerId"));

//         const payload: VideoCallRequest & { calleeId?: string } = {
//             callerId,
//             calleeId: newParticipantId || undefined,
//         };

//         createVideoCall.mutate(payload as VideoCallRequest, {
//             onSuccess: (res) => {
//                 setVideoCallId(res.videoCallId);
//                 setRoomId(res.roomId || "");
//                 Alert.alert(t("oneToOneCallCreated"));
//             },
//             onError: (err: any) => Alert.alert(t("oneToOneCallError"), err.message),
//         });
//     };

//     const onAddParticipant = () => {
//         if (!videoCallId) return Alert.alert(t("selectCallFirst"));
//         if (!newParticipantId) return Alert.alert(t("enterParticipantId"));
//         addParticipant.mutate(
//             { videoCallId, userId: newParticipantId },
//             { onSuccess: () => setNewParticipantId("") }
//         );
//     };

//     const onRemoveParticipant = (userId: string) => {
//         if (!videoCallId) return;
//         Alert.alert(t("confirm"), `${t("removeUser")} ${userId}?`, [
//             { text: t("cancel") },
//             {
//                 text: t("ok"),
//                 onPress: () =>
//                     removeParticipant.mutate({ videoCallId, userId }),
//             },
//         ]);
//     };

//     const onUpdateParticipantStatus = (userId: string, status: VideoCallParticipantStatus) => {
//         if (!videoCallId) return;
//         updateParticipantStatus.mutate({
//             videoCallId,
//             userId,
//             req: { status }
//         });
//     };

//     const onJoinJitsi = () => {
//         const targetRoom = roomId || videoCallId || `call-${uuidv4().slice(0, 8)}`;

//         gotoTab("ChatStack", "WebRTCCallScreen", { roomId: targetRoom });
//     };

//     const getStatusLabel = (status: string) => {
//         switch (status) {
//             case VideoCallParticipantStatus.CONNECTED: return t("statusConnected");
//             default: return status;
//         }
//     };

//     const renderParticipant = ({ item }: { item: VideoCallParticipant }) => {
//         return (
//             <View style={styles.partRow}>
//                 <View style={{ flex: 1 }}>
//                     <Text style={styles.partText}>{t("id")}: {item.user?.userId || item.id.userId}</Text>
//                     <Text style={styles.partSmall}>{t("role")}: {item.role || "GUEST"}</Text>
//                     <Text style={styles.partSmall}>{t("status")}: {getStatusLabel(item.status)}</Text>
//                 </View>
//                 <View style={styles.partActions}>
//                     <TouchableOpacity
//                         style={styles.iconButton}
//                         onPress={() => onRemoveParticipant(item.user?.userId || item.id.userId)}
//                     >
//                         <Text style={styles.iconText}>{t("remove")}</Text>
//                     </TouchableOpacity>
//                     {VALID_STATUSES.map((s) => (
//                         <TouchableOpacity
//                             key={s}
//                             style={styles.iconButtonSmall}
//                             onPress={() => onUpdateParticipantStatus(item.user?.userId || item.id.userId, s)}
//                         >
//                             <Text style={styles.iconTextSmall}>{s.substring(0, 3)}</Text>
//                         </TouchableOpacity>
//                     ))}
//                 </View>
//             </View>
//         );
//     };

//     // FIXED: Type assertion to correctly extract array data from PageResponse
//     const listData: VideoCallResponse[] = (filteredCallsQuery.data?.data as VideoCallResponse[]) || [];
//     const historyData: VideoCallResponse[] = historyQuery.data || [];
//     const participantsData: VideoCallParticipant[] = participantsQuery.data || [];


//     return (
//         <ScreenLayout>
//             <KeyboardAvoidingView
//                 behavior={Platform.OS === "ios" ? "padding" : undefined}
//                 style={styles.container}
//             >
//                 <View style={styles.inner}>
//                     <Text style={styles.title}>{t("videoCallManager")}</Text>

//                     <TextInput
//                         placeholder={t("filterCallerId")}
//                         value={filterCallerId}
//                         onChangeText={setFilterCallerId}
//                         style={styles.input}
//                     />
//                     <TextInput
//                         placeholder={t("filterStatus")}
//                         value={filterStatus}
//                         onChangeText={setFilterStatus}
//                         style={styles.input}
//                     />

//                     {filteredCallsQuery.isLoading ? (
//                         <ActivityIndicator />
//                     ) : (
//                         <FlatList
//                             data={listData}
//                             keyExtractor={(item) => item.videoCallId}
//                             renderItem={({ item }: { item: VideoCallResponse }) => (
//                                 <TouchableOpacity
//                                     onPress={() => {
//                                         setVideoCallId(item.videoCallId);
//                                         setRoomId(item.roomId || "");
//                                     }}
//                                 >
//                                     <Text>
//                                         {item.videoCallType} - {item.videoCallId} [{item.status}]
//                                     </Text>
//                                 </TouchableOpacity>
//                             )}
//                         />
//                     )}

//                     <TextInput
//                         placeholder={t("callerId")}
//                         value={callerId}
//                         onChangeText={setCallerId}
//                         style={styles.input}
//                     />
//                     <TextInput
//                         placeholder={t("participantId")}
//                         value={newParticipantId}
//                         onChangeText={setNewParticipantId}
//                         style={styles.input}
//                     />

//                     <View style={styles.row}>
//                         <Button title={t("createGroupCall")} onPress={onCreateGroup} disabled={isCreating} />
//                         <Button title={t("createOneToOne")} onPress={onCreateOneToOne} disabled={isCreating} />
//                     </View>

//                     <View style={styles.row}>
//                         <Button title={t("addParticipant")} onPress={onAddParticipant} disabled={!videoCallId} />
//                         <Button title={t("joinJitsi")} onPress={onJoinJitsi} disabled={!videoCallId && !roomId} />
//                     </View>

//                     <Text style={styles.sectionTitle}>{t("participants")}</Text>
//                     {participantsQuery.isLoading ? (
//                         <ActivityIndicator />
//                     ) : participantsQuery.isError ? (
//                         <Text style={styles.errorText}>{t("participantsError")}</Text>
//                     ) : (
//                         <FlatList
//                             data={participantsData}
//                             keyExtractor={(item) => item.user?.userId || item.id.userId}
//                             renderItem={renderParticipant}
//                             ListEmptyComponent={<Text style={styles.small}>{t("noParticipants")}</Text>}
//                         />
//                     )}

//                     <Text style={styles.sectionTitle}>{t("callInfo")}</Text>
//                     {videoCallQuery.isLoading ? (
//                         <ActivityIndicator />
//                     ) : videoCallQuery.isError ? (
//                         <Text style={styles.errorText}>{t("callError")}</Text>
//                     ) : videoCallQuery.data ? (
//                         <View style={styles.infoBox}>
//                             <Text>{t("id")}: {videoCallQuery.data.videoCallId}</Text>
//                             <Text>{t("room")}: {videoCallQuery.data.roomId || " — "}</Text>
//                             <Text>{t("type")}: {videoCallQuery.data.videoCallType || " — "}</Text>
//                             <Text>{t("status")}: {videoCallQuery.data.status || " — "}</Text>
//                         </View>
//                     ) : (
//                         <Text style={styles.small}>{t("noCallSelected")}</Text>
//                     )}

//                     <Text style={styles.sectionTitle}>{t("historyUser")}</Text>
//                     <View style={styles.row}>
//                         <TextInput
//                             placeholder={t("enterUserIdHistory")}
//                             value={historyUserId}
//                             onChangeText={setHistoryUserId}
//                             style={[styles.input, { flex: 1 }]}
//                         />
//                         <Button title={t("view")} onPress={() => historyQuery.refetch()} disabled={historyQuery.isFetching} />
//                     </View>
//                     {historyQuery.isLoading ? (
//                         <ActivityIndicator />
//                     ) : historyQuery.isError ? (
//                         <Text style={styles.errorText}>{t("historyError")}</Text>
//                     ) : (
//                         <FlatList
//                             data={historyData}
//                             keyExtractor={(item) => item.videoCallId}
//                             renderItem={({ item }: { item: VideoCallResponse }) => (
//                                 <View style={styles.historyRow}>
//                                     <Text style={styles.smallBold}>
//                                         {item.videoCallType} - {item.videoCallId}
//                                     </Text>
//                                     <Text style={styles.small}>
//                                         {item.startTime} → {item.endTime}
//                                     </Text>
//                                 </View>
//                             )}
//                             ListEmptyComponent={<Text style={styles.small}>{t("noHistory")}</Text>}
//                         />
//                     )}
//                 </View>
//             </KeyboardAvoidingView>
//         </ScreenLayout>
//     );
// };

// const styles = createScaledSheet({
//     container: { flex: 1 },
//     inner: { padding: 12, flex: 1 },
//     title: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
//     input: {
//         borderWidth: 1,
//         borderColor: "#ddd",
//         borderRadius: 8,
//         padding: 8,
//         marginVertical: 6,
//         color: "#1F2937",
//         backgroundColor: "#F9FAFB",
//     },
//     row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginVertical: 6 },
//     button: { backgroundColor: "#2563eb", padding: 10, borderRadius: 8, marginHorizontal: 4 },
//     buttonDisabled: { opacity: 0.5 },
//     buttonText: { color: "white", fontWeight: "600" },
//     sectionTitle: { marginTop: 12, fontWeight: "600", color: "#1F2937" },
//     partRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderColor: "#eee", alignItems: "center" },
//     partText: { fontWeight: "600", color: "#1F2937" },
//     partSmall: { fontSize: 12, color: "#6B7280" },
//     partActions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", maxWidth: 150 },
//     iconButton: { backgroundColor: "#ef4444", padding: 6, borderRadius: 6, marginLeft: 8 },
//     iconText: { color: "white", fontSize: 12, fontWeight: "500" },
//     iconButtonSmall: { backgroundColor: "#6b7280", padding: 4, borderRadius: 6, marginLeft: 6, marginTop: 4 },
//     iconTextSmall: { color: "white", fontSize: 10, fontWeight: "500" },
//     small: { color: "#666", fontSize: 13, marginVertical: 6 },
//     smallBold: { fontWeight: "700", color: "#222" },
//     infoBox: { padding: 8, backgroundColor: "#f3f4f6", borderRadius: 8 },
//     errorText: { color: "#ef4444" },
//     historyRow: { padding: 8, borderBottomWidth: 1, borderColor: "#eee" },
// });

// export default VideoCallManagerScreen;