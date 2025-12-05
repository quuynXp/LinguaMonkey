import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, NotificationPreferences, PrivacySettings } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { useTokenStore } from '../../stores/tokenStore';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { resetToAuth } from '../../utils/navigationRef';
import { privateClient } from '../../api/axiosClient';

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const {
    notificationPreferences,
    privacySettings,
    chatSettings,
    setNotificationPreferences,
    setPrivacySettings,
    setChatSettings,
    toggleNotification,
    togglePrivacy,
  } = useAppStore(
    useShallow((state) => ({
      notificationPreferences: state.notificationPreferences,
      privacySettings: state.privacySettings,
      chatSettings: state.chatSettings,
      setNotificationPreferences: state.setNotificationPreferences,
      setPrivacySettings: state.setPrivacySettings,
      setChatSettings: state.setChatSettings,
      toggleNotification: state.toggleNotification,
      togglePrivacy: state.togglePrivacy,
    }))
  );

  const { user } = useUserStore();

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.userId) return;
      try {
        const res = await privateClient.get(`/api/v1/user-settings/${user.userId}`);
        if (res.data.code === 200 && res.data.result) {
          const remote = res.data.result;

          setNotificationPreferences({
            studyReminders: remote.studyReminders,
            streakReminders: remote.streakReminders,
            dailyChallengeReminders: remote.dailyChallengeReminders,
            courseReminders: remote.courseReminders,
            coupleReminders: remote.coupleReminders,
            vipReminders: remote.vipReminders,
            soundEnabled: remote.soundEnabled,
            vibrationEnabled: remote.vibrationEnabled,
          });

          setPrivacySettings({
            profileVisibility: remote.profileVisibility,
            progressSharing: remote.progressSharing,
            searchPrivacy: remote.searchPrivacy,
          });

          setChatSettings({
            autoTranslate: remote.autoTranslate
          });
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
  }, [user?.userId]);

  // Helper to send ALL settings to backend because Java primitive booleans default to false if missing
  const syncToBackend = async (
    updatedNotif?: NotificationPreferences,
    updatedPrivacy?: PrivacySettings,
    updatedChat?: any
  ) => {
    if (!user?.userId) return;

    const notif = updatedNotif || notificationPreferences;
    const privacy = updatedPrivacy || privacySettings;
    const chat = updatedChat || chatSettings;

    const payload = {
      // Notifications
      studyReminders: notif.studyReminders,
      streakReminders: notif.streakReminders,
      dailyChallengeReminders: notif.dailyChallengeReminders,
      courseReminders: notif.courseReminders,
      coupleReminders: notif.coupleReminders,
      vipReminders: notif.vipReminders,
      soundEnabled: notif.soundEnabled,
      vibrationEnabled: notif.vibrationEnabled,
      // Privacy
      profileVisibility: privacy.profileVisibility,
      progressSharing: privacy.progressSharing,
      searchPrivacy: privacy.searchPrivacy,
      // Chat
      autoTranslate: chat.autoTranslate,
    };

    try {
      await privateClient.patch(`/api/v1/user-settings/${user.userId}`, payload);
    } catch (error) {
      console.error("Failed to sync setting", error);
      Alert.alert(t('errors.server'), "Failed to save setting");
    }
  };

  const handleToggleNotification = (field: keyof NotificationPreferences) => {
    const newValue = !notificationPreferences[field];
    toggleNotification(field, newValue);
    // Construct new state for sync
    const newPrefs = { ...notificationPreferences, [field]: newValue };
    syncToBackend(newPrefs, undefined, undefined);
  };

  const handleTogglePrivacy = (field: keyof PrivacySettings) => {
    const newValue = !privacySettings[field];
    togglePrivacy(field, newValue);
    // Construct new state for sync
    const newPrivacy = { ...privacySettings, [field]: newValue };
    syncToBackend(undefined, newPrivacy, undefined);
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          useTokenStore.getState().clearTokens();
          useUserStore.getState().logout();
          useAppStore.getState().logout();
          resetToAuth();
        }
      },
    ]);
  };

  const renderToggleItem = (label: string, value: boolean, onToggle: () => void, icon: string, color: string) => (
    <View style={styles.toggleRow}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}1A` }]}>
        <Icon name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
        thumbColor={'#FFFFFF'}
        ios_backgroundColor="#E5E7EB"
        onValueChange={onToggle}
        value={value}
      />
    </View>
  );

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* System Settings (Sound/Vibration) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.system')}</Text>
          <View style={styles.card}>
            {renderToggleItem(t('settings.sound'), notificationPreferences.soundEnabled, () => handleToggleNotification('soundEnabled'), 'volume-up', '#8B5CF6')}
            <View style={styles.separator} />
            {renderToggleItem(t('settings.vibration'), notificationPreferences.vibrationEnabled, () => handleToggleNotification('vibrationEnabled'), 'vibration', '#EC4899')}
          </View>
        </View>

        {/* Reminders Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.reminders')}</Text>
          <View style={styles.card}>
            {renderToggleItem(t('settings.studyReminders'), notificationPreferences.studyReminders, () => handleToggleNotification('studyReminders'), 'alarm', '#F59E0B')}
            <View style={styles.separator} />
            {renderToggleItem(t('settings.streakReminders'), notificationPreferences.streakReminders, () => handleToggleNotification('streakReminders'), 'whatshot', '#EF4444')}
            <View style={styles.separator} />
            {renderToggleItem(t('settings.dailyChallenge'), notificationPreferences.dailyChallengeReminders, () => handleToggleNotification('dailyChallengeReminders'), 'emoji-events', '#FBBF24')}
            <View style={styles.separator} />
            {renderToggleItem(t('settings.courses'), notificationPreferences.courseReminders, () => handleToggleNotification('courseReminders'), 'school', '#3B82F6')}
            <View style={styles.separator} />
            {renderToggleItem(t('settings.couples'), notificationPreferences.coupleReminders, () => handleToggleNotification('coupleReminders'), 'favorite', '#EC4899')}
            <View style={styles.separator} />
            {renderToggleItem(t('settings.vip'), notificationPreferences.vipReminders, () => handleToggleNotification('vipReminders'), 'diamond', '#10B981')}
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.privacy')}</Text>
          <View style={styles.card}>
            {renderToggleItem(t('settings.profileVisibility'), privacySettings.profileVisibility, () => handleTogglePrivacy('profileVisibility'), 'visibility', '#3B82F6')}
            <View style={styles.separator} />
            {renderToggleItem(t('settings.progressSharing'), privacySettings.progressSharing, () => handleTogglePrivacy('progressSharing'), 'share', '#6366F1')}
            <View style={styles.separator} />
            {renderToggleItem(t('settings.searchPrivacy'), privacySettings.searchPrivacy, () => handleTogglePrivacy('searchPrivacy'), 'person-search', '#10B981')}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  container: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', paddingHorizontal: 16, elevation: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  toggleLabel: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 50 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444', marginLeft: 10 },
});

export default SettingsScreen;