import Icon from 'react-native-vector-icons/MaterialIcons'; 
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

interface Language {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  level: string;
  progress: number;
  isActive: boolean;
  lessonsCompleted: number;
  totalLessons: number;
  wordsLearned: number;
}

const LanguageManagementScreen = ({ navigation }) => {
  const [languages, setLanguages] = useState<Language[]>([
    {
      id: 'chinese',
      name: 'Tiếng Trung',
      nativeName: '中文',
      flag: '🇨🇳',
      level: 'Sơ cấp',
      progress: 65,
      isActive: true,
      lessonsCompleted: 24,
      totalLessons: 50,
      wordsLearned: 156,
    },
    {
      id: 'english',
      name: 'Tiếng Anh',
      nativeName: 'English',
      flag: '🇺🇸',
      level: 'Trung cấp',
      progress: 45,
      isActive: true,
      lessonsCompleted: 18,
      totalLessons: 40,
      wordsLearned: 98,
    },
  ]);

  const [availableLanguages] = useState<Language[]>([
    {
      id: 'japanese',
      name: 'Tiếng Nhật',
      nativeName: '日本語',
      flag: '🇯🇵',
      level: 'Chưa bắt đầu',
      progress: 0,
      isActive: false,
      lessonsCompleted: 0,
      totalLessons: 45,
      wordsLearned: 0,
    },
    {
      id: 'korean',
      name: 'Tiếng Hàn',
      nativeName: '한국어',
      flag: '🇰🇷',
      level: 'Chưa bắt đầu',
      progress: 0,
      isActive: false,
      lessonsCompleted: 0,
      totalLessons: 42,
      wordsLearned: 0,
    },
    {
      id: 'french',
      name: 'Tiếng Pháp',
      nativeName: 'Français',
      flag: '🇫🇷',
      level: 'Chưa bắt đầu',
      progress: 0,
      isActive: false,
      lessonsCompleted: 0,
      totalLessons: 38,
      wordsLearned: 0,
    },
  ]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleLanguage = (languageId: string) => {
    setLanguages(prev =>
      prev.map(lang =>
        lang.id === languageId
          ? { ...lang, isActive: !lang.isActive }
          : lang
      )
    );
  };

  const addLanguage = (language: Language) => {
    Alert.alert(
      'Thêm ngôn ngữ',
      `Bạn có muốn bắt đầu học ${language.name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thêm',
          onPress: () => {
            setLanguages(prev => [...prev, { ...language, isActive: true }]);
          },
        },
      ]
    );
  };

  const removeLanguage = (languageId: string) => {
    const language = languages.find(lang => lang.id === languageId);
    Alert.alert(
      'Xóa ngôn ngữ',
      `Bạn có chắc chắn muốn xóa ${language?.name}? Tất cả tiến độ sẽ bị mất.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            setLanguages(prev => prev.filter(lang => lang.id !== languageId));
          },
        },
      ]
    );
  };

  const renderLanguageCard = (language: Language, isLearning: boolean = true) => (
    <View key={language.id} style={styles.languageCard}>
      <View style={styles.languageHeader}>
        <View style={styles.languageInfo}>
          <Text style={styles.languageFlag}>{language.flag}</Text>
          <View style={styles.languageDetails}>
            <Text style={styles.languageName}>{language.name}</Text>
            <Text style={styles.languageNative}>{language.nativeName}</Text>
            <Text style={styles.languageLevel}>{language.level}</Text>
          </View>
        </View>
        
        {isLearning ? (
          <View style={styles.languageActions}>
            <Switch
              value={language.isActive}
              onValueChange={() => toggleLanguage(language.id)}
              trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
              thumbColor="#FFFFFF"
            />
            <TouchableOpacity
              onPress={() => removeLanguage(language.id)}
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

      {isLearning && language.progress > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${language.progress}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{language.progress}%</Text>
        </View>
      )}

      {isLearning && (
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Icon name="school" size={16} color="#6B7280" />
            <Text style={styles.statText}>
              {language.lessonsCompleted}/{language.totalLessons} bài
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="book" size={16} color="#6B7280" />
            <Text style={styles.statText}>{language.wordsLearned} từ</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ngôn ngữ học</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Current Languages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đang học ({languages.length})</Text>
            <Text style={styles.sectionSubtitle}>
              Quản lý các ngôn ngữ bạn đang học
            </Text>
            {languages.map(language => renderLanguageCard(language, true))}
          </View>

          {/* Available Languages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ngôn ngữ khác</Text>
            <Text style={styles.sectionSubtitle}>
              Thêm ngôn ngữ mới để bắt đầu học
            </Text>
            {availableLanguages.map(language => renderLanguageCard(language, false))}
          </View>

          {/* Learning Tips */}
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Icon name="lightbulb" size={24} color="#4F46E5" style={styles.tipsIcon} />
              <Text style={styles.tipsTitle}>Mẹo học tập</Text>
            </View>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  Tập trung vào 1-2 ngôn ngữ để đạt hiệu quả tốt nhất
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  Học đều đặn mỗi ngày, dù chỉ 10-15 phút
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  Thực hành với người bản xứ để cải thiện phát âm
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
    marginBottom: 12,
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