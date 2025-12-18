import React, { useEffect } from 'react';
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
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useJoinedRooms } from '../../hooks/useRoom';
import { useUserStore } from '../../stores/UserStore';
import { useChatStore } from '../../stores/ChatStore';
import { RoomResponse } from '../../types/dto';
import { RoomType } from '../../types/enums';
import DecryptedText from '../../components/common/DecryptedText';

const ChatRoomListScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  
  // FIX: Xóa dòng gọi hook factory cũ: const { useJoinedRooms } = useRooms();
  const { messagesByRoom } = useChatStore();

  // Gọi trực tiếp hook đã import
  const { data: roomsData, isLoading, refetch } = useJoinedRooms({
    userId: user?.userId || '',
    page: 0,
    size: 50,
  });

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
    const isUnread = !isSelf && item.read === false;

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
            <Text style={[styles.roomName, isUnread && styles.unReadText]} numberOfLines={1}>{item.roomName}</Text>
            {item.lastMessageTime && (
              <Text style={[styles.timeText, isUnread && styles.unReadText]}>
                {new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>

          <View style={styles.lastMessageContainer}>
            {isPrivate && !item.partnerIsOnline && item.partnerLastActiveText && (
              <Text style={styles.statusText}>{item.partnerLastActiveText} • </Text>
            )}
            <DecryptedText
              style={[styles.lastMessage, isUnread && styles.unReadMessage]}
              numberOfLines={1}
              content={item.lastMessage || ''}
              senderId={item.lastMessageSenderId}
              senderEphemeralKey={item.lastMessageSenderEphemeralKey}
              initializationVector={item.lastMessageInitializationVector}
              selfContent={item.lastMessageSelfContent}
              selfEphemeralKey={item.lastMessageSelfEphemeralKey}
              selfInitializationVector={item.lastMessageSelfInitializationVector}
              fallbackText={t('chat.sent_an_attachment')}
            />
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
  timeText: { fontSize: 12, color: '#9CA3AF' },
  lastMessageContainer: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 12, color: '#9CA3AF' },
  lastMessage: { fontSize: 14, color: '#6B7280', flex: 1 },
  unReadText: { fontWeight: '700', color: '#111827' },
  unReadMessage: { fontWeight: '600', color: '#111827' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
});

export default ChatRoomListScreen;