import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, NotificationPreferences } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { useTokenStore } from '../../stores/tokenStore';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { gotoTab, resetToAuth } from '../../utils/navigationRef';
import { privateClient } from '../../api/axiosClient';

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const {
    notificationPreferences,
    privacySettings,
    setNotificationPreferences,
    setPrivacySettings,
    toggleNotification,
    togglePrivacy,
  } = useAppStore(
    useShallow((state) => ({
      notificationPreferences: state.notificationPreferences,
      privacySettings: state.privacySettings,
      setNotificationPreferences: state.setNotificationPreferences,
      setPrivacySettings: state.setPrivacySettings,
      toggleNotification: state.toggleNotification,
      togglePrivacy: state.togglePrivacy,
    }))
  );

  const { user } = useUserStore();

  // Load settings from Backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.userId) return;
      try {
        const res = await privateClient.get(`/api/v1/user-settings/${user.userId}`);
        if (res.data.code === 200 && res.data.result) {
          const remoteSettings = res.data.result;
          // Map Backend Response to Frontend Stores
          setNotificationPreferences({
            ...notificationPreferences!,
            studyReminders: remoteSettings.studyReminders,
            streakReminders: remoteSettings.streakReminders,
            soundEnabled: remoteSettings.soundEnabled,
            vibrationEnabled: remoteSettings.vibrationEnabled,
          });
          setPrivacySettings({
            ...privacySettings,
            profileVisibility: remoteSettings.profileVisibility,
            progressSharing: remoteSettings.progressSharing,
          });
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
  }, [user?.userId]);

  // Sync to Backend
  const syncSettingToBackend = async (key: string, value: boolean) => {
    if (!user?.userId) return;

    // Construct payload based on current state + change
    const payload = {
      studyReminders: notificationPreferences?.studyReminders,
      streakReminders: notificationPreferences?.streakReminders,
      soundEnabled: notificationPreferences?.soundEnabled,
      vibrationEnabled: notificationPreferences?.vibrationEnabled,
      profileVisibility: privacySettings.profileVisibility,
      progressSharing: privacySettings.progressSharing,
      [key]: value // Override with new value
    };

    try {
      await privateClient.patch(`/api/v1/user-settings/${user.userId}`, payload);
    } catch (error) {
      console.error("Failed to sync setting", error);
      Alert.alert(t('errors.server'), "Failed to save setting");
    }
  };

  const handleToggleNotification = (field: keyof NotificationPreferences) => {
    const newValue = !notificationPreferences![field];
    toggleNotification(field, newValue);
    syncSettingToBackend(field, newValue);
  };

  const handleTogglePrivacy = (field: keyof typeof privacySettings) => {
    const newValue = !privacySettings[field];
    togglePrivacy(field, newValue);
    syncSettingToBackend(field, newValue);
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

  const renderToggleItem = (
    label: string,
    value: boolean | undefined,
    onToggle: () => void,
    icon: string,
    color: string
  ) => (
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
        value={value ?? false}
      />
    </View>
  );

  const renderLinkItem = (label: string, icon: string, color: string, onPress: () => void) => (
    <TouchableOpacity style={styles.linkRow} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}1A` }]}>
        <Icon name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.linkLabel}>{label}</Text>
      <Icon name="chevron-right" size={24} color="#9CA3AF" />
    </TouchableOpacity>
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

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.notifications')}</Text>
          <View style={styles.card}>
            {renderToggleItem(
              t('settings.studyReminders'),
              notificationPreferences?.studyReminders,
              () => handleToggleNotification('studyReminders'),
              'alarm',
              '#F59E0B'
            )}
            <View style={styles.separator} />
            {renderToggleItem(
              t('settings.streakReminders'),
              notificationPreferences?.streakReminders,
              () => handleToggleNotification('streakReminders'),
              'whatshot',
              '#EF4444'
            )}
            <View style={styles.separator} />
            {renderToggleItem(
              t('settings.soundEnabled'),
              notificationPreferences?.soundEnabled,
              () => handleToggleNotification('soundEnabled'),
              'volume-up',
              '#10B981'
            )}
            <View style={styles.separator} />
            {renderToggleItem(
              t('settings.vibrationEnabled'),
              notificationPreferences?.vibrationEnabled,
              () => handleToggleNotification('vibrationEnabled'),
              'vibration',
              '#6366F1'
            )}
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.privacy')}</Text>
          <View style={styles.card}>
            {renderToggleItem(
              t('settings.profileVisibility'),
              privacySettings?.profileVisibility,
              () => handleTogglePrivacy('profileVisibility'),
              'visibility',
              '#3B82F6'
            )}
            <View style={styles.separator} />
            {renderToggleItem(
              t('settings.progressSharing'),
              privacySettings?.progressSharing,
              () => handleTogglePrivacy('progressSharing'),
              'share',
              '#8B5CF6'
            )}
          </View>
        </View>

        {/* General / Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.general')}</Text>
          <View style={styles.card}>
            {renderLinkItem(
              t('settings.about'),
              'info',
              '#6B7280',
              () => gotoTab('Profile', 'AboutScreen')
            )}
            <View style={styles.separator} />
            {renderLinkItem(
              t('settings.helpSupport'),
              'help',
              '#06B6D4',
              () => gotoTab('Profile', 'HelpSupportScreen')
            )}
            <View style={styles.separator} />
            {renderLinkItem(
              t('settings.userManagement'),
              'manage-accounts',
              '#F43F5E',
              () => gotoTab('Profile', 'EnhancedUserManagement')
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  container: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', paddingHorizontal: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },

  // Toggle Row
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  toggleLabel: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },

  // Link Row
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  linkLabel: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },

  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 50 },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444', marginLeft: 10 },
});

export default SettingsScreen;