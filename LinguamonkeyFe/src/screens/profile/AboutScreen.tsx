import React, { useRef } from 'react';
import {
  Animated,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';

const AboutScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const teamMembers = [
    { name: 'Thai Ngoc Quyen', role: t('about.team.roles.ceo'), avatar: '👨‍💼' },
  ];

  const features = [
    {
      icon: 'school',
      title: t('about.features.smartLearning.title'),
      description: t('about.features.smartLearning.desc'),
    },
    {
      icon: 'chat',
      title: t('about.features.aiChat.title'),
      description: t('about.features.aiChat.desc'),
    },
    {
      icon: 'trending-up',
      title: t('about.features.progress.title'),
      description: t('about.features.progress.desc'),
    },
    {
      icon: 'group',
      title: t('about.features.community.title'),
      description: t('about.features.community.desc'),
    },
  ];

  const socialLinks = [
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/linguaviet' },
    { name: 'Instagram', icon: 'camera-alt', url: 'https://instagram.com/linguaviet' },
    { name: 'Twitter', icon: 'alternate-email', url: 'https://twitter.com/linguaviet' },
    { name: 'YouTube', icon: 'play-circle', url: 'https://youtube.com/linguaviet' },
  ];

  const openLink = (url: string) => Linking.openURL(url);

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('about.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.scrollContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* App Info */}
          <View style={styles.appSection}>
            <Text style={styles.appName}>LinguaViet</Text>
            <Text style={styles.appTagline}>{t('about.tagline')}</Text>
            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>{t('about.version', { version: '1.0.0' })}</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>{t('about.latest')}</Text>
              </View>
            </View>
          </View>

          {/* Mission */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('about.mission.title')}</Text>
            <View style={styles.missionCard}>
              <Text style={styles.missionText}>{t('about.mission.content')}</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('about.features.title')}</Text>
            <View style={styles.featuresGrid}>
              {features.map((f, i) => (
                <View key={i} style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Icon name={f.icon} size={24} color="#4F46E5" />
                  </View>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDescription}>{f.description}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Team */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('about.team.title')}</Text>
            <View style={styles.teamGrid}>
              {teamMembers.map((m, i) => (
                <View key={i} style={styles.teamCard}>
                  <Text style={styles.teamAvatar}>{m.avatar}</Text>
                  <Text style={styles.teamName}>{m.name}</Text>
                  <Text style={styles.teamRole}>{m.role}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('about.stats.title')}</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>100K+</Text>
                <Text style={styles.statLabel}>{t('about.stats.users')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>50+</Text>
                <Text style={styles.statLabel}>{t('about.stats.countries')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>1M+</Text>
                <Text style={styles.statLabel}>{t('about.stats.lessons')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>4.8★</Text>
                <Text style={styles.statLabel}>{t('about.stats.reviews')}</Text>
              </View>
            </View>
          </View>

          {/* Social */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('about.social.title')}</Text>
            <View style={styles.socialContainer}>
              {socialLinks.map((s, i) => (
                <TouchableOpacity key={i} style={styles.socialButton} onPress={() => openLink(s.url)}>
                  <Icon name={s.icon} size={24} color="#4F46E5" />
                  <Text style={styles.socialText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Legal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('about.legal.title')}</Text>
            <View style={styles.legalContainer}>
              <TouchableOpacity style={styles.legalItem}>
                <Icon name="description" size={20} color="#6B7280" />
                <Text style={styles.legalText}>{t('about.legal.terms')}</Text>
                <Icon name="open-in-new" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.legalItem}>
                <Icon name="security" size={20} color="#6B7280" />
                <Text style={styles.legalText}>{t('about.legal.privacy')}</Text>
                <Icon name="open-in-new" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.legalItem}>
                <Icon name="email" size={20} color="#6B7280" />
                <Text style={styles.legalText}>{t('about.legal.contact')}</Text>
                <Icon name="open-in-new" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Copyright */}
          <View style={styles.copyrightSection}>
            <Text style={styles.copyrightText}>{t('about.copyright')}</Text>
            <Text style={styles.copyrightSubtext}>{t('about.madeWithLove')}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
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
  appSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  logoAnimation: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  versionBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  versionBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  missionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'justify',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  teamAvatar: {
    fontSize: 32,
    marginBottom: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  teamRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  socialContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  socialText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
  },
  legalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  legalText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  copyrightSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  copyrightText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  copyrightSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default AboutScreen;