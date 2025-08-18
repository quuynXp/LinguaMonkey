import React, { useRef, useState } from 'react';
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; 

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  icon: string;
  value: boolean;
  type: 'toggle' | 'action';
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

const PrivacySettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    profileVisibility: true,
    progressSharing: false,
    dataCollection: true,
    personalization: true,
    analytics: false,
    crashReports: true,
    locationTracking: false,
    contactSync: false,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const updateSetting = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleDataExport = () => {
    Alert.alert(
      'Xuất dữ liệu',
      'Chúng tôi sẽ gửi file chứa tất cả dữ liệu của bạn qua email trong vòng 24 giờ.',
      [{ text: 'OK' }]
    );
  };

  const handleDataDeletion = () => {
    Alert.alert(
      'Xóa dữ liệu',
      'Bạn có chắc chắn muốn xóa tất cả dữ liệu? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const privacySettings: PrivacySetting[] = [
    {
      id: 'profile-visibility',
      title: 'Hiển thị hồ sơ công khai',
      description: 'Cho phép người khác xem hồ sơ của bạn',
      icon: 'visibility',
      value: settings.profileVisibility,
      type: 'toggle',
      onToggle: (value) => updateSetting('profileVisibility', value),
    },
    {
      id: 'progress-sharing',
      title: 'Chia sẻ tiến độ',
      description: 'Chia sẻ tiến độ học tập với bạn bè',
      icon: 'share',
      value: settings.progressSharing,
      type: 'toggle',
      onToggle: (value) => updateSetting('progressSharing', value),
    },
    {
      id: 'location-tracking',
      title: 'Theo dõi vị trí',
      description: 'Sử dụng vị trí để cải thiện trải nghiệm',
      icon: 'location-on',
      value: settings.locationTracking,
      type: 'toggle',
      onToggle: (value) => updateSetting('locationTracking', value),
    },
    {
      id: 'contact-sync',
      title: 'Đồng bộ danh bạ',
      description: 'Tìm bạn bè từ danh bạ điện thoại',
      icon: 'contacts',
      value: settings.contactSync,
      type: 'toggle',
      onToggle: (value) => updateSetting('contactSync', value),
    },
  ];

  const dataSettings: PrivacySetting[] = [
    {
      id: 'data-collection',
      title: 'Thu thập dữ liệu',
      description: 'Cho phép thu thập dữ liệu để cải thiện ứng dụng',
      icon: 'data-usage',
      value: settings.dataCollection,
      type: 'toggle',
      onToggle: (value) => updateSetting('dataCollection', value),
    },
    {
      id: 'personalization',
      title: 'Cá nhân hóa',
      description: 'Sử dụng dữ liệu để cá nhân hóa trải nghiệm',
      icon: 'person',
      value: settings.personalization,
      type: 'toggle',
      onToggle: (value) => updateSetting('personalization', value),
    },
    {
      id: 'analytics',
      title: 'Phân tích sử dụng',
      description: 'Gửi dữ liệu phân tích ẩn danh',
      icon: 'analytics',
      value: settings.analytics,
      type: 'toggle',
      onToggle: (value) => updateSetting('analytics', value),
    },
    {
      id: 'crash-reports',
      title: 'Báo cáo lỗi',
      description: 'Tự động gửi báo cáo khi ứng dụng gặp lỗi',
      icon: 'bug-report',
      value: settings.crashReports,
      type: 'toggle',
      onToggle: (value) => updateSetting('crashReports', value),
    },
  ];

  const dataManagementActions: PrivacySetting[] = [
    {
      id: 'export-data',
      title: 'Xuất dữ liệu',
      description: 'Tải xuống tất cả dữ liệu của bạn',
      icon: 'download',
      value: false,
      type: 'action',
      onPress: handleDataExport,
    },
    {
      id: 'delete-data',
      title: 'Xóa tất cả dữ liệu',
      description: 'Xóa vĩnh viễn tất cả dữ liệu cá nhân',
      icon: 'delete-forever',
      value: false,
      type: 'action',
      onPress: handleDataDeletion,
    },
  ];

  const renderSettingItem = (setting: PrivacySetting, isDangerous = false) => (
    <TouchableOpacity
      key={setting.id}
      style={styles.settingItem}
      onPress={setting.onPress}
      disabled={setting.type === 'toggle'}
    >
      <View style={[styles.settingIcon, isDangerous && styles.dangerousIcon]}>
        <Icon
          name={setting.icon}
          size={20}
          color={isDangerous ? '#EF4444' : '#4F46E5'}
        />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isDangerous && styles.dangerousText]}>
          {setting.title}
        </Text>
        <Text style={styles.settingDescription}>{setting.description}</Text>
      </View>
      
      {setting.type === 'toggle' ? (
        <Switch
          value={setting.value}
          onValueChange={setting.onToggle}
          trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, subtitle: string, items: PrivacySetting[], isDangerous = false) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.sectionContent}>
        {items.map(item => renderSettingItem(item, isDangerous))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quyền riêng tư</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Privacy Notice */}
          <View style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Icon name="security" size={24} color="#4F46E5" />
              <Text style={styles.noticeTitle}>Cam kết bảo mật</Text>
            </View>
            <Text style={styles.noticeText}>
              Chúng tôi cam kết bảo vệ quyền riêng tư của bạn. 
              Tất cả dữ liệu được mã hóa và chỉ được sử dụng để 
              cải thiện trải nghiệm học tập của bạn.
            </Text>
          </View>

          {renderSection(
            'Quyền riêng tư',
            'Kiểm soát thông tin cá nhân của bạn',
            privacySettings
          )}

          {renderSection(
            'Dữ liệu & Phân tích',
            'Quản lý cách chúng tôi sử dụng dữ liệu của bạn',
            dataSettings
          )}

          {renderSection(
            'Quản lý dữ liệu',
            'Xuất hoặc xóa dữ liệu cá nhân',
            dataManagementActions,
            true
          )}

          {/* Legal Links */}
          <View style={styles.legalSection}>
            <Text style={styles.legalTitle}>Tài liệu pháp lý</Text>
            <TouchableOpacity style={styles.legalItem}>
              <Icon name="description" size={20} color="#6B7280" />
              <Text style={styles.legalText}>Chính sách bảo mật</Text>
              <Icon name="open-in-new" size={16} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.legalItem}>
              <Icon name="gavel" size={20} color="#6B7280" />
              <Text style={styles.legalText}>Điều khoản sử dụng</Text>
              <Icon name="open-in-new" size={16} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.legalItem}>
              <Icon name="cookie" size={20} color="#6B7280" />
              <Text style={styles.legalText}>Chính sách Cookie</Text>
              <Icon name="open-in-new" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Contact */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Cần hỗ trợ?</Text>
            <Text style={styles.contactText}>
              Nếu bạn có câu hỏi về quyền riêng tư, 
              hãy liên hệ với chúng tôi qua email: 
              privacy@linguaviet.com
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
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
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  noticeCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dangerousIcon: {
    backgroundColor: '#FEF2F2',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  dangerousText: {
    color: '#EF4444',
  },
  legalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  legalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  legalText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  contactSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default PrivacySettingsScreen;