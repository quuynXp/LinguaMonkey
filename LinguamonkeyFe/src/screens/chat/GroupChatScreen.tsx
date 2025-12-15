import React, { useEffect, useState, useMemo } from "react";
import { View, TouchableOpacity, Modal, Text, FlatList, Image, Alert, StyleSheet, Switch, ScrollView, ActivityIndicator } from "react-native";
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
import { gotoTab } from "../../utils/navigationRef";
import type { Room } from "../../types/entity";

type ReturnToParams = {
    tab: string;
    screen: string;
    params: any;
}

type ChatRoomParams = {
    ChatRoom: {
        roomId: string;
        roomName: string;
        initialFocusMessageId?: string;
        partnerIsOnline?: boolean;
        partnerLastActiveText?: string;
        returnTo?: ReturnToParams; // Added param
    };
};

const GroupChatScreen = () => {
    const route = useRoute<RouteProp<ChatRoomParams, 'ChatRoom'>>();
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { roomId, roomName: initialRoomName, initialFocusMessageId, partnerIsOnline: initialIsOnline, partnerLastActiveText: initialLastActive, returnTo } = route.params;

    const { user } = useUserStore();
    const { showToast } = useToast();

    const { chatSettings, setChatSettings, notificationPreferences, setNotificationPreferences } = useAppStore(useShallow((state) => ({
        chatSettings: state.chatSettings, setChatSettings: state.setChatSettings, notificationPreferences: state.notificationPreferences, setNotificationPreferences: state.setNotificationPreferences,
    })));

    const { activeBubbleRoomId, closeBubble, stompConnected, subscribeToRoom, unsubscribeFromRoom, userStatuses, upsertRoom, incomingCallRequest } = useChatStore();
    const { useRoomMembers, useRemoveRoomMembers, useLeaveRoom, useRoom } = useRooms();
    const { useCreateGroupCall } = useVideoCalls();

    const { data: members } = useRoomMembers(roomId);
    const { data: roomInfo } = useRoom(roomId);
    const { mutate: kickMember } = useRemoveRoomMembers();
    const { mutate: leaveRoom } = useLeaveRoom();
    const { mutate: createGroupCall, isPending: isCalling } = useCreateGroupCall();

    const [showSettings, setShowSettings] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [isStartingCall, setIsStartingCall] = useState(false);
    const [activeCallPopup, setActiveCallPopup] = useState<{ visible: boolean, callerName: string, videoCallId: string } | null>(null);

    useEffect(() => {
        if (roomInfo) {
            const roomEntity: Room = { ...roomInfo, isDeleted: false, members: (roomInfo.members || []) as any };
            upsertRoom(roomEntity);
        }
    }, [roomInfo, upsertRoom]);

    // LISTEN FOR ACTIVE CALL IN GROUP (Simple Stomp logic or reuse incomingCallRequest if generalized)
    useEffect(() => {
        if (incomingCallRequest && incomingCallRequest.roomId === roomId && incomingCallRequest.callerId !== user?.userId) {
            // If we are in the room and a call comes in for this room, show the small popup
            // We use incomingCallRequest from Store which listens to /user/queue/notifications or /topic/room
            const callerMember = members?.find(m => m.userId === incomingCallRequest.callerId);
            const callerName = callerMember?.nickname || callerMember?.fullname || 'Someone';
            setActiveCallPopup({ visible: true, callerName, videoCallId: incomingCallRequest.videoCallId });
        } else {
            setActiveCallPopup(null);
        }
    }, [incomingCallRequest, roomId, members, user?.userId]);

    // LOGIC FIX: Handle Back Gesture / Button when coming from another Tab (e.g. CourseDetails)
    useEffect(() => {
        if (!returnTo) return;

        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            // Only intercept 'GO_BACK' action (which includes swipe back)
            if (e.data.action.type === 'GO_BACK') {
                e.preventDefault(); // Stop default pop
                // Redirect to the source Tab/Screen
                gotoTab(returnTo.tab, returnTo.screen, returnTo.params);
            }
        });

        return unsubscribe;
    }, [navigation, returnTo]);

    const handleJoinActiveCall = () => {
        if (!activeCallPopup) return;
        setActiveCallPopup(null);
        gotoTab("ChatStack", 'WebRTCCallScreen', {
            roomId: roomId,
            videoCallId: activeCallPopup.videoCallId,
            isCaller: false,
            mode: 'GROUP'
        });
    };

    const syncSettingToBackend = async (updateChat: Partial<typeof chatSettings> = {}, updateNotif: Partial<typeof notificationPreferences> = {}) => {
        if (!user?.userId) return;
        const payload = { autoTranslate: updateChat.autoTranslate ?? chatSettings.autoTranslate, soundEnabled: updateNotif.soundEnabled ?? notificationPreferences.soundEnabled };
        try { await privateClient.patch(`/api/v1/user-settings/${user.userId}`, payload); } catch (error) { console.error("Failed to sync settings", error); }
    };
    const toggleAutoTranslate = (value: boolean) => { setChatSettings({ autoTranslate: value }); syncSettingToBackend({ autoTranslate: value }); };
    const toggleSound = (value: boolean) => { setNotificationPreferences({ ...notificationPreferences, soundEnabled: value }); syncSettingToBackend({}, { soundEnabled: value }); };

    const currentUserMember = members?.find(m => m.userId === user?.userId);
    const isAdmin = currentUserMember?.role === 'ADMIN' || currentUserMember?.isAdmin;
    const isPrivateRoom = roomInfo?.roomType === RoomType.PRIVATE || roomInfo?.roomType === RoomType.COUPLE;
    const targetMember = useMemo(() => (!isPrivateRoom || !members) ? null : members.find(m => m.userId !== user?.userId), [members, isPrivateRoom, user?.userId]);
    const displayRoomName = useMemo(() => (isPrivateRoom && targetMember) ? (targetMember.nickNameInRoom || targetMember.nickname || targetMember.fullname) : (roomInfo?.roomName || initialRoomName), [isPrivateRoom, targetMember, roomInfo, initialRoomName]);
    const isPartnerOnline = useMemo(() => (roomInfo?.partnerIsOnline !== undefined) ? roomInfo.partnerIsOnline : (initialIsOnline ?? false), [roomInfo, initialIsOnline]);
    const partnerLastActive = useMemo(() => roomInfo?.partnerLastActiveText || initialLastActive, [roomInfo, initialLastActive]);

    const renderHeaderStatusDot = () => (isPrivateRoom && isPartnerOnline) ? <View style={styles.headerActiveDot} /> : null;
    const renderMemberDot = (userId: string) => {
        const status = userStatuses[userId];
        const isOnline = status?.isOnline || (userId === targetMember?.userId && isPartnerOnline);
        return isOnline ? <View style={[styles.headerActiveDot, { width: 12, height: 12, borderRadius: 6 }]} /> : null;
    };
    const getHeaderStatusText = () => (isPrivateRoom && targetMember) ? (isPartnerOnline ? t('chat.active_now') : (partnerLastActive || t('chat.offline'))) : `${members?.length || 0} ${t('chat.members')}`;

    useEffect(() => {
        if (stompConnected && roomId) {
            subscribeToRoom(roomId);
            if (user?.userId) try { stompService.publish(`/app/chat/room/${roomId}/status`, { userId: user.userId, status: 'ONLINE' }); } catch (e) { }
            return () => { unsubscribeFromRoom(roomId); };
        }
    }, [stompConnected, roomId, user?.userId]);

    useEffect(() => { if (activeBubbleRoomId === roomId) closeBubble(); }, [roomId, activeBubbleRoomId, closeBubble]);

    const handleVideoIconPress = () => {
        if (isPrivateRoom) handleStartVideoCall([]);
        else { setSelectedMemberIds([]); setShowInviteModal(true); }
    };

    const handleToggleMemberSelect = (userId: string) => setSelectedMemberIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);

    const handleStartVideoCall = (invitees: string[]) => {
        if (!user?.userId || !roomId) { showToast({ type: "error", message: t("error.start_call_failed") }); return; }
        setIsStartingCall(true);
        createGroupCall({ callerId: user.userId, roomId: roomId, videoCallType: 'GROUP' as unknown as VideoCallType }, {
            onSuccess: async (res) => {
                if (invitees.length > 0) {
                    try {
                        const promises = invitees.map(inviteeId => privateClient.post(`/api/v1/video-calls/${res.videoCallId}/participants`, null, { params: { userId: inviteeId } }));
                        await Promise.all(promises);
                    } catch (err) { console.error("Failed to add participants", err); }
                }
                setIsStartingCall(false); setShowInviteModal(false);
                gotoTab("ChatStack", 'WebRTCCallScreen', { roomId: res.roomId, videoCallId: res.videoCallId, isCaller: true, mode: 'GROUP' });
            },
            onError: (err: any) => { setIsStartingCall(false); showToast({ type: "error", message: t("error.start_call_failed") }); }
        });
    };

    const handleLeaveRoom = () => Alert.alert(t('common.confirm'), t('chat.leave_confirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('chat.leave'), style: 'destructive', onPress: () => leaveRoom({ roomId }, { onSuccess: () => { setShowSettings(false); navigation.navigate('ChatRoomListScreen'); } }) }]);

    // Function to trigger back manually (for back button in header)
    const handleGoBack = () => {
        if (returnTo) {
            gotoTab(returnTo.tab, returnTo.screen, returnTo.params);
        } else if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('ChatRoomListScreen');
        }
    };

    const renderMemberItem = ({ item }: { item: MemberResponse }) => {
        const displayName = item.nickNameInRoom || item.nickname || item.fullname;
        const isSelf = item.userId === user?.userId;
        return (
            <View style={styles.memberItem}>
                <View><Image source={item.avatarUrl ? { uri: item.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')} style={styles.memberAvatar} />{renderMemberDot(item.userId)}</View>
                <View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.memberName} numberOfLines={1}>{displayName} {isSelf && t('chat.you')}</Text><Text style={styles.memberRole}>{item.role === 'ADMIN' ? t('chat.admin') : t('chat.member')}</Text></View>
                {isAdmin && !isSelf && !isPrivateRoom && (<TouchableOpacity onPress={() => kickMember({ roomId, userIds: [item.userId] })} style={styles.iconBtn}><Icon name="remove-circle-outline" size={24} color="#EF4444" /></TouchableOpacity>)}
            </View>
        );
    };

    const renderInviteItem = ({ item }: { item: MemberResponse }) => {
        if (item.userId === user?.userId) return null;
        const displayName = item.nickNameInRoom || item.nickname || item.fullname;
        const isSelected = selectedMemberIds.includes(item.userId);
        return (
            <TouchableOpacity style={[styles.memberItem, { backgroundColor: isSelected ? '#F0F9FF' : 'transparent' }]} onPress={() => handleToggleMemberSelect(item.userId)}>
                <View><Image source={item.avatarUrl ? { uri: item.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')} style={styles.memberAvatar} />{renderMemberDot(item.userId)}</View>
                <View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.memberName} numberOfLines={1}>{displayName}</Text><Text style={styles.memberRole}>{item.role === 'ADMIN' ? t('chat.admin') : t('chat.member')}</Text></View>
                <View style={styles.checkbox}>{isSelected ? <Icon name="check-circle" size={24} color="#3B82F6" /> : <Icon name="radio-button-unchecked" size={24} color="#D1D5DB" />}</View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenLayout>
            <IncomingCallModal />

            {/* JOIN CALL POPUP (Overlay) */}
            {activeCallPopup && (
                <View style={styles.joinCallPopup}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#10B981', padding: 8, borderRadius: 20 }}>
                            <Icon name="videocam" size={20} color="#FFF" />
                        </View>
                        <View style={{ marginLeft: 10 }}>
                            <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{activeCallPopup.callerName} started a call</Text>
                            <Text style={{ color: '#E0F2FE', fontSize: 12 }}>Click to join now</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.joinBtn} onPress={handleJoinActiveCall}>
                        <Text style={{ color: '#059669', fontWeight: 'bold' }}>JOIN</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Icon name="arrow-back" size={26} color="#4F46E5" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    {isPrivateRoom && targetMember && (<View style={{ position: 'relative', marginRight: 10 }}><Image source={targetMember.avatarUrl ? { uri: targetMember.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')} style={{ width: 36, height: 36, borderRadius: 18 }} />{renderHeaderStatusDot()}</View>)}
                    <View style={{ alignItems: isPrivateRoom ? 'flex-start' : 'center', flex: 1 }}><Text style={styles.headerTitle} numberOfLines={1}>{displayRoomName}</Text><Text style={styles.headerSubtitle}>{getHeaderStatusText()}</Text></View>
                </View>
                <TouchableOpacity onPress={handleVideoIconPress} style={{ padding: 8 }} disabled={isCalling || isStartingCall}><Icon name="videocam" size={26} color={(isCalling || isStartingCall) ? "#9CA3AF" : "#4F46E5"} /></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 8 }}><Icon name="info-outline" size={26} color="#4F46E5" /></TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
                <ChatInnerView roomId={roomId} isBubbleMode={false} soundEnabled={notificationPreferences.soundEnabled} initialFocusMessageId={initialFocusMessageId} members={members} />
            </View>

            <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t('chat.room_settings')}</Text><TouchableOpacity onPress={() => setShowSettings(false)}><Icon name="close" size={24} color="#374151" /></TouchableOpacity></View>
                    <ScrollView style={{ flex: 1 }}>
                        <View style={styles.sectionContainer}><Text style={styles.sectionTitle}>{t('settings.preferences')}</Text><View style={styles.settingRow}><Text style={styles.settingLabel}>{t('settings.auto_translate')}</Text><Switch value={chatSettings.autoTranslate} onValueChange={toggleAutoTranslate} /></View><View style={styles.settingRow}><Text style={styles.settingLabel}>{t('settings.sound')}</Text><Switch value={notificationPreferences.soundEnabled} onValueChange={toggleSound} /></View></View>
                        <View style={styles.sectionContainer}><Text style={styles.sectionTitle}>{t('chat.members')}</Text><FlatList data={members} renderItem={renderMemberItem} keyExtractor={item => item.userId} scrollEnabled={false} /></View>
                        {!isPrivateRoom && (<TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveRoom}><Text style={styles.leaveBtnText}>{t('chat.leave_room')}</Text></TouchableOpacity>)}
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={showInviteModal} animationType="slide" transparent={true} onRequestClose={() => setShowInviteModal(false)}>
                <View style={styles.inviteModalOverlay}><View style={styles.inviteModalContent}>
                    <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t('chat.invite_to_call')}</Text><TouchableOpacity onPress={() => setShowInviteModal(false)}><Icon name="close" size={24} color="#374151" /></TouchableOpacity></View>
                    <Text style={{ paddingHorizontal: 20, paddingBottom: 10, color: '#6B7280' }}>{t('chat.select_members_to_invite')}</Text>
                    <FlatList data={members} renderItem={renderInviteItem} keyExtractor={item => item.userId} style={{ maxHeight: 400 }} />
                    <View style={styles.inviteFooter}><TouchableOpacity style={[styles.startCallBtn, { opacity: isStartingCall ? 0.7 : 1 }]} onPress={() => handleStartVideoCall(selectedMemberIds)} disabled={isStartingCall}>{isStartingCall ? (<ActivityIndicator color="#FFF" style={{ marginRight: 8 }} />) : (<Icon name="videocam" size={20} color="#FFF" style={{ marginRight: 8 }} />)}<Text style={styles.startCallText}>{t('chat.start_call')}</Text></TouchableOpacity></View>
                </View></View>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
    headerSubtitle: { fontSize: 12, color: '#10B981', fontWeight: '500' },
    headerActiveDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF' },
    backButton: { padding: 8, marginRight: 4 },
    modalContainer: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: 30 },
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
    inviteModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    inviteModalContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 16, maxHeight: '80%', overflow: 'hidden' },
    inviteFooter: { padding: 16, borderTopWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#F9FAFB' },
    checkbox: { marginLeft: 'auto', padding: 4 },
    startCallBtn: { flexDirection: 'row', backgroundColor: '#4F46E5', paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    startCallText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    joinCallPopup: { position: 'absolute', top: 100, alignSelf: 'center', width: '90%', backgroundColor: '#1F2937', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
    joinBtn: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }
});

export default GroupChatScreen;