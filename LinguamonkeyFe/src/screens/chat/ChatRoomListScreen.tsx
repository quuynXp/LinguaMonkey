import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useChatStore } from "../../stores/ChatStore";

interface Room {
  id: string;
  name: string;
  description: string;
  purpose: 'social' | 'learning';
  memberCount: number;
  maxMembers: number;
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isPrivate: boolean;
  createdBy: string;
  createdAt: Date;
}

const ChatRoomListScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([
    {
      id: '1',
      name: 'Học tiếng Anh cơ bản',
      description: 'Phòng dành cho người mới bắt đầu học tiếng Anh',
      purpose: 'learning',
      memberCount: 12,
      maxMembers: 20,
      language: 'en',
      level: 'beginner',
      isPrivate: false,
      createdBy: 'Teacher Anna',
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      id: '2',
      name: 'Chinese Culture Chat',
      description: 'Discuss Chinese culture and traditions',
      purpose: 'social',
      memberCount: 8,
      maxMembers: 15,
      language: 'zh',
      level: 'intermediate',
      isPrivate: false,
      createdBy: 'Li Wei',
      createdAt: new Date(Date.now() - 172800000),
    },
    {
      id: '3',
      name: 'Advanced English Practice',
      description: 'For advanced English learners',
      purpose: 'learning',
      memberCount: 15,
      maxMembers: 25,
      language: 'en',
      level: 'advanced',
      isPrivate: false,
      createdBy: 'John Smith',
      createdAt: new Date(Date.now() - 259200000),
    },
    {
      id: '4',
      name: 'Giao lưu tiếng Việt',
      description: 'Phòng chat cho người nước ngoài học tiếng Việt',
      purpose: 'social',
      memberCount: 6,
      maxMembers: 12,
      language: 'vi',
      level: 'beginner',
      isPrivate: false,
      createdBy: 'Minh Nguyen',
      createdAt: new Date(Date.now() - 345600000),
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'learning' | 'social'>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const activities = useChatStore(state => state.activities)
  const stats = useChatStore(state => state.stats)

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || room.purpose === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const joinRoom = (room: Room) => {
    if (room.memberCount >= room.maxMembers) {
      Alert.alert(t('room.full'), t('room.full.message'));
      return;
    }

    Alert.alert(
      t('room.join'),
      t('room.join.confirm', { name: room.name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('join'),
          onPress: () => {
            navigation.navigate('UserChat', { room });
          },
        },
      ]
    );
  };

  const joinRoomByCode = () => {
    if (roomCode.trim()) {
      // Simulate finding room by code
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return '#10B981';
      case 'intermediate': return '#F59E0B';
      case 'advanced': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return t('level.beginner');
      case 'intermediate': return t('level.intermediate');
      case 'advanced': return t('level.advanced');
      default: return level;
    }
  };

  const getLanguageFlag = (language: string) => {
    switch (language) {
      case 'en': return '🇺🇸';
      case 'zh': return '🇨🇳';
      case 'vi': return '🇻🇳';
      default: return '🌐';
    }
  };

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

  const renderFilterButton = (filter: 'all' | 'learning' | 'social', label: string) => (
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
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          {renderFilterButton('all', t('all'))}
          {renderFilterButton('learning', t('learning'))}
          {renderFilterButton('social', t('social'))}
        </View>

        {/* Room List */}
        <FlatList
          data={filteredRooms}
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

const styles = StyleSheet.create({
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