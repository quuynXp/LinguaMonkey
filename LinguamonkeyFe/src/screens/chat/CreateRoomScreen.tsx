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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useUserStore } from '../../stores/UserStore';
import { useRooms } from '../../hooks/useRoom';
import { RoomPurpose, RoomType } from '../../types/enums';
import { RoomRequest } from '../../types/dto';

const CreateRoomScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user } = useUserStore();

  const { useCreateRoom } = useRooms();
  const { mutate: createRoom, isPending: isCreating } = useCreateRoom();

  const [roomName, setRoomName] = useState('');
  const [roomPurpose, setRoomPurpose] = useState<RoomPurpose>(RoomPurpose.QUIZ_TEAM);
  const [maxMembers, setMaxMembers] = useState('20');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');

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

  const handleCreateRoom = () => {
    if (isCreating) return;

    if (!roomName.trim()) {
      Alert.alert(t('common.error'), t('createRoom.errors.nameRequired'));
      return;
    }

    if (!user?.userId) {
      Alert.alert(t('common.error'), t('auth.loginRequired'));
      return;
    }

    const roomPayload: RoomRequest = {
      roomName: roomName.trim(),
      creatorId: user.userId,
      description: `Room created by ${user.nickname || user.fullname}`, // Default description
      maxMembers: parseInt(maxMembers) || 20,
      purpose: roomPurpose,
      roomType: isPrivate ? RoomType.PRIVATE : RoomType.PUBLIC,
      isDeleted: false,
    };

    createRoom(roomPayload, {
      onSuccess: (newRoom) => {
        navigation.replace('ChatRoom', { roomId: newRoom.roomId });
      },
      onError: (error) => {
        console.error(error);
        Alert.alert(t('common.error'), t('createRoom.errors.creationFailed'));
      }
    });
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

            {/* Room Purpose */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('createRoom.purposeLabel')}
              </Text>
              <View style={styles.purposeContainer}>
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
                    color={roomPurpose === RoomPurpose.QUIZ_TEAM ? '#FFFFFF' : '#4F46E5'}
                  />
                  <Text
                    style={[
                      styles.purposeText,
                      roomPurpose === RoomPurpose.QUIZ_TEAM && styles.selectedPurposeText,
                    ]}
                  >
                    {t('createRoom.purposeLearning')}
                  </Text>
                </TouchableOpacity>
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
                    color={roomPurpose === RoomPurpose.GROUP_CHAT ? '#FFFFFF' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.purposeText,
                      roomPurpose === RoomPurpose.GROUP_CHAT && styles.selectedPurposeText,
                    ]}
                  >
                    {t('createRoom.purposeSocial')}
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
                <TextInput
                  style={[styles.textInput, styles.passwordInput]}
                  value={roomPassword}
                  onChangeText={setRoomPassword}
                  placeholder={t('createRoom.passwordPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  maxLength={20}
                  editable={!isCreating}
                />
              )}
            </View>

            {/* Rules Section */}
            <View style={styles.rulesSection}>
              <Text style={styles.rulesTitle}>{t('createRoom.rulesTitle')}</Text>
              <View style={styles.rulesList}>
                <View style={styles.ruleItem}>
                  <Icon name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.ruleText}>{t('createRoom.rule1')}</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Icon name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.ruleText}>{t('createRoom.rule2')}</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Icon name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.ruleText}>{t('createRoom.rule3')}</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Icon name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.ruleText}>{t('createRoom.rule4')}</Text>
                </View>
              </View>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                (!roomName.trim() || isCreating) &&
                styles.createButtonDisabled,
              ]}
              onPress={handleCreateRoom}
              disabled={!roomName.trim() || isCreating}
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
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
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
  passwordInput: {
    marginTop: 12,
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
  rulesSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  rulesList: {
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
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
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CreateRoomScreen;