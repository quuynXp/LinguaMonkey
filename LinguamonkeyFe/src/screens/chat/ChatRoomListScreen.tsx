import React, { useEffect, useCallback } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useJoinedRooms } from '../../hooks/useRoom';
import { useUserStore } from '../../stores/UserStore';
import { useChatStore } from '../../stores/ChatStore';
import { RoomResponse } from '../../types/dto';
import { RoomType } from '../../types/enums';
import DecryptedText from '../../components/common/DecryptedText';
import { roomSecurityService } from '../../services/RoomSecurityService';

const ChatRoomListScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const { messagesByRoom } = useChatStore();

  const { data: roomsData, isLoading, refetch } = useJoinedRooms({
    userId: user?.userId || '',
    page: 0,
    size: 50,
  });

  // Gọi lại API mỗi khi màn hình được focus để cập nhật trạng thái mới nhất
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (roomsData?.data) {
      roomsData.data.forEach((room: RoomResponse) => {
        if (room.secretKey && room.roomType !== RoomType.PRIVATE) {
          roomSecurityService.setKey(room.roomId, room.secretKey);
        }
      });
    }
  }, [roomsData]);

  // Cập nhật khi có tin nhắn mới trong store
  useEffect(() => {
    refetch();
  }, [messagesByRoom, refetch]);

  const rooms = (roomsData?.data || []) as RoomResponse[];

  const handleRoomPress = (room: RoomResponse) => {
    if (!room.roomId) {
      console.warn("Attempted to join room with undefined ID");
      return;
    }

    navigation.navigate('GroupChatScreen', {
      roomId: room.roomId,
      roomName: room.roomName,
      avatarUrl: room.avatarUrl,
      isPrivate: room.roomType === RoomType.PRIVATE
    });
  };

  const renderRoomItem = ({ item }: { item: RoomResponse }) => {
    const isPrivate = item.roomType === RoomType.PRIVATE;
    const isSelf = item.lastMessageSenderId === user?.userId;

    // FIX LOGIC: Kiểm tra kỹ cả 2 trường hợp key 'isRead' (đúng) và 'read' (do lỗi serialization cũ)
    // Nếu item.isRead là false HOẶC item.read là false -> Tức là chưa đọc
    const readStatus = item.isRead ?? (item as any).read;
    const isUnread = !isSelf && readStatus === false;

    const isMedia = item.lastMessageType && item.lastMessageType !== 'TEXT';

    return (
      <TouchableOpacity style={styles.roomItem} onPress={() => handleRoomPress(item)}>
        <View style={styles.avatarContainer}>
          <Image
            source={item.avatarUrl ? { uri: item.avatarUrl } : require('../../assets/images/ImagePlacehoderCourse.png')}
            style={styles.avatar}
          />
          {isPrivate && item.partnerIsOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.roomInfo}>
          <View style={styles.roomHeader}>
            <Text 
              style={[styles.roomName, isUnread && styles.unReadTextName]} 
              numberOfLines={1}
            >
              {item.roomName}
            </Text>
            {item.lastMessageTime && (
              <Text style={[styles.timeText, isUnread && styles.unReadTimeText]}>
                {new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>

          <View style={styles.lastMessageContainer}>
            {isPrivate && !item.partnerIsOnline && item.partnerLastActiveText && (
              <Text style={styles.statusText}>{item.partnerLastActiveText} • </Text>
            )}
            {item.lastMessage ? (
              isMedia ? (
                <Text
                  style={[styles.lastMessage, isUnread && styles.unReadMessage]}
                  numberOfLines={1}
                >
                  {item.lastMessageType === 'IMAGE' ? t('chat.sent_an_image') : 
                   item.lastMessageType === 'VIDEO' ? t('chat.sent_a_video') : 
                   item.lastMessageType === 'DOCUMENT' ? t('chat.sent_a_document') : 
                   t('chat.sent_an_attachment')}
                </Text>
              ) : (
                <DecryptedText
                  style={[styles.lastMessage, isUnread && styles.unReadMessage]}
                  numberOfLines={1}
                  content={item.lastMessage}
                  senderId={item.lastMessageSenderId}
                  senderEphemeralKey={item.lastMessageSenderEphemeralKey}
                  initializationVector={item.lastMessageInitializationVector}
                  selfContent={item.lastMessageSelfContent}
                  selfEphemeralKey={item.lastMessageSelfEphemeralKey}
                  selfInitializationVector={item.lastMessageSelfInitializationVector}
                  roomId={item.roomId}
                  roomType={item.roomType}
                  fallbackText={t('chat.encrypted_message')}
                />
              )
            ) : (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {t('chat.no_messages_yet')}
              </Text>
            )}
            
            {/* Dot xanh hiển thị chưa đọc */}
            {isUnread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('chat.inbox')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateRoomScreen')}>
            <Icon name="add-circle-outline" size={28} color="#4F46E5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('PublicRoomListScreen')} style={{ marginLeft: 12 }}>
            <Icon name="public" size={28} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderRoomItem}
          keyExtractor={(item) => item.roomId ? item.roomId.toString() : Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('chat.no_active_chats')}</Text>
              <Text style={styles.emptySubText}>{t('chat.start_conversation_hint')}</Text>
            </View>
          }
        />
      )}
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  listContent: { paddingVertical: 8 },
  roomItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0E7FF' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF'
  },
  roomInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  roomName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 8 },
  unReadTextName: { fontWeight: 'bold', color: '#000' }, // In đậm tên phòng
  timeText: { fontSize: 12, color: '#9CA3AF' },
  unReadTimeText: { fontWeight: 'bold', color: '#4F46E5' }, // In đậm thời gian
  lastMessageContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusText: { fontSize: 12, color: '#9CA3AF' },
  lastMessage: { fontSize: 14, color: '#6B7280', flex: 1, marginRight: 8 },
  unReadMessage: { fontWeight: 'bold', color: '#111827' }, // In đậm nội dung
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4F46E5', marginLeft: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
});

export default ChatRoomListScreen;