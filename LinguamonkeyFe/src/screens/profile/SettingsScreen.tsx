import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from '../../utils/scaledStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gotoTab } from '../../utils/navigationRef'; // Giả sử bạn dùng gotoTab

// Định nghĩa kiểu cho navigation stack (thay 'Profile' bằng tên stack của bạn nếu khác)
type ProfileStackNavigation = {
  navigate(screen: string): void;
  goBack(): void;
};

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  // Hoặc dùng gotoTab nếu bạn đã cấu hình
  const navigation = useNavigation<ProfileStackNavigation>();

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
    // Dùng gotoTab nếu nó có thể điều hướng trong stack
    // gotoTab('Profile', screen);
    // Hoặc dùng navigation.navigate nếu đây là stack lồng nhau
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title', 'Settings')}</Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      <ScrollView style={styles.container}>
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
    </SafeAreaView>
  );
};

const styles = createScaledSheet({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
    marginLeft: -8, // Căn chỉnh cho đẹp
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16, // Chỉ padding ngang
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
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