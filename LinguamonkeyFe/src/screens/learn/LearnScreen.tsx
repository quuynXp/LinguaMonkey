import Icon from 'react-native-vector-icons/MaterialIcons'; 
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const LearnScreen = ({ navigation }) => {
  const languages = [
    {
      id: 1,
      name: 'Tiếng Trung',
      flag: '🇨🇳',
      progress: 65,
      lessons: 24,
      color: '#EF4444',
    },
    {
      id: 2,
      name: 'Tiếng Anh',
      flag: '🇺🇸',
      progress: 45,
      lessons: 18,
      color: '#3B82F6',
    },
  ];

  const categories = [
    { id: 1, name: 'Nghe', icon: 'hearing', screen: 'ListeningScreen', lessons: 10 },
    { id: 2, name: 'Nói', icon: 'record-voice-over', screen: 'SpeakingScreen', lessons: 8 },
    { id: 3, name: 'Đọc', icon: 'menu-book', screen: 'ReadingScreen', lessons: 12 },
    { id: 4, name: 'Viết', icon: 'edit', screen: 'WritingScreen', lessons: 7 },
    { id: 5, name: 'Luyện nghe', icon: 'edit', screen: 'AdvancedListening', lessons: 7 },
    { id: 6, name: 'IPA', icon: 'edit', screen: 'AdvancedSpeaking', lessons: 7 },
    { id: 7, name: 'Học chứng chỉ', icon: 'school', screen: 'CertificationLearning', lessons: 7 },
    { id: 8, name: 'Quiz', icon: 'quiz', screen: 'InteractiveQuiz', lessons: 7 },

  ];

  const dailyChallenges = [
    {
      id: 'vocab',
      title: 'Thử thách từ vựng',
      icon: "videogame-asset",
      description: 'Game',
      screen: 'MillionaireGame', // tên màn hình
    },
    {
      id: 'flashcard',
      title: 'Học từ vựng với flashcard',
      icon: "style",
      description: 'Học 10 từ mới trong 5 phút',
      screen: 'VocabularyFlashcards', // tên màn hình
    },
    {
      id: 'game',
      title: 'Game chỉ đường cho người lạ',
      description: 'Game vui',
      icon: "directions",
      screen: 'GameBasedLearning',
    },
    {
      id: 'karaoke',
      title: 'Karaoke',
      icon: "mic",
      description: 'Karaoke',
      screen: 'KaraokeLearning',
    },
    {
      id: 'quiz',
      title: 'Đố vui',
      icon: "quiz",
      description: 'Quizlet',
      screen: 'QuizLearning',
    },
  ];



  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Học tập</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Icon name="settings" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Language Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chọn ngôn ngữ</Text>
        <View style={styles.languageGrid}>
          {languages.map((language) => (
            <TouchableOpacity
              key={language.id}
              style={[styles.languageCard, { borderColor: language.color }]}
            >
              <View style={styles.languageHeader}>
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text style={styles.languageName}>{language.name}</Text>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${language.progress}%`, backgroundColor: language.color },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{language.progress}%</Text>
              </View>
              <Text style={styles.lessonsText}>{language.lessons} bài học</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danh mục</Text>
        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => navigation.navigate(category.screen)}
            >
              <View style={styles.categoryIcon}>
                <Icon name={category.icon} size={24} color="#4F46E5" />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryLessons}>{category.lessons} bài</Text>
            </TouchableOpacity>
          ))}

        </View>
      </View>

      {/* Daily Challenge */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thử thách hàng ngày</Text>
        {dailyChallenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            style={styles.challengeCard}
            onPress={() => navigation.navigate(challenge.screen)}
          >
            <View style={styles.challengeContent}>
              <View style={styles.challengeIcon}>
                <Icon name={challenge.icon} size={32} color="#F59E0B" />
              </View>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDescription}>{challenge.description}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  settingsButton: {
    padding: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  languageGrid: {
    gap: 12,
  },
  languageCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  lessonsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#EEF2FF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryLessons: {
    fontSize: 12,
    color: '#6B7280',
  },
  challengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 5,
    marginBottom: 5,
    elevation: 3,
  },
  challengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  challengeIcon: {
    marginRight: 16,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default LearnScreen;