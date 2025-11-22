import Icon from 'react-native-vector-icons/MaterialIcons';
import React, { useRef, useMemo, useCallback } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useLanguages } from '../../hooks/useLanguages';
import { LanguageResponse } from '../../types/dto'; // Import PageResponse
import { showToast } from '../../components/Toast';
import { useUserStore } from '../../stores/UserStore'; // Sửa lỗi đường dẫn store

// Giả định hàm helper để thêm cờ
const getFlagEmoji = (code: string) => {
  const flags: { [key: string]: string } = {
    ZH: '🇨🇳', EN: '🇺🇸', JA: '🇯🇵', KO: '🇰🇷', FR: '🇫🇷', VI: '🇻🇳', ES: '🇪🇸'
  };
  return flags[code.toUpperCase()] || '🌐';
};

const LanguageManagementScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { useAllLanguages } = useLanguages();
  const { languages: userLanguageCodes, setProfileData } = useUserStore();

  // rawData có kiểu PageResponse<LanguageResponse> | undefined
  const { data: rawData, isLoading } = useAllLanguages({ size: 100 });

  const { learningLanguages, availableLanguages } = useMemo(() => {
    // Ép kiểu data thành LanguageResponse[] an toàn hơn
    const allLanguages: LanguageResponse[] = (rawData?.data || []) as LanguageResponse[];
    const learningSet = new Set(userLanguageCodes);

    const learning: LanguageResponse[] = [];
    const available: LanguageResponse[] = [];

    // Lỗi Typescript được giải quyết bằng cách đảm bảo allLanguages có kiểu LanguageResponse[]
    allLanguages.forEach(lang => {
      if (learningSet.has(lang.languageCode)) {
        learning.push(lang);
      } else {
        available.push(lang);
      }
    });

    return { learningLanguages: learning, availableLanguages: available };
  }, [rawData, userLanguageCodes]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Giả định API/Store có mutation để cập nhật trạng thái hoạt động (Dù không có trong schema hiện tại)
  const toggleLanguage = useCallback(async (languageCode: string, currentStatus: boolean) => {
    // Logic thực tế: Cần call API PATCH /api/v1/users/{userId}/languages/{languageCode}/status
    showToast({ message: t('management.toggleLanguageMock'), type: 'info' });
  }, [t]);

  const addLanguage = useCallback(async (language: LanguageResponse) => {
    Alert.alert(
      t('management.addLanguageTitle'),
      t('management.addLanguageConfirm', { name: language.languageName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.add'),
          onPress: async () => {
            try {
              // Cập nhật local store languages (code only)
              setProfileData({ languages: [...userLanguageCodes, language.languageCode] });

              // Thực tế: Cần call API POST /api/v1/users/{userId}/languages
              showToast({ message: t('management.addLanguageSuccess', { name: language.languageName }), type: 'success' });
            } catch (error) {
              showToast({ message: t('errors.addLanguageFailed'), type: 'error' });
            }
          },
        },
      ]
    );
  }, [userLanguageCodes, setProfileData, t]);

  const removeLanguage = useCallback(async (languageCode: string) => {
    const language = learningLanguages.find(lang => lang.languageCode === languageCode);
    if (!language) return;

    Alert.alert(
      t('management.removeLanguageTitle'),
      t('management.removeLanguageConfirm', { name: language.languageName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Cập nhật local store languages (code only)
              setProfileData({ languages: userLanguageCodes.filter(code => code !== languageCode) });

              // Thực tế: Cần call API DELETE /api/v1/users/{userId}/languages/{languageCode}
              showToast({ message: t('management.removeLanguageSuccess'), type: 'success' });
            } catch (error) {
              showToast({ message: t('errors.removeLanguageFailed'), type: 'error' });
            }
          },
        },
      ]
    );
  }, [learningLanguages, userLanguageCodes, setProfileData, t]);

  const renderLanguageCard = useCallback((language: LanguageResponse, isLearning: boolean = true) => {
    const languageCode = language.languageCode;

    // Giả định isActive là true nếu đang trong danh sách Learning
    const isActive = isLearning;

    return (
      <View key={languageCode} style={styles.languageCard}>
        <View style={styles.languageHeader}>
          <View style={styles.languageInfo}>
            <Text style={styles.languageFlag}>{getFlagEmoji(languageCode)}</Text>
            <View style={styles.languageDetails}>
              <Text style={styles.languageName}>{language.languageName}</Text>
              <Text style={styles.languageNative}>{language.languageCode}</Text>
              {isLearning && <Text style={styles.languageLevel}>{t('level.inProgress')}</Text>}
            </View>
          </View>

          {isLearning ? (
            <View style={styles.languageActions}>
              <Switch
                value={isActive}
                onValueChange={(value) => toggleLanguage(languageCode, value)}
                trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
                thumbColor="#FFFFFF"
              />
              <TouchableOpacity
                onPress={() => removeLanguage(languageCode)}
                style={styles.removeButton}
              >
                <Icon name="delete" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => addLanguage(language)}
              style={styles.addButton}
            >
              <Icon name="add" size={24} color="#4F46E5" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [addLanguage, removeLanguage, toggleLanguage, t]);

  if (isLoading) {
    return (
      <ScreenLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>{t('common.loadingLanguages')}</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('management.screenTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('management.learningTitle', { count: learningLanguages.length })}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('management.learningSubtitle')}
            </Text>
            {learningLanguages.map(language => renderLanguageCard(language, true))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('management.availableTitle')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('management.availableSubtitle')}
            </Text>
            {availableLanguages.map(language => renderLanguageCard(language, false))}
          </View>

          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Icon name="lightbulb" size={24} color="#4F46E5" style={styles.tipsIcon} />
              <Text style={styles.tipsTitle}>{t('management.tipsTitle')}</Text>
            </View>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  {t('management.tip1')}
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  {t('management.tip2')}
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  {t('management.tip3')}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4F46E5',
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
  section: {
    marginBottom: 30,
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
    marginBottom: 16,
  },
  languageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 12,
  },
  languageDetails: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  languageNative: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  languageLevel: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
    marginTop: 2,
  },
  languageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  tipsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsIcon: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default LanguageManagementScreen;