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

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  location: string;
  bio: string;
}

const EditProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile>({
    firstName: 'Minh',
    lastName: 'Nguyen',
    email: 'minh.nguyen@email.com',
    phone: '+84 123 456 789',
    dateOfBirth: '15/03/1995',
    location: 'Hồ Chí Minh, Việt Nam',
    bio: 'Đam mê học ngôn ngữ và khám phá văn hóa mới',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
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

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    Alert.alert(
      'Lưu thay đổi',
      'Thông tin của bạn đã được cập nhật thành công!',
      [{ text: 'OK', onPress: () => setHasChanges(false) }]
    );
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Hủy thay đổi',
        'Bạn có chắc chắn muốn hủy các thay đổi chưa lưu?',
        [
          { text: 'Tiếp tục chỉnh sửa', style: 'cancel' },
          { text: 'Hủy thay đổi', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const renderInputField = (
    label: string,
    value: string,
    field: keyof UserProfile,
    placeholder: string,
    multiline = false,
    keyboardType: any = 'default'
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.textInput, multiline && styles.multilineInput]}
        value={value}
        onChangeText={(text) => handleInputChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.headerButton, hasChanges && styles.saveButton]}
          disabled={!hasChanges}
        >
          <Text style={[styles.saveText, hasChanges && styles.saveTextActive]}>
            Lưu
          </Text>
        </TouchableOpacity>
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
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Icon name="person" size={50} color="#4F46E5" />
              </View>
              <TouchableOpacity style={styles.changeAvatarButton}>
                <Icon name="camera-alt" size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>
            <Text style={styles.changeAvatarText}>Thay đổi ảnh đại diện</Text>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            <View style={styles.sectionContent}>
              {renderInputField('Tên', profile.firstName, 'firstName', 'Nhập tên của bạn')}
              {renderInputField('Họ', profile.lastName, 'lastName', 'Nhập họ của bạn')}
              {renderInputField('Email', profile.email, 'email', 'Nhập email', false, 'email-address')}
              {renderInputField('Số điện thoại', profile.phone, 'phone', 'Nhập số điện thoại', false, 'phone-pad')}
              {renderInputField('Ngày sinh', profile.dateOfBirth, 'dateOfBirth', 'DD/MM/YYYY')}
              {renderInputField('Địa chỉ', profile.location, 'location', 'Nhập địa chỉ của bạn')}
            </View>
          </View>

          {/* Bio Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giới thiệu</Text>
            <View style={styles.sectionContent}>
              {renderInputField(
                'Mô tả bản thân',
                profile.bio,
                'bio',
                'Viết vài dòng về bản thân bạn...',
                true
              )}
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tài khoản</Text>
            <View style={styles.sectionContent}>
              <TouchableOpacity style={styles.actionItem}>
                <Icon name="lock" size={20} color="#4F46E5" />
                <Text style={styles.actionText}>Đổi mật khẩu</Text>
                <Icon name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionItem}>
                <Icon name="email" size={20} color="#4F46E5" />
                <Text style={styles.actionText}>Xác thực email</Text>
                <View style={styles.verifiedBadge}>
                  <Icon name="verified" size={16} color="#10B981" />
                  <Text style={styles.verifiedText}>Đã xác thực</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
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
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  saveTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAnimation: {
    width: 80,
    height: 80,
  },
  changeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  changeAvatarText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
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
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default EditProfileScreen;