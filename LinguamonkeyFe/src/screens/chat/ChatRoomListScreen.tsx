import React, { useRef, useState, useEffect } from 'react';
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
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useRooms } from '../../hooks/useRoom';
import { RoomResponse } from '../../types/dto';
import { RoomPurpose, RoomType } from '../../types/enums';

const getLanguageFlag = (language?: string): string => {
  switch (language?.toLowerCase()) {
    case 'en': return '🇬🇧';
    case 'vi': return '🇻🇳';
    case 'jp': return '🇯🇵';
    case 'kr': return '🇰🇷';
    case 'cn': return '🇨🇳';
    default: return '🌐';
  }
};

const getLevelColor = (level?: string): string => {
  switch (level?.toLowerCase()) {
    case 'beginner': return '#10B981';
    case 'intermediate': return '#F59E0B';
    case 'advanced': return '#EF4444';
    default: return '#6B7280';
  }
};

const getLevelText = (level?: string): string => {
  if (!level) return 'Unknown';
  return level.charAt(0).toUpperCase() + level.slice(1);
};

const ChatRoomListScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { useAllRooms } = useRooms();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RoomPurpose | 'all'>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const queryParams = {
    page: 0,
    size: 20,
    purpose: selectedFilter === 'all' ? undefined : selectedFilter,
    roomName: searchQuery || undefined,
  };

  const { data: roomsData, isLoading, isError } = useAllRooms(queryParams);

  // Access data correctly from PageResponse structure
  const rooms = (roomsData?.data || []) as RoomResponse[];

  const joinRoom = (room: RoomResponse) => {
    // 'memberCount' does not exist on RoomResponse based on the error.
    // Assuming maxMembers logic check might need to be adjusted or memberCount fetched separately.
    // For now, removing memberCount check or defaulting to 0 if it's truly missing in DTO.
    // If the API doesn't return current member count, we can't check 'full' status client-side accurately without another call.
    // Proceeding with navigation.

    navigation.navigate('GroupChatScreen', {
      roomId: room.roomId,
      roomName: room.roomName
    });
  };

  const joinRoomByCode = () => {
    if (roomCode.trim()) {
      const foundRoom = rooms.find(room => room.roomId === roomCode.trim());
      if (foundRoom) {
        setShowJoinModal(false);
        setRoomCode('');
        joinRoom(foundRoom);
      } else {
        Alert.alert(t('room.not.found'), t('room.not.found.message'));
      }
    }
  };

  const renderRoom = ({ item }: { item: RoomResponse }) => (
    <TouchableOpacity
      style={styles.roomCard}
      onPress={() => joinRoom(item)}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleContainer}>
          {/* Language is not in RoomResponse DTO, using default */}
          <Text style={styles.roomFlag}>{getLanguageFlag('en')}</Text>
          <View style={styles.roomTitleInfo}>
            <Text style={styles.roomName}>{item.roomName}</Text>
            <Text style={styles.roomCreator}>{t('room.created.by')} {item.creatorId}</Text>
          </View>
        </View>

        <View style={styles.roomBadges}>
          <View style={[styles.levelBadge, { backgroundColor: `${getLevelColor('beginner')}20` }]}>
            <Text style={[styles.levelText, { color: getLevelColor('beginner') }]}>
              {getLevelText('beginner')}
            </Text>
          </View>
          <View style={[
            styles.purposeBadge,
            item.purpose === RoomPurpose.GROUP_CHAT ? styles.learningBadge : styles.socialBadge
          ]}>
            <Text style={[
              styles.purposeText,
              item.purpose === RoomPurpose.GROUP_CHAT ? styles.learningText : styles.socialText
            ]}>
              {item.purpose === RoomPurpose.GROUP_CHAT ? t('purpose.learning') : t('purpose.social')}
            </Text>
          </View>
        </View>
      </View>

      {/* 'description' does not exist on RoomResponse based on error. Using placeholder if needed or removing. */}
      <Text style={styles.roomDescription} numberOfLines={2}>
        {t('common.noDescription')}
      </Text>

      <View style={styles.roomFooter}>
        <View style={styles.memberInfo}>
          <Icon name="group" size={16} color="#6B7280" />
          <Text style={styles.memberCount}>
            {/* 'memberCount' does not exist. Displaying maxMembers only or default 0 */}
            0/{item.maxMembers} {t('members')}
          </Text>
        </View>

        <View style={styles.roomActions}>
          <Text style={styles.roomTime}>
            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
          </Text>
          {item.roomType === RoomType.PRIVATE && (
            <Icon name="lock" size={16} color="#6B7280" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (filter: RoomPurpose | 'all', label: string) => (
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
    <ScreenLayout style={styles.container}>
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

        <View style={styles.filtersContainer}>
          {renderFilterButton('all', t('all'))}
          {renderFilterButton(RoomPurpose.GROUP_CHAT, t('learning'))}
          {renderFilterButton(RoomPurpose.AI_CHAT, t('social'))}
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" style={{ marginTop: 20 }} color="#4F46E5" />
        ) : isError ? (
          <Text style={styles.emptyText}>{t('errors.loading')}</Text>
        ) : (
          <FlatList
            data={rooms}
            renderItem={renderRoom}
            keyExtractor={(item) => item.roomId}
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

        <TouchableOpacity
          style={styles.createRoomButton}
          onPress={() => navigation.navigate('CreateRoomScreen')}
        >
          <Icon name="add" size={24} color="#FFFFFF" />
          <Text style={styles.createRoomButtonText}>{t('room.create')}</Text>
        </TouchableOpacity>
      </Animated.View>

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
    </ScreenLayout>
  );
};

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