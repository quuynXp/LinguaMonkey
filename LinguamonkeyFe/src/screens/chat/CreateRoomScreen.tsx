import React, { useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useChatStore } from '../../stores/ChatStore';

const CreateRoomScreen = ({ navigation }) => {
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomPurpose, setRoomPurpose] = useState<'learning' | 'social'>('learning');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [maxMembers, setMaxMembers] = useState('20');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
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
  }, []);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const levels = [
    { value: 'beginner', label: 'Sơ cấp', color: '#10B981' },
    { value: 'intermediate', label: 'Trung cấp', color: '#F59E0B' },
    { value: 'advanced', label: 'Nâng cao', color: '#EF4444' },
  ];

  const createRoom = () => {
    if (!roomName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên phòng');
      return;
    }

    if (!roomDescription.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mô tả phòng');
      return;
    }

    if (isPrivate && !roomPassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu cho phòng riêng tư');
      return;
    }

    const roomData = {
      name: roomName.trim(),
      description: roomDescription.trim(),
      purpose: roomPurpose,
      language: selectedLanguage,
      level: selectedLevel,
      maxMembers: parseInt(maxMembers),
      isPrivate,
      password: isPrivate ? roomPassword : null,
    };

    Alert.alert(
      'Tạo phòng thành công!',
      `Phòng "${roomName}" đã được tạo. Mã phòng: ${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('UserChat', { room: roomData });
          },
        },
      ]
    );
  };

  const renderLanguageOption = (language) => (
    <TouchableOpacity
      key={language.code}
      style={[
        styles.optionButton,
        selectedLanguage === language.code && styles.selectedOption,
      ]}
      onPress={() => setSelectedLanguage(language.code)}
    >
      <Text style={styles.languageFlag}>{language.flag}</Text>
      <Text
        style={[
          styles.optionText,
          selectedLanguage === language.code && styles.selectedOptionText,
        ]}
      >
        {language.name}
      </Text>
    </TouchableOpacity>
  );

  const renderLevelOption = (level) => (
    <TouchableOpacity
      key={level.value}
      style={[
        styles.optionButton,
        selectedLevel === level.value && styles.selectedOption,
      ]}
      onPress={() => setSelectedLevel(level.value)}
    >
      <View
        style={[
          styles.levelIndicator,
          { backgroundColor: level.color },
        ]}
      />
      <Text
        style={[
          styles.optionText,
          selectedLevel === level.value && styles.selectedOptionText,
        ]}
      >
        {level.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo phòng mới</Text>
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
            <Text style={styles.inputLabel}>Tên phòng *</Text>
            <TextInput
              style={styles.textInput}
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Nhập tên phòng..."
              placeholderTextColor="#9CA3AF"
              maxLength={50}
            />
            <Text style={styles.characterCount}>{roomName.length}/50</Text>
          </View>

          {/* Room Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mô tả phòng *</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={roomDescription}
              onChangeText={setRoomDescription}
              placeholder="Mô tả mục đích và nội dung của phòng..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{roomDescription.length}/200</Text>
          </View>

          {/* Room Purpose */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mục đích phòng</Text>
            <View style={styles.purposeContainer}>
              <TouchableOpacity
                style={[
                  styles.purposeButton,
                  roomPurpose === 'learning' && styles.selectedPurpose,
                ]}
                onPress={() => setRoomPurpose('learning')}
              >
                <Icon
                  name="school"
                  size={20}
                  color={roomPurpose === 'learning' ? '#FFFFFF' : '#4F46E5'}
                />
                <Text
                  style={[
                    styles.purposeText,
                    roomPurpose === 'learning' && styles.selectedPurposeText,
                  ]}
                >
                  Học tập
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.purposeButton,
                  roomPurpose === 'social' && styles.selectedPurpose,
                ]}
                onPress={() => setRoomPurpose('social')}
              >
                <Icon
                  name="group"
                  size={20}
                  color={roomPurpose === 'social' ? '#FFFFFF' : '#10B981'}
                />
                <Text
                  style={[
                    styles.purposeText,
                    roomPurpose === 'social' && styles.selectedPurposeText,
                  ]}
                >
                  Giao lưu
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Language Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ngôn ngữ chính</Text>
            <View style={styles.optionsGrid}>
              {languages.map(renderLanguageOption)}
            </View>
          </View>

          {/* Level Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Trình độ</Text>
            <View style={styles.optionsGrid}>
              {levels.map(renderLevelOption)}
            </View>
          </View>

          {/* Max Members */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số thành viên tối đa</Text>
            <TextInput
              style={styles.textInput}
              value={maxMembers}
              onChangeText={setMaxMembers}
              placeholder="20"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          {/* Privacy Settings */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cài đặt riêng tư</Text>
            <TouchableOpacity
              style={styles.privacyToggle}
              onPress={() => setIsPrivate(!isPrivate)}
            >
              <View style={styles.privacyInfo}>
                <Icon name={isPrivate ? 'lock' : 'public'} size={20} color="#6B7280" />
                <Text style={styles.privacyText}>
                  {isPrivate ? 'Phòng riêng tư' : 'Phòng công khai'}
                </Text>
              </View>
              <View style={[styles.toggle, isPrivate && styles.toggleActive]}>
                <View style={[styles.toggleThumb, isPrivate && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
            {isPrivate && (
              <TextInput
                style={[styles.textInput, styles.passwordInput]}
                value={roomPassword}
                onChangeText={setRoomPassword}
                placeholder="Nhập mật khẩu phòng..."
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                maxLength={20}
              />
            )}
          </View>

          {/* Room Rules */}
          <View style={styles.rulesSection}>
            <Text style={styles.rulesTitle}>Quy tắc phòng chat</Text>
            <View style={styles.rulesList}>
              <View style={styles.ruleItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.ruleText}>Tôn trọng tất cả thành viên</Text>
              </View>
              <View style={styles.ruleItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.ruleText}>Không spam hoặc quảng cáo</Text>
              </View>
              <View style={styles.ruleItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.ruleText}>Sử dụng ngôn ngữ phù hợp</Text>
              </View>
              <View style={styles.ruleItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.ruleText}>Giúp đỡ lẫn nhau trong học tập</Text>
              </View>
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (!roomName.trim() || !roomDescription.trim()) && styles.createButtonDisabled,
            ]}
            onPress={createRoom}
            disabled={!roomName.trim() || !roomDescription.trim()}
          >
            <Icon name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Tạo phòng</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
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
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  selectedOption: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  languageFlag: {
    fontSize: 16,
  },
  levelIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#4F46E5',
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