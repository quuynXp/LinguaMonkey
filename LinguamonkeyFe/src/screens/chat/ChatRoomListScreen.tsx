import React from 'react';
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
import { useRooms } from '../../hooks/useRoom';
import { useUserStore } from '../../stores/UserStore';
import { RoomResponse } from '../../types/dto';
import { RoomType } from '../../types/enums';

const ChatRoomListScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const { useJoinedRooms } = useRooms();

  // Load danh sách phòng user đã tham gia
  const { data: roomsData, isLoading, refetch } = useJoinedRooms({
    userId: user?.userId || '',
    page: 0,
    size: 50,
  });

  const rooms = (roomsData?.data || []) as RoomResponse[];

  const handleRoomPress = (room: RoomResponse) => {
    navigation.navigate('GroupChatScreen', {
      roomId: room.roomId,
      roomName: room.roomName, // RoomName đã được xử lý ở backend (Tên đối phương nếu là Private)
    });
  };

  const renderRoomItem = ({ item }: { item: RoomResponse }) => {
    const isPrivate = item.roomType === RoomType.PRIVATE;
    // Backend trả về avatarUrl: Nếu Private là avatar đối phương, Group là avatar creator hoặc null
    const avatarSource = item.avatarUrl
      ? { uri: item.avatarUrl }
      : require('../../assets/images/ImagePlacehoderCourse.png');

    return (
      <TouchableOpacity style={styles.roomItem} onPress={() => handleRoomPress(item)}>
        <View style={styles.avatarContainer}>
          <Image source={avatarSource} style={styles.avatar} />
          {isPrivate && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.roomInfo}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomName} numberOfLines={1}>{item.roomName}</Text>
            {item.lastMessageTime && (
              <Text style={styles.timeText}>
                {new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>

          <View style={styles.lastMessageContainer}>
            <Text style={[styles.lastMessage, !item.lastMessage && styles.italic]} numberOfLines={1}>
              {item.lastMessage || t('chat.no_messages')}
            </Text>
            {item.memberCount > 2 && item.roomType !== RoomType.PRIVATE && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.memberCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout style={styles.container}>
      {/* Header Custom */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('chat.inbox')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateRoomScreen')}>
            <Icon name="add-circle-outline" size={28} color="#4F46E5" />
          </TouchableOpacity>
          {/* Nút Quả Cầu sang Public Lobby */}
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
          keyExtractor={(item) => item.roomId}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('chat.no_joined_rooms')}</Text>
              <Text style={styles.emptySubText}>{t('chat.join_public_hint')}</Text>
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
  lastMessageContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#6B7280', flex: 1 },
  italic: { fontStyle: 'italic' },
  badge: { backgroundColor: '#E0E7FF', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: '#4F46E5', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
});

export default ChatRoomListScreen;
