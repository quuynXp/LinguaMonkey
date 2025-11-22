import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { gotoTab } from '../../utils/navigationRef';

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const settingsItems = [
    {
      label: t('settings.privacy'),
      icon: 'lock',
      screen: 'PrivacySettings',
    },
    {
      label: t('settings.notifications'),
      icon: 'notifications',
      screen: 'NotificationSettingsScreen',
    },
    {
      label: t('settings.transactionHistory'),
      icon: 'history',
      screen: 'TransactionHistoryScreen',
    },
    {
      label: t('settings.leaderboard'),
      icon: 'leaderboard',
      screen: 'Leaderboard',
    },
    {
      label: t('settings.about'),
      icon: 'info',
      screen: 'About',
    },
    {
      label: t('settings.userManagement'),
      icon: 'people',
      screen: 'EnhancedUserManagement',
    },
  ];

  const handleNavigate = (screen: string) => {
    gotoTab('Profile', screen);
  };

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title', 'Settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          {settingsItems.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.actionButton}
              onPress={() => handleNavigate(item.screen)}
            >
              <Icon name={item.icon as any} size={22} color="#4F46E5" />
              <Text style={styles.actionText}>{item.label}</Text>
              <Icon name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  container: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 16,
  },
});

export default SettingsScreen;