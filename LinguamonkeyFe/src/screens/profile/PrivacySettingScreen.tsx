import React, { useRef } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/appStore';
import { createScaledSheet } from '../../utils/scaledStyles';

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'toggle' | 'action';
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

const PrivacySettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { privacySettings, setPrivacySettings, resetPrivacySettings } = useAppStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const updateSetting = (key: string, value: boolean) => {
    setPrivacySettings({ [key]: value });
  };

  const exportData = () => {
    Alert.alert(t('privacy.exportData'), t('privacy.exportDataMessage'));
  };

  const deleteData = () => {
    Alert.alert(
      t('privacy.deleteDataConfirmTitle'),
      t('privacy.deleteDataConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const privacySettingsItems: PrivacySetting[] = [
    {
      id: 'profile-visibility',
      title: t('privacy.profileVisibility'),
      description: t('privacy.profileVisibilityDesc'),
      icon: 'visibility',
      type: 'toggle',
      value: privacySettings.profileVisibility,
      onToggle: (value) => updateSetting('profileVisibility', value),
    },
    {
      id: 'progress-sharing',
      title: t('privacy.progressSharing'),
      description: t('privacy.progressSharingDesc'),
      icon: 'share',
      type: 'toggle',
      value: privacySettings.progressSharing,
      onToggle: (value) => updateSetting('progressSharing', value),
    },
    {
      id: 'location-tracking',
      title: t('privacy.locationTracking'),
      description: t('privacy.locationTrackingDesc'),
      icon: 'location-on',
      type: 'toggle',
      value: privacySettings.locationTracking,
      onToggle: (value) => updateSetting('locationTracking', value),
    },
    {
      id: 'contact-sync',
      title: t('privacy.contactSync'),
      description: t('privacy.contactSyncDesc'),
      icon: 'contacts',
      type: 'toggle',
      value: privacySettings.contactSync,
      onToggle: (value) => updateSetting('contactSync', value),
    },
  ];

  const dataAnalyticsSettings: PrivacySetting[] = [
    {
      id: 'data-collection',
      title: t('privacy.dataCollection'),
      description: t('privacy.dataCollectionDesc'),
      icon: 'data-usage',
      type: 'toggle',
      value: privacySettings.dataCollection,
      onToggle: (value) => updateSetting('dataCollection', value),
    },
    {
      id: 'personalization',
      title: t('privacy.personalization'),
      description: t('privacy.personalizationDesc'),
      icon: 'tune',
      type: 'toggle',
      value: privacySettings.personalization,
      onToggle: (value) => updateSetting('personalization', value),
    },
    {
      id: 'analytics',
      title: t('privacy.analytics'),
      description: t('privacy.analyticsDesc'),
      icon: 'analytics',
      type: 'toggle',
      value: privacySettings.analytics,
      onToggle: (value) => updateSetting('analytics', value),
    },
    {
      id: 'crash-reports',
      title: t('privacy.crashReports'),
      description: t('privacy.crashReportsDesc'),
      icon: 'bug-report',
      type: 'toggle',
      value: privacySettings.crashReports,
      onToggle: (value) => updateSetting('crashReports', value),
    },
  ];

  const dataManagementSettings: PrivacySetting[] = [
    {
      id: 'export-data',
      title: t('privacy.exportData'),
      description: t('privacy.exportDataDesc'),
      icon: 'file-download',
      type: 'action',
      onPress: exportData,
    },
    {
      id: 'delete-data',
      title: t('privacy.deleteData'),
      description: t('privacy.deleteDataDesc'),
      icon: 'delete-forever',
      type: 'action',
      onPress: deleteData,
    },
  ];

  const renderSettingItem = (item: PrivacySetting, isDangerous = false) => (
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
        <Text style={styles.headerTitle}>{t('privacy.settingsTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Privacy Notice */}
          <View style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Icon name="security" size={24} color="#4F46E5" />
              <Text style={styles.noticeTitle}>{t('privacy.privacyNoticeTitle')}</Text>
            </View>
            <Text style={styles.noticeText}>{t('privacy.privacyNoticeDesc')}</Text>
          </View>

          {renderSection(
            t('privacy.privacySection'),
            t('privacy.privacySubtitle'),
            privacySettingsItems
          )}

          {renderSection(
            t('privacy.dataAnalyticsSection'),
            t('privacy.dataAnalyticsSubtitle'),
            dataAnalyticsSettings
          )}

          {renderSection(
            t('privacy.dataManagementSection'),
            t('privacy.dataManagementSubtitle'),
            dataManagementSettings,
            true
          )}

          {/* Legal Documents */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.legalSection')}</Text>
            <View style={styles.sectionContent}>
              {[
                { id: 'privacy-policy', title: t('privacy.privacyPolicy'), icon: 'policy', url: 'https://linguaviet.com/privacy' },
                { id: 'terms-of-use', title: t('privacy.termsOfUse'), icon: 'description', url: 'https://linguaviet.com/terms' },
                { id: 'cookie-policy', title: t('privacy.cookiePolicy'), icon: 'cookie', url: 'https://linguaviet.com/cookies' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.settingItem}
                  onPress={() => navigation.navigate('WebView', { url: item.url })}
                >
                  <View style={styles.settingIcon}>
                    <Icon name={item.icon} size={20} color="#4F46E5" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>{item.title}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>{t('privacy.contactSection')}</Text>
            <Text style={styles.contactText}>{t('privacy.contactText')}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
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
  contactSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default PrivacySettingsScreen;