import React, { useEffect, useCallback, useState, useMemo } from "react";
import { View, TouchableOpacity, Modal, Text, FlatList, Image, Alert, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Switch } from "react-native";
import { useRoute, RouteProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from "react-i18next";

import ChatInnerView from "../../components/chat/ChatInnerView";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import { useAppStore } from "../../stores/appStore";
import { useRooms } from "../../hooks/useRoom";
import { useVideoCalls } from "../../hooks/useVideos"; // Import useVideoCalls
import { MemberResponse, AppApiResponse, UserSettings, CreateGroupCallRequest } from "../../types/dto";
import { RoomType, VideoCallType } from "../../types/enums";
import instance from "../../api/axiosClient";
import { useToast } from "../../utils/useToast";
import IncomingCallModal from "../../components/modals/IncomingCallModal"; // Import the modal

type ChatRoomParams = {
    ChatRoom: {
        roomId: string;
        roomName: string;
    };
};

const GroupChatScreen = () => {
    const route = useRoute<RouteProp<ChatRoomParams, 'ChatRoom'>>();
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { roomId, roomName: initialRoomName } = route.params;
    const { user } = useUserStore();
    const { showToast } = useToast();

    // App Store for Settings
    const { chatSettings, setChatSettings } = useAppStore();

    const {
        activeBubbleRoomId, closeBubble,
        initStompClient, stompConnected,
        subscribeToRoom, unsubscribeFromRoom
    } = useChatStore();

    const { useRoomMembers, useRemoveRoomMembers, useLeaveRoom, useRoom, useUpdateMemberNickname } = useRooms();
    const { useCreateGroupCall } = useVideoCalls(); // Hook for creating calls

    const { data: members } = useRoomMembers(roomId);
    const { data: roomInfo } = useRoom(roomId);
    const { mutate: kickMember } = useRemoveRoomMembers();
    const { mutate: leaveRoom } = useLeaveRoom();
    const { mutate: updateNickname } = useUpdateMemberNickname();
    const { mutate: createGroupCall, isPending: isCalling } = useCreateGroupCall();

    const [showSettings, setShowSettings] = useState(false);
    const [showEditNickname, setShowEditNickname] = useState(false);
    const [newNickname, setNewNickname] = useState('');

    // --- SYNC SETTINGS LOGIC ---
    const syncSettingToBackend = async (newSettings: Partial<UserSettings>) => {
        if (!user?.userId) return;
        try {
            await instance.patch(`/api/v1/user-settings/${user.userId}`, newSettings);
        } catch (error) {
            console.error("Failed to sync settings", error);
            showToast({ type: "error", message: t("error.update_settings_failed") });
        }
    };

    const toggleAutoTranslate = (value: boolean) => {
        setChatSettings({ autoTranslate: value });
        syncSettingToBackend({ autoTranslate: value });
    };

    const toggleSound = (value: boolean) => {
        setChatSettings({ soundNotifications: value });
        syncSettingToBackend({ soundEnabled: value });
    };

    // --- OTHER LOGIC ---
    const currentUserMember = members?.find(m => m.userId === user?.userId);
    const isAdmin = currentUserMember?.role === 'ADMIN' || currentUserMember?.isAdmin;
    const isPrivateRoom = roomInfo?.roomType === RoomType.PRIVATE || roomInfo?.roomType === RoomType.COUPLE;

    const targetMember = useMemo(() => {
        if (!isPrivateRoom || !members) return null;
        return members.find(m => m.userId !== user?.userId);
    }, [members, isPrivateRoom, user?.userId]);

    const displayRoomName = useMemo(() => {
        if (isPrivateRoom && targetMember) {
            return targetMember.nickNameInRoom || targetMember.nickname || targetMember.fullname;
        }
        return roomInfo?.roomName || initialRoomName;
    }, [isPrivateRoom, targetMember, roomInfo, initialRoomName]);

    const renderActiveDot = () => {
        if (targetMember && (targetMember as any).isOnline) {
            return <View style={styles.headerActiveDot} />;
        }
        return null;
    };

    useFocusEffect(
        useCallback(() => {
            if (user) initStompClient();
        }, [user, initStompClient])
    );

    useEffect(() => {
        if (stompConnected && roomId) subscribeToRoom(roomId);
        return () => { unsubscribeFromRoom(roomId); };
    }, [stompConnected, roomId, subscribeToRoom, unsubscribeFromRoom]);

    useEffect(() => {
        if (activeBubbleRoomId === roomId) closeBubble();
    }, [roomId, activeBubbleRoomId, closeBubble]);

    // --- VIDEO CALL HANDLER ---
    const handleStartVideoCall = () => {
        if (!user?.userId || !members) return;

        const participantIds = members.map(m => m.userId);

        const payload: CreateGroupCallRequest = {
            callerId: user.userId,
            participantIds: participantIds,
            videoCallType: VideoCallType.GROUP
        };

        createGroupCall(payload, {
            onSuccess: (response) => {
                // Immediately navigate the caller to Jitsi
                navigation.navigate('JitsiCallScreen', {
                    roomId: response.roomId
                });
            },
            onError: (error) => {
                console.error("Failed to start call", error);
                showToast({ type: "error", message: t("error.start_call_failed") });
            }
        });
    };

    // ... (Giữ nguyên logic Kick, Leave, Rename) ...
    const handleKickUser = (memberId: string, memberName: string) => {
        Alert.alert(t('common.confirm'), t('chat.kick_confirm', { name: memberName }), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: () => kickMember({ roomId, userIds: [memberId] }) }
        ]);
    };

    const handleLeaveRoom = () => {
        Alert.alert(t('common.confirm'), t('chat.leave_confirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('chat.leave'), style: 'destructive', onPress: () => {
                    leaveRoom({ roomId }, { onSuccess: () => { setShowSettings(false); navigation.navigate('ChatRoomListScreen'); } });
                }
            }
        ]);
    };

    const submitNickname = () => {
        updateNickname({ roomId, nickname: newNickname }, { onSuccess: () => setShowEditNickname(false) });
    };

    const renderMemberItem = ({ item }: { item: MemberResponse }) => {
        const displayName = item.nickNameInRoom || item.nickname || item.fullname;
        const isSelf = item.userId === user?.userId;
        return (
            <View style={styles.memberItem}>
                <Image source={item.avatarUrl ? { uri: item.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')} style={styles.memberAvatar} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.memberName} numberOfLines={1}>{displayName} {isSelf && t('chat.you')}</Text>
                        {isSelf && !isPrivateRoom && (
                            <TouchableOpacity onPress={() => { setNewNickname(displayName || ''); setShowEditNickname(true); }} style={{ marginLeft: 8 }}>
                                <Icon name="edit" size={16} color="#4F46E5" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.memberRole}>{item.role === 'ADMIN' ? t('chat.admin') : t('chat.member')}</Text>
                </View>
                {isAdmin && !isSelf && !isPrivateRoom && (
                    <TouchableOpacity onPress={() => handleKickUser(item.userId, displayName)} style={styles.iconBtn}>
                        <Icon name="remove-circle-outline" size={24} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <ScreenLayout>
            {/* Global Incoming Call Modal - Placed here or in App Layout */}
            <IncomingCallModal />

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <Icon name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    {isPrivateRoom && targetMember && (
                        <View style={{ position: 'relative', marginRight: 10 }}>
                            <Image source={targetMember.avatarUrl ? { uri: targetMember.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')} style={{ width: 32, height: 32, borderRadius: 16 }} />
                            {renderActiveDot()}
                        </View>
                    )}
                    <View style={{ alignItems: isPrivateRoom ? 'flex-start' : 'center', flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{displayRoomName}</Text>
                        <Text style={styles.headerSubtitle}>
                            {isPrivateRoom && targetMember ? ((targetMember as any).isOnline ? "Active now" : "Offline") : `${members?.length || 0} ${t('chat.members')}`}
                        </Text>
                    </View>
                </View>

                {/* NEW: Video Call Button */}
                <TouchableOpacity onPress={handleStartVideoCall} style={{ padding: 8 }} disabled={isCalling}>
                    <Icon name="videocam" size={24} color={isCalling ? "#9CA3AF" : "#4F46E5"} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 8 }}>
                    <Icon name="settings" size={24} color="#4F46E5" />
                </TouchableOpacity>
            </View>

            {/* CHAT VIEW */}
            <View style={{ flex: 1 }}>
                <ChatInnerView
                    roomId={roomId}
                    initialRoomName={displayRoomName}
                    isBubbleMode={false}
                    autoTranslate={chatSettings.autoTranslate}
                    soundEnabled={chatSettings.soundNotifications}
                />
            </View>

            {/* SETTINGS MODAL */}
            <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('chat.room_settings')}</Text>
                        <TouchableOpacity onPress={() => setShowSettings(false)}>
                            <Icon name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {/* PREFERENCES SECTION */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>

                        {/* Auto Translate Toggle */}
                        <View style={styles.settingRow}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Icon name="translate" size={20} color="#4F46E5" />
                                    <Text style={styles.settingLabel}>{t('settings.auto_translate')}</Text>
                                </View>
                                <Text style={styles.settingDesc}>{t('settings.auto_translate_desc')}</Text>
                            </View>
                            <Switch
                                value={chatSettings.autoTranslate}
                                onValueChange={toggleAutoTranslate}
                                trackColor={{ false: "#767577", true: "#818cf8" }}
                                thumbColor={chatSettings.autoTranslate ? "#4F46E5" : "#f4f3f4"}
                            />
                        </View>

                        {/* Sound Toggle */}
                        <View style={styles.settingRow}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Icon name="volume-up" size={20} color="#4F46E5" />
                                    <Text style={styles.settingLabel}>{t('settings.sound')}</Text>
                                </View>
                            </View>
                            <Switch
                                value={chatSettings.soundNotifications}
                                onValueChange={toggleSound}
                                trackColor={{ false: "#767577", true: "#818cf8" }}
                                thumbColor={chatSettings.soundNotifications ? "#4F46E5" : "#f4f3f4"}
                            />
                        </View>
                    </View>

                    {/* MEMBERS SECTION */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>{t('chat.members')} ({members?.length || 0})</Text>
                        <FlatList
                            data={members}
                            renderItem={renderMemberItem}
                            keyExtractor={item => item.userId}
                            scrollEnabled={false}
                        />
                    </View>

                    {!isPrivateRoom && (
                        <View style={styles.footerActions}>
                            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveRoom}>
                                <Icon name="logout" size={20} color="#FFF" />
                                <Text style={styles.leaveBtnText}>{t('chat.leave_room')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Nickname Modal Overlay */}
                    <Modal visible={showEditNickname} transparent animationType="fade" onRequestClose={() => setShowEditNickname(false)}>
                        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
                            <View style={styles.dialog}>
                                <Text style={styles.dialogTitle}>{t('chat.change_nickname')}</Text>
                                <TextInput style={styles.input} value={newNickname} onChangeText={setNewNickname} placeholder={t('chat.nickname_placeholder')} autoFocus />
                                <View style={styles.dialogActions}>
                                    <TouchableOpacity onPress={() => setShowEditNickname(false)} style={styles.dialogButton}><Text style={styles.dialogButtonText}>{t('cancel')}</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={submitNickname} style={[styles.dialogButton, styles.primaryButton]}><Text style={[styles.dialogButtonText, { color: '#FFF' }]}>{t('save')}</Text></TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </Modal>
                </View>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
    headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    headerSubtitle: { fontSize: 12, color: '#9CA3AF' },
    headerActiveDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 1.5, borderColor: '#FFF' },

    modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },

    sectionContainer: { marginTop: 16, backgroundColor: '#FFF', paddingVertical: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase' },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    settingLabel: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
    settingDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2, marginLeft: 28 },

    memberItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' },
    memberName: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
    memberRole: { fontSize: 12, color: '#9CA3AF' },
    iconBtn: { padding: 8 },
    footerActions: { padding: 20, marginTop: 20 },
    leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', padding: 12, borderRadius: 8 },
    leaveBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    dialog: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, width: '100%', maxWidth: 320 },
    dialogTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1F2937' },
    input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 20, color: '#1F2937' },
    dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    dialogButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
    primaryButton: { backgroundColor: '#4F46E5' },
    dialogButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' }
});

export default GroupChatScreen;