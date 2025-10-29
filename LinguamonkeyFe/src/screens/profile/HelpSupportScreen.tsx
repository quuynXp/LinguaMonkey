import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { createScaledSheet } from '../../utils/scaledStyles';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface SupportOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
}

const HelpSupportScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const faqData: FAQItem[] = [
    {
      id: '1',
      question: t('help.faq.changeLanguage.q'),
      answer: t('help.faq.changeLanguage.a'),
      category: 'learning',
    },
    {
      id: '2',
      question: t('help.faq.streakLost.q'),
      answer: t('help.faq.streakLost.a'),
      category: 'learning',
    },
    {
      id: '3',
      question: t('help.faq.changePassword.q'),
      answer: t('help.faq.changePassword.a'),
      category: 'account',
    },
    {
      id: '4',
      question: t('help.faq.offlineSupport.q'),
      answer: t('help.faq.offlineSupport.a'),
      category: 'technical',
    },
    {
      id: '5',
      question: t('help.faq.contactSupport.q'),
      answer: t('help.faq.contactSupport.a'),
      category: 'support',
    },
  ];

  const supportOptions: SupportOption[] = [
    {
      id: 'email',
      title: t('help.support.email.title'),
      description: t('help.support.email.desc'),
      icon: 'email',
      action: () => Linking.openURL('mailto:support@linguaviet.com'),
    },
    {
      id: 'chat',
      title: t('help.support.chat.title'),
      description: t('help.support.chat.desc'),
      icon: 'chat',
      action: () => Alert.alert(t('help.support.chat.title'), t('help.support.chat.soon')),
    },
    {
      id: 'community',
      title: t('help.support.community.title'),
      description: t('help.support.community.desc'),
      icon: 'group',
      action: () => Alert.alert(t('help.support.community.title'), t('help.support.community.redirect')),
    },
    {
      id: 'video',
      title: t('help.support.video.title'),
      description: t('help.support.video.desc'),
      icon: 'play-circle',
      action: () => Alert.alert(t('help.support.video.title'), t('help.support.video.redirect')),
    },
  ];

  const filteredFAQ = faqData.filter(
    item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const submitFeedback = () => {
    if (feedbackText.trim()) {
      Alert.alert(
        t('help.feedback.thankYou'),
        t('help.feedback.sent'),
        [{ text: 'OK', onPress: () => setFeedbackText('') }]
      );
    }
  };

  const renderFAQItem = (item: FAQItem) => {
    const isExpanded = expandedFAQ === item.id;
    return (
      <TouchableOpacity key={item.id} style={styles.faqItem} onPress={() => toggleFAQ(item.id)}>
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{item.question}</Text>
          <Icon name={isExpanded ? 'expand-less' : 'expand-more'} size={24} color="#6B7280" />
        </View>
        {isExpanded && (
          <View style={styles.faqAnswer}>
            <Text style={styles.faqAnswerText}>{item.answer}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSupportOption = (option: SupportOption) => (
    <TouchableOpacity key={option.id} style={styles.supportOption} onPress={option.action}>
      <View style={styles.supportIcon}>
        <Icon name={option.icon} size={24} color="#4F46E5" />
      </View>
      <View style={styles.supportContent}>
        <Text style={styles.supportTitle}>{option.title}</Text>
        <Text style={styles.supportDescription}>{option.description}</Text>
      </View>
      <Icon name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('help.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Icon name="help-outline" size={50} color="#4F46E5" style={styles.welcomeAnimation} />
            <Text style={styles.welcomeTitle}>{t('help.welcome.title')}</Text>
            <Text style={styles.welcomeText}>{t('help.welcome.subtitle')}</Text>
          </View>

          {/* Search */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('help.search.placeholder')}
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* FAQ Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('help.faq.title')}</Text>
            <View style={styles.faqContainer}>{filteredFAQ.map(renderFAQItem)}</View>
          </View>

          {/* Support Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('help.support.title')}</Text>
            <View style={styles.supportContainer}>{supportOptions.map(renderSupportOption)}</View>
          </View>

          {/* Feedback Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('help.feedback.title')}</Text>
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackLabel}>{t('help.feedback.label')}</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder={t('help.feedback.placeholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={feedbackText}
                onChangeText={setFeedbackText}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.feedbackButton, !feedbackText.trim() && styles.feedbackButtonDisabled]}
                onPress={submitFeedback}
                disabled={!feedbackText.trim()}
              >
                <Text
                  style={[
                    styles.feedbackButtonText,
                    !feedbackText.trim() && styles.feedbackButtonTextDisabled,
                  ]}
                >
                  {t('help.feedback.submit')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* App Info */}
          <View style={styles.appInfoSection}>
            <Text style={styles.appInfoTitle}>{t('help.appInfo.title')}</Text>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>{t('help.appInfo.version')}</Text>
              <Text style={styles.appInfoValue}>1.0.0</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>{t('help.appInfo.lastUpdate')}</Text>
              <Text style={styles.appInfoValue}>15/12/2024</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>{t('help.appInfo.os')}</Text>
              <Text style={styles.appInfoValue}>iOS/Android</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  placeholder: { width: 24 },
  content: { flex: 1 },
  scrollContent: { padding: 20 },
  welcomeSection: { alignItems: 'center', marginBottom: 30 },
  welcomeAnimation: { width: 120, height: 120, marginBottom: 16 },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  searchSection: { marginBottom: 30 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#1F2937', marginLeft: 12 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  faqContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  faqItem: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginRight: 12,
  },
  faqAnswer: { paddingHorizontal: 16, paddingBottom: 16 },
  faqAnswerText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  supportContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  supportIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  supportContent: { flex: 1 },
  supportTitle: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
  supportDescription: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  feedbackContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  feedbackLabel: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    height: 100,
    marginBottom: 16,
  },
  feedbackButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  feedbackButtonDisabled: { backgroundColor: '#E5E7EB' },
  feedbackButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  feedbackButtonTextDisabled: { color: '#9CA3AF' },
  appInfoSection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16 },
  appInfoTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  appInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  appInfoLabel: { fontSize: 14, color: '#6B7280' },
  appInfoValue: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
});

export default HelpSupportScreen;
