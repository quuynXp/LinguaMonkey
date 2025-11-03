import React, { useRef, useState, useMemo } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { createScaledSheet } from '../../utils/scaledStyles';
import instance from '../../api/axiosInstance'; // Import axios instance

// Kiểu dữ liệu trả về từ API /api/v1/rooms (RoomResponse)
interface ApiRoom {
  roomId: string;
  roomName: string;
  description: string;
  purpose: 'GROUP_CHAT' | 'PRIVATE_CHAT' | 'AI_CHAT';
  roomType: 'PUBLIC' | 'PRIVATE';
  creatorId: string;
  memberCount: number;
  maxMembers: number;
  createdAt: string; 
  // ... (Thêm các trường khác nếu bạn cần, vd: language, level)
}

interface Room {
  id: string;
  name: string;
  description: string;
  purpose: 'social' | 'learning' | 'ai'; // Map từ 'GROUP_CHAT'
  memberCount: number;
  maxMembers: number;
  language: string; // Giả định
  level: 'beginner' | 'intermediate' | 'advanced'; // Giả định
  isPrivate: boolean;
  createdBy: string; // Giả định
  createdAt: Date;
}

const mapApiRoomToComponent = (apiRoom: ApiRoom): Room => ({
  id: apiRoom.roomId,
  name: apiRoom.roomName,
  description: apiRoom.description || 'No description',
  purpose: apiRoom.purpose === 'GROUP_CHAT' ? 'social' : 'learning', // Map logic
  memberCount: apiRoom.memberCount,
  maxMembers: apiRoom.maxMembers,
  language: 'en', // TODO: API (RoomResponse) cần trả về
  level: 'beginner', // TODO: API (RoomResponse) cần trả về
  isPrivate: apiRoom.roomType === 'PRIVATE',
  createdBy: apiRoom.creatorId, // TODO: Cần fetch tên user
  createdAt: new Date(apiRoom.createdAt),
});


const ChatRoomListScreen = ({ navigation }) => {
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'GROUP_CHAT' | 'AI_CHAT'>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // --- THAY THẾ MOCK BẰNG useQuery ---
  const { data: apiRooms, isLoading: isLoadingRooms, isError } = useQuery({
    queryKey: ['rooms', selectedFilter, searchQuery],
    queryFn: async () => {
      const params = {
        page: 0,
        size: 20,
        purpose: selectedFilter === 'all' ? null : selectedFilter,
        roomName: searchQuery || null,
      };
      const response = await instance.get('/api/v1/rooms', { params });
      return response.data.result.content as ApiRoom[]; // Lấy content từ Page
    },
  });

  // Dùng useMemo để map dữ liệu API
  const rooms: Room[] = useMemo(() => {
    if (!apiRooms) return [];
    return apiRooms.map(mapApiRoomToComponent);
  }, [apiRooms]);
  
  // Logic filter cũ không cần nữa vì API đã filter
  // const filteredRooms = rooms; 

  const joinRoom = (room: Room) => {
    if (room.memberCount >= room.maxMembers) {
      Alert.alert(t('room.full'), t('room.full.message'));
      return;
    }
    
    // Sửa navigation: Chuyển sang GroupChatScreen (file bạn vừa sửa)
    navigation.navigate('GroupChat', { 
      roomId: room.id, 
      roomName: room.name 
    });
  };

  const joinRoomByCode = () => {
    if (roomCode.trim()) {
      // TODO: Thay bằng API call (GET /api/v1/rooms/{roomCode})
      const foundRoom = rooms.find(room => room.id === roomCode.trim());
      if (foundRoom) {
        setShowJoinModal(false);
        setRoomCode('');
        joinRoom(foundRoom);
      } else {
        Alert.alert(t('room.not.found'), t('room.not.found.message'));
      }
    }
  };

  // ... (Giữ nguyên các hàm helper: getLevelColor, getLevelText, getLanguageFlag) ...

  const renderRoom = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={styles.roomCard}
      onPress={() => joinRoom(item)}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleContainer}>
          <Text style={styles.roomFlag}>{getLanguageFlag(item.language)}</Text>
          <View style={styles.roomTitleInfo}>
            <Text style={styles.roomName}>{item.name}</Text>
            <Text style={styles.roomCreator}>{t('room.created.by')} {item.createdBy}</Text>
          </View>
        </View>

        <View style={styles.roomBadges}>
          <View style={[styles.levelBadge, { backgroundColor: `${getLevelColor(item.level)}20` }]}>
            <Text style={[styles.levelText, { color: getLevelColor(item.level) }]}>
              {getLevelText(item.level)}
            </Text>
          </View>
          <View style={[styles.purposeBadge, item.purpose === 'learning' ? styles.learningBadge : styles.socialBadge]}>
            <Text style={[styles.purposeText, item.purpose === 'learning' ? styles.learningText : styles.socialText]}>
              {item.purpose === 'learning' ? t('purpose.learning') : t('purpose.social')}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.roomDescription}>{item.description}</Text>

      <View style={styles.roomFooter}>
        <View style={styles.memberInfo}>
          <Icon name="group" size={16} color="#6B7280" />
          <Text style={styles.memberCount}>
            {item.memberCount}/{item.maxMembers} {t('members')}
          </Text>
        </View>

        <View style={styles.roomActions}>
          <Text style={styles.roomTime}>
            {item.createdAt.toLocaleDateString('vi-VN')}
          </Text>
          {item.isPrivate && (
            <Icon name="lock" size={16} color="#6B7280" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (filter: 'all' | 'GROUP_CHAT' | 'AI_CHAT', label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, selectedFilter === filter && styles.activeFilterButton]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[styles.filterButtonText, selectedFilter === filter && styles.activeFilterButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('room.list')}</Text>
        <TouchableOpacity onPress={() => setShowJoinModal(true)}>
          <Icon name="vpn-key" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('room.search')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery} // API sẽ tự động refetch
          />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          {renderFilterButton('all', t('all'))}
          {renderFilterButton('GROUP_CHAT', t('learning'))}
          {renderFilterButton('AI_CHAT', t('social'))} 
        </View>

        {/* Room List */}
        {isLoadingRooms ? (
          <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        ) : isError ? (
          <Text style={styles.emptyText}>{t('error.loading')}</Text>
        ) : (
          <FlatList
            data={rooms} // Dùng data thật
            renderItem={renderRoom}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.roomsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="chat-bubble-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>{t('room.empty')}</Text>
                <Text style={styles.emptySubtext}>{t('room.empty.subtext')}</Text>
              </View>
            }
          />
        )}

        {/* Create Room Button */}
        <TouchableOpacity
          style={styles.createRoomButton}
          onPress={() => navigation.navigate('CreateRoom')}
        >
          <Icon name="add" size={24} color="#FFFFFF" />
          <Text style={styles.createRoomButtonText}>{t('room.create')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Join by Code Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('room.join.by.code')}</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              {t('room.join.by.code.desc')}
            </Text>
            <TextInput
              style={styles.codeInput}
              placeholder={t('room.code.placeholder')}
              placeholderTextColor="#9CA3AF"
              value={roomCode}
              onChangeText={setRoomCode}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowJoinModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.joinButton, !roomCode.trim() && styles.joinButtonDisabled]}
                onPress={joinRoomByCode}
                disabled={!roomCode.trim()}
              >
                <Text style={[styles.joinButtonText, !roomCode.trim() && styles.joinButtonTextDisabled]}>
                  {t('join')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Dán styles từ file 'ChatRoomListScreen.ts' cũ của bạn vào đây
const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  filtersContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterButton: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  roomsList: {
    paddingBottom: 80,
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  roomTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  roomTitleInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  roomCreator: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  roomBadges: {
    gap: 4,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  purposeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  learningBadge: {
    backgroundColor: '#ECFDF5',
  },
  socialBadge: {
    backgroundColor: '#EEF2FF',
  },
  purposeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  learningText: {
    color: '#10B981',
  },
  socialText: {
    color: '#4F46E5',
  },
  roomDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  roomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  createRoomButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 8,
  },
  createRoomButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  joinButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  joinButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  joinButtonTextDisabled: {
    color: '#9CA3AF',
  },
});

export default ChatRoomListScreen;

function getLanguageFlag(language: string): React.ReactNode {
  throw new Error('Function not implemented.');
}
function getLevelColor(level: string) {
  throw new Error('Function not implemented.');
}

function getLevelText(level: string): React.ReactNode {
  throw new Error('Function not implemented.');
}

