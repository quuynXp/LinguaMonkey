import React, { useEffect, useState, useMemo } from "react";
import { View, TouchableOpacity, Modal, Text, FlatList, Image, Alert, StyleSheet, Switch, ScrollView } from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";

import ChatInnerView from "../../components/chat/ChatInnerView";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import { useAppStore } from "../../stores/appStore";
import { useRooms } from "../../hooks/useRoom";
import { useVideoCalls } from "../../hooks/useVideos";
import { MemberResponse } from "../../types/dto";
import { RoomType, VideoCallType } from "../../types/enums";
import { privateClient } from "../../api/axiosClient";
import { useToast } from "../../utils/useToast";
import IncomingCallModal from "../../components/modals/IncomingCallModal";
import { stompService } from "../../services/stompService";

type ChatRoomParams = {
    ChatRoom: {
        roomId: string;
        roomName: string;
        initialFocusMessageId?: string;
    };
};

const GroupChatScreen = () => {
    const route = useRoute<RouteProp<ChatRoomParams, 'ChatRoom'>>();
    const navigation = useNavigation<any>();
    const { t } = useTranslation();

    const { roomId, roomName: initialRoomName, initialFocusMessageId } = route.params;

    const { user } = useUserStore();
    const { showToast } = useToast();

    const {
        chatSettings,
        setChatSettings,
        notificationPreferences,
        setNotificationPreferences,
    } = useAppStore(useShallow((state) => ({
        chatSettings: state.chatSettings,
        setChatSettings: state.setChatSettings,
        notificationPreferences: state.notificationPreferences,
        setNotificationPreferences: state.setNotificationPreferences,
    })));

    const {
        activeBubbleRoomId, closeBubble,
        stompConnected,
        subscribeToRoom, unsubscribeFromRoom,
        userStatuses
    } = useChatStore();

    const { useRoomMembers, useRemoveRoomMembers, useLeaveRoom, useRoom } = useRooms();
    const { useCreateGroupCall } = useVideoCalls();

    const { data: members } = useRoomMembers(roomId);
    const { data: roomInfo } = useRoom(roomId);
    const { mutate: kickMember } = useRemoveRoomMembers();
    const { mutate: leaveRoom } = useLeaveRoom();
    const { mutate: createGroupCall, isPending: isCalling } = useCreateGroupCall();

    const [showSettings, setShowSettings] = useState(false);

    const syncSettingToBackend = async (
        updateChat: Partial<typeof chatSettings> = {},
        updateNotif: Partial<typeof notificationPreferences> = {}
    ) => {
        if (!user?.userId) return;
        const payload = {
            autoTranslate: updateChat.autoTranslate ?? chatSettings.autoTranslate,
            soundEnabled: updateNotif.soundEnabled ?? notificationPreferences.soundEnabled,
        };
        try {
            await privateClient.patch(`/api/v1/user-settings/${user.userId}`, payload);
        } catch (error) {
            console.error("Failed to sync settings", error);
        }
    };

    const toggleAutoTranslate = (value: boolean) => {
        setChatSettings({ autoTranslate: value });
        syncSettingToBackend({ autoTranslate: value });
    };

    const toggleSound = (value: boolean) => {
        setNotificationPreferences({ ...notificationPreferences, soundEnabled: value });
        syncSettingToBackend({}, { soundEnabled: value });
    };

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

    const renderActiveDot = (userId: string | undefined, size = 10) => {
        if (!userId) return null;
        const realtimeStatus = userStatuses[userId];
        const isOnline = realtimeStatus?.isOnline;

        if (!isOnline && isPrivateRoom && userId === targetMember?.userId) {
            if (roomInfo?.partnerIsOnline) {
                return <View style={[styles.headerActiveDot, { width: size, height: size, borderRadius: size / 2 }]} />;
            }
            return null;
        }

        if (isOnline) {
            return <View style={[styles.headerActiveDot, { width: size, height: size, borderRadius: size / 2 }]} />;
        }
        return null;
    };

    useEffect(() => {
        if (stompConnected && roomId) {
            subscribeToRoom(roomId);
            if (user?.userId) {
                try {
                    stompService.publish(`/app/chat/room/${roomId}/status`, {
                        userId: user.userId,
                        status: 'ONLINE'
                    });
                } catch (e) { }
            }
            return () => { unsubscribeFromRoom(roomId); };
        }
    }, [stompConnected, roomId, user?.userId]);

    useEffect(() => {
        if (activeBubbleRoomId === roomId) closeBubble();
    }, [roomId, activeBubbleRoomId, closeBubble]);

    const handleStartVideoCall = () => {
        if (!user?.userId) return;

        // UPDATED: Chỉ gửi roomId, không gửi danh sách members để tránh lỗi payload lớn hoặc validate
        createGroupCall({
            callerId: user.userId,
            roomId: roomId, // Source Chat Room ID
            videoCallType: VideoCallType.GROUP
        }, {
            onSuccess: (res) => {
                navigation.navigate('JitsiCallScreen', {
                    roomId: res.roomId,
                    videoCallId: res.videoCallId,
                    isCaller: true,
                    mode: 'GROUP'
                });
            },
            onError: (err) => {
                console.error("Start Call Failed:", err);
                showToast({ type: "error", message: t("error.start_call_failed") });
            }
        });
    };

    const handleLeaveRoom = () => {
        Alert.alert(t('common.confirm'), t('chat.leave_confirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('chat.leave'), style: 'destructive', onPress: () => leaveRoom({ roomId }, { onSuccess: () => { setShowSettings(false); navigation.navigate('ChatRoomListScreen'); } }) }
        ]);
    };

    const renderMemberItem = ({ item }: { item: MemberResponse }) => {
        const displayName = item.nickNameInRoom || item.nickname || item.fullname;
        const isSelf = item.userId === user?.userId;
        return (
            <View style={styles.memberItem}>
                <View>
                    <Image source={item.avatarUrl ? { uri: item.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')} style={styles.memberAvatar} />
                    {renderActiveDot(item.userId, 12)}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.memberName} numberOfLines={1}>{displayName} {isSelf && t('chat.you')}</Text>
                    <Text style={styles.memberRole}>{item.role === 'ADMIN' ? t('chat.admin') : t('chat.member')}</Text>
                </View>
                {isAdmin && !isSelf && !isPrivateRoom && (
                    <TouchableOpacity onPress={() => kickMember({ roomId, userIds: [item.userId] })} style={styles.iconBtn}>
                        <Icon name="remove-circle-outline" size={24} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const getHeaderStatusText = () => {
        if (isPrivateRoom && targetMember) {
            const userId = targetMember.userId;
            const realtimeStatus = userStatuses[userId];

            if (realtimeStatus?.isOnline) return t('chat.active_now');
            if (!realtimeStatus && roomInfo?.partnerIsOnline) return t('chat.active_now');

            const lastActive = realtimeStatus?.lastActiveAt || roomInfo?.partnerLastActiveText;
            if (lastActive) {
                if (realtimeStatus?.lastActiveAt) {
                    const diff = Date.now() - new Date(realtimeStatus.lastActiveAt).getTime();
                    const minutes = Math.floor(diff / 60000);
                    if (minutes < 1) return t('chat.active_now');
                    if (minutes < 60) return `${t('chat.active')} ${minutes}m ${t('chat.ago')}`;
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) return `${t('chat.active')} ${hours}h ${t('chat.ago')}`;
                }
                if (roomInfo?.partnerLastActiveText) return roomInfo.partnerLastActiveText;
                return t('chat.offline');
            }
            return roomInfo?.partnerLastActiveText || t('chat.offline');
        }
        return `${members?.length || 0} ${t('chat.members')}`;
    };

    return (
        <ScreenLayout>
            <IncomingCallModal />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <Icon name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    {isPrivateRoom && targetMember && (
                        <View style={{ position: 'relative', marginRight: 10 }}>
                            <Image source={targetMember.avatarUrl ? { uri: targetMember.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')} style={{ width: 32, height: 32, borderRadius: 16 }} />
                            {renderActiveDot(targetMember.userId)}
                        </View>
                    )}
                    <View style={{ alignItems: isPrivateRoom ? 'flex-start' : 'center', flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{displayRoomName}</Text>
                        <Text style={styles.headerSubtitle}>{getHeaderStatusText()}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleStartVideoCall} style={{ padding: 8 }} disabled={isCalling}>
                    <Icon name="videocam" size={24} color={isCalling ? "#9CA3AF" : "#4F46E5"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 8 }}>
                    <Icon name="settings" size={24} color="#4F46E5" />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
                <ChatInnerView
                    roomId={roomId}
                    isBubbleMode={false}
                    soundEnabled={notificationPreferences.soundEnabled}
                    initialFocusMessageId={initialFocusMessageId}
                    members={members}
                />
            </View>

            <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('chat.room_settings')}</Text>
                        <TouchableOpacity onPress={() => setShowSettings(false)}><Icon name="close" size={24} color="#374151" /></TouchableOpacity>
                    </View>
                    <ScrollView style={{ flex: 1 }}>
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>{t('settings.auto_translate')}</Text>
                                <Switch value={chatSettings.autoTranslate} onValueChange={toggleAutoTranslate} />
                            </View>
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>{t('settings.sound')}</Text>
                                <Switch value={notificationPreferences.soundEnabled} onValueChange={toggleSound} />
                            </View>
                        </View>
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>{t('chat.members')}</Text>
                            <FlatList data={members} renderItem={renderMemberItem} keyExtractor={item => item.userId} scrollEnabled={false} />
                        </View>
                        {!isPrivateRoom && (
                            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveRoom}>
                                <Text style={styles.leaveBtnText}>{t('chat.leave_room')}</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
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
    modalContainer: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: 30 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    sectionContainer: { marginTop: 16, backgroundColor: '#FFF', paddingVertical: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase' },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    settingLabel: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
    memberItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' },
    memberName: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
    memberRole: { fontSize: 12, color: '#9CA3AF' },
    iconBtn: { padding: 8 },
    leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', padding: 12, margin: 20, borderRadius: 8 },
    leaveBtnText: { color: '#FFF', fontWeight: 'bold' },
});

export default GroupChatScreen;