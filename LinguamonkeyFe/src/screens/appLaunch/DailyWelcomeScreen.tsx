import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useUserStore } from "../../stores/UserStore";
import { resetToTab, resetToAuth } from "../../utils/navigationRef";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { getGreetingKey, getRandomQuote, getTimeBasedEmoji } from "../../utils/motivationHelper";
import { useTranslation } from "react-i18next";
import { createScaledSheet } from "../../utils/scaledStyles";

type RootStackParamList = {
  DailyWelcome: undefined;
  Auth: undefined;
};

type DailyWelcomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'DailyWelcome'>;
};

const DailyWelcomeScreen = ({ navigation }: DailyWelcomeScreenProps) => {
  const { user, nativeLanguageId, trackDailyWelcome } = useUserStore();
  const { t } = useTranslation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const [quote, setQuote] = useState({ id: '0', text: '' });
  const [greetingTime, setGreetingTime] = useState('');

  useEffect(() => {
    if (!user?.userId) {
      resetToAuth();
      return;
    }

    const recordDailyWelcome = async () => {
      try {
        await trackDailyWelcome();
      } catch (error) {
        console.error("Failed to record daily welcome:", error);
      }
    };

    recordDailyWelcome();

    setGreetingTime(getGreetingKey());
    setQuote(getRandomQuote(nativeLanguageId));

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [user?.userId, nativeLanguageId, trackDailyWelcome]);

  const displayGreetingName = user?.fullname?.split(' ')[0] || user?.nickname || t("label.learner");

  return (
    <ScreenLayout backgroundColor="#F8FAFC">
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => resetToTab('Home')}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Greeting Section */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingEmoji}>{getTimeBasedEmoji()}</Text>
          <Text style={styles.greetingTitle}>
            {/* Bọc chuỗi t(greetingTime) và displayGreetingName trong Text component */}
            {t(greetingTime)}, {displayGreetingName}
          </Text>
          <Text style={styles.greetingSubtitle}>{t("welcome.subtitle")}</Text>
        </View>

        {/* Streak Card */}
        <Animated.View style={[styles.streakCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.streakLeft}>
            <Text style={styles.streakCount}>{user?.streak || 0}</Text>
            <Text style={styles.streakLabel}>{t("home.dailyStreak")}</Text>
          </View>
          <View style={styles.streakRight}>
            <Icon name="local-fire-department" size={40} color="#F59E0B" />
            <Text style={styles.streakMessage}>
              {t("streakMessage.momentum")}
            </Text>
          </View>
        </Animated.View>

        {/* Motivation Quote */}
        <View style={styles.quoteContainer}>
          <Icon name="format-quote" size={32} color="#4F46E5" style={styles.quoteIcon} />
          <Text style={styles.quoteText}>{quote.text}</Text>
        </View>

        {/* Daily Stats Grid */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>{t("progressSection")}</Text>
          <View style={styles.grid}>
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="school" size={24} color="#10B981" />
              </View>
              <Text style={styles.statLabel}>{t("stats.lessons")}</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: '#F5F3FF' }]}>
                <Icon name="stars" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.statValue}>{user?.exp || 0}</Text>
              <Text style={styles.statLabel}>{t("stats.xp")}</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="schedule" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statLabel}>{t("stats.time")}</Text>
            </View>
          </View>
        </View>

      </Animated.ScrollView>

      {/* Bottom Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => resetToTab('Home', 'HomeMain')}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{t("continueButton")}</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  greetingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  greetingEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  greetingSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  streakCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  streakLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  streakCount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F2937',
  },
  streakLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 4,
  },
  streakRight: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 16,
  },
  streakMessage: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '700',
    marginTop: 4,
  },
  quoteContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: 16,
    left: 16,
    opacity: 0.2,
  },
  quoteText: {
    fontSize: 18,
    color: '#3730A3',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
    zIndex: 1,
  },
  statsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'transparent',
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
});

export default DailyWelcomeScreen;