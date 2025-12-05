import React, { useRef } from 'react';
import {
  Animated,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { privateClient } from '../../api/axiosClient';
import { showToast } from '../../components/Toast';

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
  const { t } = useTranslation();

  const {
    chatSettings,
    setChatSettings,
    notificationPreferences,
    privacySettings
  } = useAppStore(useShallow((state) => ({
    chatSettings: state.chatSettings,
    setChatSettings: state.setChatSettings,
    notificationPreferences: state.notificationPreferences,
    privacySettings: state.privacySettings
  })));

  const { user } = useUserStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const syncToBackend = async (newAutoTranslate: boolean) => {
    if (!user?.userId) return;

    const payload = {
      autoTranslate: newAutoTranslate,
      studyReminders: notificationPreferences.studyReminders,
      streakReminders: notificationPreferences.streakReminders,
      dailyChallengeReminders: notificationPreferences.dailyChallengeReminders,
      courseReminders: notificationPreferences.courseReminders,
      coupleReminders: notificationPreferences.coupleReminders,
      vipReminders: notificationPreferences.vipReminders,
      soundEnabled: notificationPreferences.soundEnabled,
      vibrationEnabled: notificationPreferences.vibrationEnabled,
      profileVisibility: privacySettings.profileVisibility,
      progressSharing: privacySettings.progressSharing,
      searchPrivacy: privacySettings.searchPrivacy,
    };

    try {
      await privateClient.patch(`/api/v1/user-settings/${user.userId}`, payload);
    } catch (error) {
      console.error("Failed to sync chat setting", error);
    }
  };

  const updateSetting = (value: boolean) => {
    setChatSettings({ autoTranslate: value });
    syncToBackend(value);

    if (value) {
      showToast({
        message: t('chat.autoTranslateToast'),
        type: 'info',
      });
    }
  };

  const translationSettings: SettingItem[] = [
    {
      id: 'auto-translate',
      title: t('chat.autoTranslate'),
      description: t('chat.autoTranslateDesc'),
      icon: 'translate',
      type: 'toggle',
      value: chatSettings.autoTranslate,
      onToggle: (value) => updateSetting(value),
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'toggle'}
    >
      <View style={styles.settingIcon}>
        <Icon
          name={item.icon}
          size={20}
          color={'#4F46E5'}
        />
      </View>

      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>
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

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('chat.settingsTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Icon name="translate" size={24} color="#4F46E5" />
              <Text style={styles.infoTitle}>{t('chat.translationInfoTitle')}</Text>
            </View>
            <Text style={styles.infoText}>
              {t('chat.translationInfoDesc')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('chat.translationSection')}</Text>
            <View style={styles.sectionContent}>
              {translationSettings.map(item => renderSettingItem(item))}
            </View>
          </View>

          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Icon name="tips-and-updates" size={20} color="#F59E0B" />
              <Text style={styles.tipsTitle}>{t('chat.tipsTitle')}</Text>
            </View>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  {t('chat.tip1')}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 10,
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