import React, { useEffect, useCallback, useState } from "react";
import { View, TouchableOpacity, Modal, Text, FlatList, Image, Alert, StyleSheet } from "react-native";
import { useRoute, RouteProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from "react-i18next";

import ChatInnerView from "../../components/chat/ChatInnerView";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { useChatStore } from "../../stores/ChatStore";
import { useUserStore } from "../../stores/UserStore";
import { useRooms } from "../../hooks/useRoom";
import { MemberResponse } from "../../types/dto";
import { RoomType } from "../../types/enums";

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
    const { roomId, roomName } = route.params;
    const { user } = useUserStore();

    // Hooks
    const { activeBubbleRoomId, closeBubble, initStompClient, disconnectStomp } = useChatStore();
    const { useRoomMembers, useRemoveRoomMembers, useLeaveRoom, useRoom } = useRooms();

    // Data
    const { data: members, isLoading: loadingMembers } = useRoomMembers(roomId);
    const { data: roomInfo } = useRoom(roomId); // Lấy thông tin phòng để check RoomType
    const { mutate: kickMember } = useRemoveRoomMembers();
    const { mutate: leaveRoom } = useLeaveRoom();

    // State
    const [showSettings, setShowSettings] = useState(false);

    // Logic xác định quyền và loại phòng
    const currentUserMember = members?.find(m => m.userId === user?.userId);
    const isAdmin = currentUserMember?.role === 'ADMIN' || currentUserMember?.isAdmin;
    const isPrivateRoom = roomInfo?.roomType === RoomType.PRIVATE || roomInfo?.roomType === RoomType.COUPLE;

    useFocusEffect(
        useCallback(() => {
            if (user) initStompClient();
            return () => disconnectStomp();
        }, [user, initStompClient, disconnectStomp])
    );

    useEffect(() => {
        if (activeBubbleRoomId === roomId) closeBubble();
    }, [roomId, activeBubbleRoomId, closeBubble]);

    const handleKickUser = (memberId: string, memberName: string) => {
        Alert.alert(
            t('common.confirm'),
            t('chat.kick_confirm', { name: memberName }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => kickMember({ roomId, userIds: [memberId] })
                }
            ]
        );
    };

    const handleLeaveRoom = () => {
        Alert.alert(
            t('common.confirm'),
            t('chat.leave_confirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('chat.leave'),
                    style: 'destructive',
                    onPress: () => {
                        leaveRoom({ roomId }, {
                            onSuccess: () => {
                                setShowSettings(false);
                                navigation.navigate('ChatRoomListScreen');
                            }
                        });
                    }
                }
            ]
        );
    };

    // Render Setting Item
    const renderMemberItem = ({ item }: { item: MemberResponse }) => {
        const displayName = item.nickNameInRoom || item.nickname || item.fullname;
        const isSelf = item.userId === user?.userId;

        return (
            <ScreenLayout style={styles.memberItem}>
                <Image
                    source={item.avatarUrl ? { uri: item.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')}
                    style={styles.memberAvatar}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.memberName} numberOfLines={1}>
                        {displayName} {isSelf && t('chat.you')}
                    </Text>
                    <Text style={styles.memberRole}>
                        {item.role === 'ADMIN' ? t('chat.admin') : t('chat.member')}
                    </Text>
                </View>

                {/* Nút Kick: Chỉ hiện khi là Admin, không phải chính mình VÀ KHÔNG PHẢI PHÒNG PRIVATE */}
                {isAdmin && !isSelf && !isPrivateRoom && (
                    <TouchableOpacity onPress={() => handleKickUser(item.userId, displayName)} style={styles.iconBtn}>
                        <Icon name="remove-circle-outline" size={24} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </ScreenLayout>
        );
    };

    return (
        <ScreenLayout>
            {/* Header Custom */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <Icon name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{roomName}</Text>
                <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 8 }}>
                    <Icon name="settings" size={24} color="#4F46E5" />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
                <ChatInnerView roomId={roomId} initialRoomName={roomName} />
            </View>

            {/* Settings Modal */}
            <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('chat.room_settings')}</Text>
                        <TouchableOpacity onPress={() => setShowSettings(false)}>
                            <Icon name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('chat.members')} ({members?.length || 0})</Text>
                        {/* Ẩn nút Add Member nếu là phòng Private */}
                        {isAdmin && !isPrivateRoom && (
                            <TouchableOpacity onPress={() => {/* Navigate to Add Member Screen/Modal */ }}>
                                <Icon name="person-add" size={22} color="#4F46E5" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        data={members}
                        renderItem={renderMemberItem}
                        keyExtractor={item => item.userId}
                        contentContainerStyle={{ padding: 16 }}
                    />

                    {/* Ẩn nút Leave Room nếu là phòng Private */}
                    {!isPrivateRoom && (
                        <View style={styles.footerActions}>
                            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveRoom}>
                                <Icon name="logout" size={20} color="#FFF" />
                                <Text style={styles.leaveBtnText}>{t('chat.leave_room')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
    headerTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
    modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    memberItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8 },
    memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' },
    memberName: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
    memberRole: { fontSize: 12, color: '#9CA3AF' },
    iconBtn: { padding: 8 },
    footerActions: { padding: 20, borderTopWidth: 1, borderColor: '#EEE', backgroundColor: '#FFF' },
    leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', padding: 12, borderRadius: 8 },
    leaveBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 }
});

export default GroupChatScreen;