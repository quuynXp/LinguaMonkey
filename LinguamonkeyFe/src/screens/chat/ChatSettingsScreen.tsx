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
interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'toggle' | 'action';
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

const ChatSettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    autoTranslate: true,
    showOriginalButton: true,
    translateToVietnamese: true,
    soundNotifications: true,
    vibrationNotifications: false,
    showTypingIndicator: true,
    autoCorrect: true,
    wordSuggestions: true,
    saveTranslationHistory: true,
    offlineTranslation: false,
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

  const clearTranslationHistory = () => {
    Alert.alert(
      'Xóa lịch sử dịch',
      'Bạn có chắc chắn muốn xóa tất cả lịch sử dịch thuật?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const resetSettings = () => {
    Alert.alert(
      'Đặt lại cài đặt',
      'Bạn có muốn đặt lại tất cả cài đặt về mặc định?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          onPress: () => {
            setSettings({
              autoTranslate: true,
              showOriginalButton: true,
              translateToVietnamese: true,
              soundNotifications: true,
              vibrationNotifications: false,
              showTypingIndicator: true,
              autoCorrect: true,
              wordSuggestions: true,
              saveTranslationHistory: true,
              offlineTranslation: false,
            });
          },
        },
      ]
    );
  };

  const translationSettings: SettingItem[] = [
    {
      id: 'auto-translate',
      title: 'Dịch tự động',
      description: 'Tự động dịch tin nhắn từ người khác',
      icon: 'translate',
      type: 'toggle',
      value: settings.autoTranslate,
      onToggle: (value) => updateSetting('autoTranslate', value),
    },
    {
      id: 'show-original',
      title: 'Hiển thị nút "Xem gốc"',
      description: 'Cho phép xem tin nhắn gốc chưa dịch',
      icon: 'visibility',
      type: 'toggle',
      value: settings.showOriginalButton,
      onToggle: (value) => updateSetting('showOriginalButton', value),
    },
    {
      id: 'translate-vietnamese',
      title: 'Dịch sang tiếng Việt',
      description: 'Dịch tất cả tin nhắn sang tiếng Việt',
      icon: 'language',
      type: 'toggle',
      value: settings.translateToVietnamese,
      onToggle: (value) => updateSetting('translateToVietnamese', value),
    },
    {
      id: 'save-history',
      title: 'Lưu lịch sử dịch',
      description: 'Lưu các bản dịch để sử dụng offline',
      icon: 'history',
      type: 'toggle',
      value: settings.saveTranslationHistory,
      onToggle: (value) => updateSetting('saveTranslationHistory', value),
    },
    {
      id: 'offline-translation',
      title: 'Dịch offline',
      description: 'Sử dụng dịch thuật offline khi không có mạng',
      icon: 'cloud-off',
      type: 'toggle',
      value: settings.offlineTranslation,
      onToggle: (value) => updateSetting('offlineTranslation', value),
    },
  ];

  const chatSettings: SettingItem[] = [
    {
      id: 'sound-notifications',
      title: 'Thông báo âm thanh',
      description: 'Phát âm thanh khi có tin nhắn mới',
      icon: 'volume-up',
      type: 'toggle',
      value: settings.soundNotifications,
      onToggle: (value) => updateSetting('soundNotifications', value),
    },
    {
      id: 'vibration',
      title: 'Rung thông báo',
      description: 'Rung điện thoại khi có tin nhắn mới',
      icon: 'vibration',
      type: 'toggle',
      value: settings.vibrationNotifications,
      onToggle: (value) => updateSetting('vibrationNotifications', value),
    },
    {
      id: 'typing-indicator',
      title: 'Hiển thị đang gõ',
      description: 'Cho người khác biết khi bạn đang gõ tin nhắn',
      icon: 'edit',
      type: 'toggle',
      value: settings.showTypingIndicator,
      onToggle: (value) => updateSetting('showTypingIndicator', value),
    },
    {
      id: 'auto-correct',
      title: 'Tự động sửa lỗi',
      description: 'Tự động sửa lỗi chính tả khi gõ',
      icon: 'spellcheck',
      type: 'toggle',
      value: settings.autoCorrect,
      onToggle: (value) => updateSetting('autoCorrect', value),
    },
    {
      id: 'word-suggestions',
      title: 'Gợi ý từ',
      description: 'Hiển thị gợi ý từ khi gõ tin nhắn',
      icon: 'lightbulb',
      type: 'toggle',
      value: settings.wordSuggestions,
      onToggle: (value) => updateSetting('wordSuggestions', value),
    },
  ];

  const actionSettings: SettingItem[] = [
    {
      id: 'clear-history',
      title: 'Xóa lịch sử dịch',
      description: 'Xóa tất cả lịch sử dịch thuật đã lưu',
      icon: 'delete-sweep',
      type: 'action',
      onPress: clearTranslationHistory,
    },
    {
      id: 'reset-settings',
      title: 'Đặt lại cài đặt',
      description: 'Khôi phục tất cả cài đặt về mặc định',
      icon: 'restore',
      type: 'action',
      onPress: resetSettings,
    },
  ];

  const renderSettingItem = (item: SettingItem, isDangerous = false) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'toggle'}
    >
      <View style={[styles.settingIcon, isDangerous && styles.dangerousIcon]}>
        <Icon
          name={item.icon}
          size={20}
          color={isDangerous ? '#EF4444' : '#4F46E5'}
        />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isDangerous && styles.dangerousText]}>
          {item.title}
        </Text>
        <Text style={styles.settingDescription}>{item.description}</Text>
      </View>
      
      {item.type === 'toggle' ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, subtitle: string, items: SettingItem[], isDangerous = false) => (
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
        <Text style={styles.headerTitle}>Cài đặt Chat</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Translation Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Icon name="translate" size={24} color="#4F46E5" />
              <Text style={styles.infoTitle}>Dịch thuật thông minh</Text>
            </View>
            <Text style={styles.infoText}>
              Sử dụng AI để dịch tin nhắn chính xác và tự nhiên. 
              Hỗ trợ hơn 100 ngôn ngữ với khả năng hiểu ngữ cảnh.
            </Text>
          </View>

          {renderSection(
            'Cài đặt dịch thuật',
            'Tùy chỉnh cách dịch tin nhắn trong chat',
            translationSettings
          )}

          {renderSection(
            'Cài đặt chat',
            'Tùy chỉnh trải nghiệm chat của bạn',
            chatSettings
          )}

          {renderSection(
            'Hành động',
            'Quản lý dữ liệu và đặt lại cài đặt',
            actionSettings,
            true
          )}

          {/* Translation Languages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ngôn ngữ hỗ trợ</Text>
            <Text style={styles.sectionSubtitle}>
              Các ngôn ngữ được hỗ trợ dịch thuật
            </Text>
            <View style={styles.languageGrid}>
              {[
                { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
                { code: 'en', name: 'English', flag: '🇺🇸' },
                { code: 'zh', name: '中文', flag: '🇨🇳' },
                { code: 'ja', name: '日本語', flag: '🇯🇵' },
                { code: 'ko', name: '한국어', flag: '🇰🇷' },
                { code: 'fr', name: 'Français', flag: '🇫🇷' },
                { code: 'es', name: 'Español', flag: '🇪🇸' },
                { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
              ].map((lang) => (
                <View key={lang.code} style={styles.languageItem}>
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={styles.languageName}>{lang.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Icon name="tips-and-updates" size={20} color="#F59E0B" />
              <Text style={styles.tipsTitle}>Mẹo sử dụng</Text>
            </View>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  Bật dịch tự động để hiểu tin nhắn ngay lập tức
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  Sử dụng nút "Xem gốc" để học từ vựng mới
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  Lưu lịch sử dịch để ôn tập sau này
                </Text>
              </View>
            </View>
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
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  infoText: {
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
  languageGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  languageFlag: {
    fontSize: 16,
  },
  languageName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  tipsSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
});

export default ChatSettingsScreen;