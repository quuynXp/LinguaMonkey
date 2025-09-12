// path: src/screens/VideoCallManagerScreen.js
import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useVideoCalls } from "../../hooks/useVideos"; // đường dẫn theo project bạn
import { v4 as uuidv4 } from "uuid"; // nếu bạn chưa có, dùng react-native-get-random-values + uuid
import { gotoTab } from "../../utils/navigationRef";
import { useChatStore } from "../../stores/ChatStore";

const STATUS_OPTIONS = ["CONNECTED", "MUTED", "LEFT"];

const Button = ({ title, onPress, disabled }) => (
    <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onPress}
        disabled={disabled}
    >
        <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
);

const VideoCallManagerScreen = ({ route }) => {
    const navigation = useNavigation();
    const { userId: initialUserId = null } = route.params || {}; // optional
    const {
        useCreateGroupCall,
        useCreateVideoCall,
        useVideoCall,
        useGetParticipants,
        useAddParticipant,
        useRemoveParticipant,
        useUpdateParticipantStatus,
        useVideoCallHistory,
    } = useVideoCalls();

    // hook instances
    const createGroupCall = useCreateGroupCall();
    const createVideoCall = useCreateVideoCall();
    const addParticipant = useAddParticipant();
    const removeParticipant = useRemoveParticipant();
    const updateParticipantStatus = useUpdateParticipantStatus();

    // local states
    const [callerId, setCallerId] = useState(initialUserId || "");
    const [videoCallId, setVideoCallId] = useState(null);
    const [roomId, setRoomId] = useState("");
    const [newParticipantId, setNewParticipantId] = useState("");
    const [videoCallType, setVideoCallType] = useState("GROUP"); // or "ONE_TO_ONE"
    const [historyUserId, setHistoryUserId] = useState(initialUserId || "");

    // queries (dynamic)
    const videoCallQuery = useVideoCall(videoCallId);
    const participantsQuery = useGetParticipants(videoCallId);
    const historyQuery = useVideoCallHistory(historyUserId);

    // helpers
    const isCreating =
        createGroupCall.isLoading || createVideoCall.isLoading || addParticipant.isLoading;

    const onCreateGroup = () => {
        if (!callerId) return Alert.alert("Vui lòng nhập callerId");
        const participantIds = newParticipantId ? [newParticipantId] : [];
        createGroupCall.mutate(
            {
                callerId,
                participantIds,
                videoCallType,
            },
            {
                onSuccess: (res) => {
                    // backend trả VideoCallResponse
                    const returnedId = res?.videoCallId;
                    const returnedRoom = res?.roomId;
                    setVideoCallId(returnedId);
                    if (returnedRoom) setRoomId(returnedRoom);
                    Alert.alert("Tạo group call thành công");
                },
                onError: (err) => {
                    console.warn(err);
                    Alert.alert("Tạo group call lỗi");
                },
            }
        );
    };

    const onCreateOneToOne = () => {
        if (!callerId) return Alert.alert("Vui lòng nhập callerId");
        const payload = {
            caller_id: callerId, // backend mapper có thể khác; nếu backend dùng camelCase thay snake_case, sửa payload
            callee_id: newParticipantId || null,
            video_call_type: "ONE_TO_ONE",
        };
        createVideoCall.mutate(payload, {
            onSuccess: (res) => {
                const returnedId = res?.videoCallId;
                const returnedRoom = res?.roomId;
                setVideoCallId(returnedId);
                if (returnedRoom) setRoomId(returnedRoom);
                Alert.alert("Tạo cuộc gọi thành công");
            },
            onError: () => Alert.alert("Tạo cuộc gọi lỗi"),
        });
    };

    const onAddParticipant = () => {
        if (!videoCallId) return Alert.alert("Chọn videoCall trước (tạo hoặc nhập id)");
        if (!newParticipantId) return Alert.alert("Nhập participant userId");
        addParticipant.mutate(
            { videoCallId, userId: newParticipantId },
            {
                onSuccess: () => {
                    setNewParticipantId("");
                },
                onError: () => Alert.alert("Không thêm được participant"),
            }
        );
    };

    const onRemoveParticipant = (userId) => {
        if (!videoCallId) return;
        Alert.alert("Xác nhận", `Xóa user ${userId} khỏi cuộc gọi?`, [
            { text: "Hủy" },
            {
                text: "OK",
                onPress: () =>
                    removeParticipant.mutate(
                        { videoCallId, userId },
                        {
                            onSuccess: () => { },
                            onError: () => Alert.alert("Xóa thất bại"),
                        }
                    ),
            },
        ]);
    };

    const onUpdateParticipantStatus = (userId, status) => {
        if (!videoCallId) return;
        updateParticipantStatus.mutate(
            { videoCallId, userId, status },
            {
                onSuccess: () => { },
                onError: () => Alert.alert("Cập nhật trạng thái thất bại"),
            }
        );
    };

    const onJoinJitsi = () => {
        const targetRoom = roomId || videoCallId || `call-${uuidv4().slice(0, 8)}`;
        gotoTab("Chat", "JitsiCall", { roomId: targetRoom });
    };

    const renderParticipant = ({ item }) => {
        const userId = item.user_id || item.userId || item.userId;
        const status =
            item.status?.toUpperCase?.() ||
            item.status ||
            (item.status === undefined ? "UNKNOWN" : item.status);

        return (
            <View style={styles.partRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.partText}>ID: {userId}</Text>
                    <Text style={styles.partSmall}>Role: {item.role || item.role}</Text>
                    <Text style={styles.partSmall}>Status: {status}</Text>
                </View>

                <View style={styles.partActions}>
                    <TouchableOpacity
                        onPress={() => onRemoveParticipant(userId)}
                        style={styles.iconButton}
                    >
                        <Text style={styles.iconText}>Xóa</Text>
                    </TouchableOpacity>

                    {STATUS_OPTIONS.map((s) => (
                        <TouchableOpacity
                            key={s}
                            onPress={() => onUpdateParticipantStatus(userId, s)}
                            style={styles.iconButtonSmall}
                        >
                            <Text style={styles.iconTextSmall}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
        >
            <View style={styles.inner}>
                <Text style={styles.title}>Video Call Manager</Text>

                <TextInput
                    placeholder="callerId (your user id)"
                    value={callerId}
                    onChangeText={setCallerId}
                    style={styles.input}
                />

                <TextInput
                    placeholder="Participant id (new participant)"
                    value={newParticipantId}
                    onChangeText={setNewParticipantId}
                    style={styles.input}
                />

                <View style={styles.row}>
                    <Button title="Tạo Group Call" onPress={onCreateGroup} disabled={isCreating} />
                    <Button title="Tạo 1-1" onPress={onCreateOneToOne} disabled={isCreating} />
                </View>

                <View style={styles.row}>
                    <TextInput
                        placeholder="Hoặc nhập videoCallId để load"
                        value={videoCallId || ""}
                        onChangeText={setVideoCallId}
                        style={[styles.input, { flex: 1 }]}
                    />
                    <Button title="Load" onPress={() => { /* query auto triggers because videoCallId is state used in hook */ }} />
                </View>

                <View style={styles.row}>
                    <Button title="Thêm participant vào call" onPress={onAddParticipant} disabled={!videoCallId} />
                    <Button title="Join Jitsi" onPress={onJoinJitsi} disabled={!videoCallId && !roomId} />
                </View>

                <Text style={styles.sectionTitle}>Participants</Text>
                {participantsQuery.isLoading ? (
                    <ActivityIndicator />
                ) : participantsQuery.isError ? (
                    <Text style={styles.errorText}>Không lấy được participants</Text>
                ) : (
                    <FlatList
                        data={participantsQuery.data || []}
                        keyExtractor={(item, idx) =>
                            (item.user_id || item.userId || idx.toString()) + "-" + (item.video_call_id || item.videoCallId || "")
                        }
                        renderItem={renderParticipant}
                        ListEmptyComponent={<Text style={styles.small}>Chưa có participant</Text>}
                    />
                )}

                <Text style={styles.sectionTitle}>Call Info</Text>
                {videoCallQuery.isLoading ? (
                    <ActivityIndicator />
                ) : videoCallQuery.isError ? (
                    <Text style={styles.errorText}>Không lấy được call</Text>
                ) : videoCallQuery.data ? (
                    <View style={styles.infoBox}>
                        <Text>ID: {videoCallQuery.data.videoCallId}</Text>
                        <Text>Room: {videoCallQuery.data.roomId || " — "}</Text>
                        <Text>Type: {videoCallQuery.data.videoCallType || " — "}</Text>
                        <Text>Status: {videoCallQuery.data.status || " — "}</Text>
                    </View>
                ) : (
                    <Text style={styles.small}>Chưa có call được chọn</Text>
                )}

                <Text style={styles.sectionTitle}>History (user)</Text>
                <View style={styles.row}>
                    <TextInput
                        placeholder="userId để xem history"
                        value={historyUserId}
                        onChangeText={setHistoryUserId}
                        style={[styles.input, { flex: 1 }]}
                    />
                    <Button title="Xem" onPress={() => { /* query uses historyUserId state */ }} />
                </View>

                {historyQuery.isLoading ? (
                    <ActivityIndicator />
                ) : historyQuery.isError ? (
                    <Text style={styles.errorText}>Không lấy được lịch sử</Text>
                ) : (
                    <FlatList
                        data={historyQuery.data || []}
                        keyExtractor={(item) => item.videoCallId || item.video_call_id}
                        renderItem={({ item }) => (
                            <View style={styles.historyRow}>
                                <Text style={styles.smallBold}>{item.videoCallType} - {item.videoCallId}</Text>
                                <Text style={styles.small}>{item.startTime} → {item.endTime}</Text>
                            </View>
                        )}
                        ListEmptyComponent={<Text style={styles.small}>Không có lịch sử</Text>}
                    />
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

export default VideoCallManagerScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { padding: 12, flex: 1 },
    title: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 8,
        marginVertical: 6,
    },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginVertical: 6 },
    button: { backgroundColor: "#2563eb", padding: 10, borderRadius: 8, marginHorizontal: 4 },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: "white", fontWeight: "600" },
    sectionTitle: { marginTop: 12, fontWeight: "600" },
    partRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderColor: "#eee", alignItems: "center" },
    partText: { fontWeight: "600" },
    partSmall: { fontSize: 12, color: "#555" },
    partActions: { flexDirection: "row", alignItems: "center" },
    iconButton: { backgroundColor: "#ef4444", padding: 6, borderRadius: 6, marginLeft: 8 },
    iconText: { color: "white" },
    iconButtonSmall: { backgroundColor: "#6b7280", padding: 6, borderRadius: 6, marginLeft: 6 },
    iconTextSmall: { color: "white", fontSize: 11 },
    small: { color: "#666", fontSize: 13, marginVertical: 6 },
    smallBold: { fontWeight: "700", color: "#222" },
    infoBox: { padding: 8, backgroundColor: "#f3f4f6", borderRadius: 8 },
    errorText: { color: "red" },
    historyRow: { padding: 8, borderBottomWidth: 1, borderColor: "#eee" },
});
