import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useVideoCalls } from "../../hooks/useVideos";
import { v4 as uuidv4 } from "uuid";
import { gotoTab } from "../../utils/navigationRef";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { userId: initialUserId = null } = route.params || {};
    const {
        useVideoCallsList,
        useVideoCall,
        useCreateGroupCall,
        useCreateVideoCall,
        useGetParticipants,
        useAddParticipant,
        useRemoveParticipant,
        useUpdateParticipantStatus,
        useVideoCallHistory,
    } = useVideoCalls();

    const STATUS_OPTIONS = ["CONNECTED", "MUTED", "LEFT"];

    const createGroupCall = useCreateGroupCall();
    const createVideoCall = useCreateVideoCall();
    const addParticipant = useAddParticipant();
    const removeParticipant = useRemoveParticipant();
    const updateParticipantStatus = useUpdateParticipantStatus();

    const [callerId, setCallerId] = useState(initialUserId || "");
    const [videoCallId, setVideoCallId] = useState("");
    const [roomId, setRoomId] = useState("");
    const [newParticipantId, setNewParticipantId] = useState("");
    const [videoCallType, setVideoCallType] = useState("GROUP");
    const [historyUserId, setHistoryUserId] = useState(initialUserId || "");
    const [filterCallerId, setFilterCallerId] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    const videoCallQuery = useVideoCall(videoCallId);
    const participantsQuery = useGetParticipants(videoCallId);
    const historyQuery = useVideoCallHistory(historyUserId);
    const filteredCallsQuery = useVideoCallsList({
        callerId: filterCallerId || undefined,
        status: filterStatus || undefined,
        page: 0,
        limit: 20,
    });

    const isCreating =
        createGroupCall.isPending ||
        createVideoCall.isPending ||
        addParticipant.isPending;

    const onCreateGroup = () => {
        if (!callerId) return Alert.alert(t("enterCallerId"));
        const participantIds = newParticipantId ? [newParticipantId] : [];
        createGroupCall.mutate(
            { callerId, participantIds, videoCallType },
            {
                onSuccess: (res) => {
                    setVideoCallId(res.videoCallId);
                    setRoomId(res.roomId || "");
                    Alert.alert(t("groupCallCreated"));
                },
                onError: () => Alert.alert(t("groupCallError")),
            }
        );
    };

    const onCreateOneToOne = () => {
        if (!callerId) return Alert.alert(t("enterCallerId"));
        const payload = {
            callerId,
            calleeId: newParticipantId || null,
            videoCallType: "ONE_TO_ONE",
        };
        createVideoCall.mutate(payload, {
            onSuccess: (res) => {
                setVideoCallId(res.videoCallId);
                setRoomId(res.roomId || "");
                Alert.alert(t("oneToOneCallCreated"));
            },
            onError: () => Alert.alert(t("oneToOneCallError")),
        });
    };

    const onAddParticipant = () => {
        if (!videoCallId) return Alert.alert(t("selectCallFirst"));
        if (!newParticipantId) return Alert.alert(t("enterParticipantId"));
        addParticipant.mutate(
            { videoCallId, userId: newParticipantId },
            { onSuccess: () => setNewParticipantId("") }
        );
    };

    const onRemoveParticipant = (userId) => {
        if (!videoCallId) return;
        Alert.alert(t("confirm"), `${t("removeUser")} ${userId}?`, [
            { text: t("cancel") },
            {
                text: t("ok"),
                onPress: () =>
                    removeParticipant.mutate({ videoCallId, userId }),
            },
        ]);
    };

    const onUpdateParticipantStatus = (userId, status) => {
        if (!videoCallId) return;
        updateParticipantStatus.mutate({ videoCallId, userId, status });
    };

    const onJoinJitsi = () => {
        const targetRoom = roomId || videoCallId || `call-${uuidv4().slice(0, 8)}`;
        gotoTab("Chat", "JitsiCall", { roomId: targetRoom });
    };

    const renderParticipant = ({ item }) => {
        const { t } = useTranslation();
        const getStatusLabel = (status) => {
            switch (status) {
                case "CONNECTED": return t("statusConnected");
                case "MUTED": return t("statusMuted");
                case "LEFT": return t("statusLeft");
                default: return status;
            }
        };

        return (
            <View style={styles.partRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.partText}>{t("id")}: {item.userId}</Text>
                    <Text style={styles.partSmall}>{t("role")}: {item.role || "GUEST"}</Text>
                    <Text style={styles.partSmall}>{t("status")}: {getStatusLabel(item.status)}</Text>
                </View>
                <View style={styles.partActions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => onRemoveParticipant(item.userId)}
                    >
                        <Text style={styles.iconText}>{t("remove")}</Text>
                    </TouchableOpacity>
                    {STATUS_OPTIONS.map((s) => (
                        <TouchableOpacity
                            key={s}
                            style={styles.iconButtonSmall}
                            onPress={() => onUpdateParticipantStatus(item.userId, s)}
                        >
                            <Text style={styles.iconTextSmall}>{getStatusLabel(s)}</Text>
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
                <Text style={styles.title}>{t("videoCallManager")}</Text>

                <TextInput
                    placeholder={t("filterCallerId")}
                    value={filterCallerId}
                    onChangeText={setFilterCallerId}
                    style={styles.input}
                />
                <TextInput
                    placeholder={t("filterStatus")}
                    value={filterStatus}
                    onChangeText={setFilterStatus}
                    style={styles.input}
                />

                {filteredCallsQuery.isLoading ? (
                    <ActivityIndicator />
                ) : (
                    <FlatList
                        data={filteredCallsQuery.data?.content || []}
                        keyExtractor={(item) => item.videoCallId}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    setVideoCallId(item.videoCallId);
                                    setRoomId(item.roomId || "");
                                }}
                            >
                                <Text>
                                    {item.videoCallType} - {item.videoCallId} [{item.status}]
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                )}

                <TextInput
                    placeholder={t("callerId")}
                    value={callerId}
                    onChangeText={setCallerId}
                    style={styles.input}
                />
                <TextInput
                    placeholder={t("participantId")}
                    value={newParticipantId}
                    onChangeText={setNewParticipantId}
                    style={styles.input}
                />

                <View style={styles.row}>
                    <Button title={t("createGroupCall")} onPress={onCreateGroup} disabled={isCreating} />
                    <Button title={t("createOneToOne")} onPress={onCreateOneToOne} disabled={isCreating} />
                </View>

                <View style={styles.row}>
                    <Button title={t("addParticipant")} onPress={onAddParticipant} disabled={!videoCallId} />
                    <Button title={t("joinJitsi")} onPress={onJoinJitsi} disabled={!videoCallId && !roomId} />
                </View>

                <Text style={styles.sectionTitle}>{t("participants")}</Text>
                {participantsQuery.isLoading ? (
                    <ActivityIndicator />
                ) : participantsQuery.isError ? (
                    <Text style={styles.errorText}>{t("participantsError")}</Text>
                ) : (
                    <FlatList
                        data={participantsQuery.data || []}
                        keyExtractor={(item) => item.userId}
                        renderItem={renderParticipant}
                        ListEmptyComponent={<Text style={styles.small}>{t("noParticipants")}</Text>}
                    />
                )}

                <Text style={styles.sectionTitle}>{t("callInfo")}</Text>
                {videoCallQuery.isLoading ? (
                    <ActivityIndicator />
                ) : videoCallQuery.isError ? (
                    <Text style={styles.errorText}>{t("callError")}</Text>
                ) : videoCallQuery.data ? (
                    <View style={styles.infoBox}>
                        <Text>{t("id")}: {videoCallQuery.data.videoCallId}</Text>
                        <Text>{t("room")}: {videoCallQuery.data.roomId || " — "}</Text>
                        <Text>{t("type")}: {videoCallQuery.data.videoCallType || " — "}</Text>
                        <Text>{t("status")}: {videoCallQuery.data.status || " — "}</Text>
                    </View>
                ) : (
                    <Text style={styles.small}>{t("noCallSelected")}</Text>
                )}

                <Text style={styles.sectionTitle}>{t("historyUser")}</Text>
                <View style={styles.row}>
                    <TextInput
                        placeholder={t("enterUserIdHistory")}
                        value={historyUserId}
                        onChangeText={setHistoryUserId}
                        style={[styles.input, { flex: 1 }]}
                    />
                    <Button title={t("view")} onPress={() => historyQuery.refetch()} disabled={undefined} />
                </View>
                {historyQuery.isLoading ? (
                    <ActivityIndicator />
                ) : historyQuery.isError ? (
                    <Text style={styles.errorText}>{t("historyError")}</Text>
                ) : (
                    <FlatList
                        data={historyQuery.data || []}
                        keyExtractor={(item) => item.videoCallId}
                        renderItem={({ item }) => (
                            <View style={styles.historyRow}>
                                <Text style={styles.smallBold}>
                                    {item.videoCallType} - {item.videoCallId}
                                </Text>
                                <Text style={styles.small}>
                                    {item.startTime} → {item.endTime}
                                </Text>
                            </View>
                        )}
                        ListEmptyComponent={<Text style={styles.small}>{t("noHistory")}</Text>}
                    />
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

export default VideoCallManagerScreen;

const styles = createScaledSheet({
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
