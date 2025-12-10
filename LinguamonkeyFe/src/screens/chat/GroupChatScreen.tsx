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
        // Nhận thêm params này từ màn hình danh sách để hiển thị ngay lập tức
        partnerIsOnline?: boolean;
        partnerLastActiveText?: string;
    };
};

const GroupChatScreen = () => {
    const route = useRoute<RouteProp<ChatRoomParams, 'ChatRoom'>>();
    const navigation = useNavigation<any>();
    const { t } = useTranslation();

    // Lấy thêm partnerIsOnline từ params nếu có
    const { roomId, roomName: initialRoomName, initialFocusMessageId, partnerIsOnline: initialIsOnline, partnerLastActiveText: initialLastActive } = route.params;

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
        userStatuses,
        updateUserStatus
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

    // --- LOGIC TRẠNG THÁI ONLINE/OFFLINE (SỬA LẠI) ---

    // 1. Tính toán trạng thái Online chuẩn duy nhất
    const isTargetOnline = useMemo(() => {
        if (!isPrivateRoom || !targetMember) return false;
        const userId = targetMember.userId;

        // Ưu tiên 1: Realtime từ WebSocket Store (Chính xác nhất khi đang chat)
        if (userStatuses[userId]?.isOnline !== undefined) {
            return userStatuses[userId].isOnline;
        }

        // Ưu tiên 2: Dữ liệu API chi tiết phòng (Vừa load xong)
        if (roomInfo?.partnerIsOnline !== undefined) {
            return roomInfo.partnerIsOnline;
        }

        // Ưu tiên 3: Dữ liệu truyền từ màn hình danh sách (Hiển thị ngay lập tức khi chưa load xong API)
        if (initialIsOnline !== undefined) {
            return initialIsOnline;
        }

        return false;
    }, [isPrivateRoom, targetMember, userStatuses, roomInfo, initialIsOnline]);

    // 2. Đồng bộ API vào Store (để logic Realtime luôn có dữ liệu nền)
    useEffect(() => {
        if (roomInfo && isPrivateRoom && targetMember) {
            // Nếu Store chưa có dữ liệu, cập nhật từ API vào Store ngay
            if (userStatuses[targetMember.userId]?.isOnline === undefined) {
                updateUserStatus(targetMember.userId, roomInfo.partnerIsOnline, undefined);
            }
        }
    }, [roomInfo, isPrivateRoom, targetMember, updateUserStatus, userStatuses]);


    // 3. Render Dot (Sử dụng biến isTargetOnline đã tính toán)
    const renderHeaderStatusDot = () => {
        if (isTargetOnline) {
            return <View style={[styles.headerActiveDot, { width: 10, height: 10, borderRadius: 5 }]} />;
        }
        return null;
    };

    // Render Dot trong danh sách thành viên (Modal setting)
    const renderMemberDot = (userId: string) => {
        // Logic tương tự nhưng cho danh sách member
        const status = userStatuses[userId];
        const isOnline = status?.isOnline || (userId === targetMember?.userId && isTargetOnline);
        
        if (isOnline) {
            return <View style={[styles.headerActiveDot, { width: 12, height: 12, borderRadius: 6 }]} />;
        }
        return null;
    };

    // 4. Render Text Trạng thái (Học theo ChatRoomListScreen)
    const getHeaderStatusText = () => {
        if (isPrivateRoom && targetMember) {
            // CASE 1: Đang Online -> Hiển thị "Active now"
            if (isTargetOnline) return t('chat.active_now');

            // CASE 2: Offline - Kiểm tra WebSocket Store có thời gian last active mới nhất không?
            const realtimeLastActive = userStatuses[targetMember.userId]?.lastActiveAt;
            if (realtimeLastActive) {
                const diff = Date.now() - new Date(realtimeLastActive).getTime();
                const minutes = Math.floor(diff / 60000);
                if (minutes < 1) return t('chat.active_now');
                if (minutes < 60) return `${t('chat.active')} ${minutes}m ${t('chat.ago')}`;
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return `${t('chat.active')} ${hours}h ${t('chat.ago')}`;
            }

            // CASE 3: Offline - Fallback về text từ Server (giống ChatRoomListScreen)
            // Đây là dòng quan trọng để khớp với màn hình danh sách
            const serverText = roomInfo?.partnerLastActiveText || initialLastActive;
            if (serverText) return serverText;

            return t('chat.offline');
        }
        return `${members?.length || 0} ${t('chat.members')}`;
    };

    // --- KẾT THÚC LOGIC TRẠNG THÁI ---

    useEffect(() => {
        if (stompConnected && roomId) {
            subscribeToRoom(roomId);
            if (user?.userId) {
                try {
                    // Báo mình đang online khi vào phòng
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
        createGroupCall({
            callerId: user.userId,
            roomId: roomId,
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
                    {renderMemberDot(item.userId)}
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
                            <Image source={targetMember.avatarUrl ? { uri: targetMember.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')} style={{ width: 36, height: 36, borderRadius: 18 }} />
                            {/* Dùng chung logic hiển thị dot */}
                            {renderHeaderStatusDot()}
                        </View>
                    )}
                    <View style={{ alignItems: isPrivateRoom ? 'flex-start' : 'center', flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{displayRoomName}</Text>
                        <Text style={styles.headerSubtitle}>{getHeaderStatusText()}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleStartVideoCall} style={{ padding: 8 }} disabled={isCalling}>
                    <Icon name="videocam" size={26} color={isCalling ? "#9CA3AF" : "#4F46E5"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 8 }}>
                    <Icon name="info-outline" size={26} color="#4F46E5" />
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F3F4F6', elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1 },
    headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
    headerSubtitle: { fontSize: 12, color: '#10B981', fontWeight: '500' },
    headerActiveDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF' },
    modalContainer: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: 0 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    sectionContainer: { marginTop: 20, backgroundColor: '#FFF', paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', paddingHorizontal: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    settingLabel: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
    memberItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB' },
    memberName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
    memberRole: { fontSize: 12, color: '#6B7280' },
    iconBtn: { padding: 10 },
    leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 16, margin: 20, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA' },
    leaveBtnText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
});

export default GroupChatScreen;