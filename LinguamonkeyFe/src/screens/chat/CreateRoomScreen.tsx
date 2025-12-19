import React, { useRef, useState, useEffect } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useUserStore } from '../../stores/UserStore';
import { useCreateRoom } from '../../hooks/useRoom';
import { useUsers } from '../../hooks/useUsers';
import { RoomPurpose, RoomType } from '../../types/enums';
import { RoomRequest, UserProfileResponse } from '../../types/dto';
import { getAvatarSource } from '../../utils/avatarUtils';

const CreateRoomScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user } = useUserStore();

  const { mutate: createRoom, isPending: isCreating } = useCreateRoom();
  const { useSearchPublicUsers } = useUsers();

  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');

  // FIX: Mặc định là GROUP_CHAT (Tương ứng với Learning/General)
  const [roomPurpose, setRoomPurpose] = useState<RoomPurpose>(RoomPurpose.GROUP_CHAT);

  const [maxMembers, setMaxMembers] = useState('20');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');

  // Member Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const { data: searchResults, isLoading: isSearching } = useSearchPublicUsers({
    keyword: searchQuery,
    page: 0,
    size: 20
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleCreateRoom = () => {
    if (isCreating) return;

    if (!roomName.trim()) {
      Alert.alert(t('common.error'), t('createRoom.errors.nameRequired'));
      return;
    }

    if (!description.trim()) {
      Alert.alert(t('common.error'), t('createRoom.errors.descriptionRequired'));
      return;
    }

    if (!user?.userId) {
      Alert.alert(t('common.error'), t('auth.loginRequired'));
      return;
    }

    // Validation: Mật khẩu phòng private bắt buộc 6 số
    if (isPrivate) {
      if (!roomPassword.trim()) {
        Alert.alert(t('common.error'), "Vui lòng nhập mật khẩu cho phòng riêng tư");
        return;
      }
      if (roomPassword.length !== 6) {
        Alert.alert(t('common.error'), "Mật khẩu phòng phải gồm 6 chữ số");
        return;
      }
    }

    const roomPayload: RoomRequest = {
      roomName: roomName.trim(),
      creatorId: user.userId,
      content: description.trim(), // FIX: Changed key from 'description' to 'content' to match Backend DTO
      maxMembers: parseInt(maxMembers, 10) || 20,
      purpose: roomPurpose,
      roomType: isPrivate ? RoomType.PRIVATE : RoomType.PUBLIC,
      password: (isPrivate && roomPassword) ? roomPassword : null,
      roomCode: null,
      isDeleted: false,
      memberIds: Array.from(selectedUsers)
    } as any;

    createRoom(roomPayload, {
      onSuccess: (newRoom) => {
        if (newRoom && newRoom.roomId) {
          // Thay thế replace bằng navigate hoặc reset tùy luồng, 
          // ở đây dùng replace để user không back lại form tạo
          navigation.replace('GroupChatScreen', {
            roomId: newRoom.roomId,
            roomName: newRoom.roomName
          });
        } else {
          console.error("Created room but received invalid response:", newRoom);
          Alert.alert(t('common.error'), "Room created but ID is missing.");
        }
      },
      onError: (error: any) => {
        console.error("Create Room Error:", error?.response?.data || error);
        const serverMsg = error?.response?.data?.message || t('createRoom.errors.creationFailed');
        Alert.alert(t('common.error'), serverMsg);
      }
    });
  };

  const renderUserItem = ({ item }: { item: UserProfileResponse }) => {
    if (item.userId === user?.userId) return null;
    const isSelected = selectedUsers.has(item.userId);

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item.userId)}
      >
        <Image
          source={getAvatarSource(item.avatarUrl, null)}
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullname}</Text>
          <Text style={styles.userNickname}>@{item.nickname}</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.userItemSelectedCheckbox]}>
          {isSelected && <Icon name="check" size={16} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('createRoom.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.form,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Room Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('createRoom.roomNameLabel')} *
              </Text>
              <TextInput
                style={styles.textInput}
                value={roomName}
                onChangeText={setRoomName}
                placeholder={t('createRoom.roomNamePlaceholder')}
                placeholderTextColor="#9CA3AF"
                maxLength={50}
                editable={!isCreating}
              />
              <Text style={styles.characterCount}>{roomName.length}/50</Text>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('createRoom.descriptionLabel')} *
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('createRoom.descriptionPlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                maxLength={255}
                editable={!isCreating}
              />
              <Text style={styles.characterCount}>{description.length}/255</Text>
            </View>

            {/* Room Purpose Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('createRoom.purposeLabel')}
              </Text>
              <View style={styles.purposeContainer}>
                {/* Button 1: General Learning -> GROUP_CHAT */}
                <TouchableOpacity
                  style={[
                    styles.purposeButton,
                    roomPurpose === RoomPurpose.GROUP_CHAT && styles.selectedPurpose,
                  ]}
                  onPress={() => setRoomPurpose(RoomPurpose.GROUP_CHAT)}
                  disabled={isCreating}
                >
                  <Icon
                    name="group"
                    size={20}
                    color={roomPurpose === RoomPurpose.GROUP_CHAT ? '#FFFFFF' : '#4F46E5'}
                  />
                  <Text
                    style={[
                      styles.purposeText,
                      roomPurpose === RoomPurpose.GROUP_CHAT && styles.selectedPurposeText,
                    ]}
                  >
                    {t('purpose.learning')}
                  </Text>
                </TouchableOpacity>

                {/* Button 2: Quiz/Team -> QUIZ_TEAM */}
                <TouchableOpacity
                  style={[
                    styles.purposeButton,
                    roomPurpose === RoomPurpose.QUIZ_TEAM && styles.selectedPurpose,
                  ]}
                  onPress={() => setRoomPurpose(RoomPurpose.QUIZ_TEAM)}
                  disabled={isCreating}
                >
                  <Icon
                    name="school"
                    size={20}
                    color={roomPurpose === RoomPurpose.QUIZ_TEAM ? '#FFFFFF' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.purposeText,
                      roomPurpose === RoomPurpose.QUIZ_TEAM && styles.selectedPurposeText,
                    ]}
                  >
                    {t('purpose.quiz')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Max Members */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('createRoom.maxMembersLabel')}
              </Text>
              <TextInput
                style={styles.textInput}
                value={maxMembers}
                onChangeText={setMaxMembers}
                placeholder="20"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={2}
                editable={!isCreating}
              />
            </View>

            {/* Privacy Setting */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('createRoom.privacyLabel')}
              </Text>
              <TouchableOpacity
                style={styles.privacyToggle}
                onPress={() => setIsPrivate(!isPrivate)}
                disabled={isCreating}
              >
                <View style={styles.privacyInfo}>
                  <Icon
                    name={isPrivate ? 'lock' : 'public'}
                    size={20}
                    color="#6B7280"
                  />
                  <Text style={styles.privacyText}>
                    {isPrivate
                      ? t('createRoom.privacyPrivate')
                      : t('createRoom.privacyPublic')}
                  </Text>
                </View>
                <View style={[styles.toggle, isPrivate && styles.toggleActive]}>
                  <View
                    style={[
                      styles.toggleThumb,
                      isPrivate && styles.toggleThumbActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Password Input - Only show if private */}
              {isPrivate && (
                <View>
                  <TextInput
                    style={[styles.textInput, styles.passwordInput]}
                    value={roomPassword}
                    onChangeText={(text) => setRoomPassword(text.replace(/[^0-9]/g, ''))}
                    placeholder="000000"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isCreating}
                  />
                  <Text style={styles.helperText}>Mật khẩu gồm 6 chữ số</Text>
                </View>
              )}
            </View>

            {/* Add Members Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('createRoom.addMembersLabel')} ({selectedUsers.size})
              </Text>
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('createRoom.searchUsersPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.userListContainer}>
                {isSearching ? (
                  <ActivityIndicator size="small" color="#4F46E5" style={{ padding: 20 }} />
                ) : (
                  <FlatList<UserProfileResponse>
                    data={(searchResults?.data as UserProfileResponse[]) || []}
                    keyExtractor={item => item.userId}
                    renderItem={renderUserItem}
                    scrollEnabled={false}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>{t('common.noResults')}</Text>
                    }
                  />
                )}
              </View>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                (!roomName.trim() || !description.trim() || isCreating) &&
                styles.createButtonDisabled,
              ]}
              onPress={handleCreateRoom}
              disabled={!roomName.trim() || !description.trim() || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>
                    {t('createRoom.createButton')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  passwordInput: {
    marginTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  purposeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  purposeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  selectedPurpose: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  purposeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedPurposeText: {
    color: '#FFFFFF',
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#4F46E5',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  userListContainer: {
    marginTop: 12,
    maxHeight: 250,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden'
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userNickname: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.2
  },
  userItemSelectedCheckbox: {
    opacity: 1
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#6B7280',
  }
});

export default CreateRoomScreen;