import { useEffect, useRef, useState } from "react"
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { gotoTab } from "../../utils/navigationRef";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

const { width, height } = Dimensions.get('window');

type AppLaunchScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const onboardingData = [
  {
    id: 1,
    title: 'welcome.title',
    subtitle: 'welcome.subtitle',
    icon: 'celebration',
    color: '#4F46E5',
  },
  {
    id: 2,
    title: 'aiLearning.title',
    subtitle: 'aiLearning.subtitle',
    icon: 'psychology',
    color: '#10B981',
  },
  {
    id: 3,
    title: 'progress.title',
    subtitle: 'progress.subtitle',
    icon: 'trending-up',
    color: '#F59E0B',
  },
];

const AppLaunchScreen = ({ navigation }: AppLaunchScreenProps) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"new" | "existing" | "quick" | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

  const animateTransition = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      animateTransition(() => setCurrentIndex(currentIndex + 1));
    } else {
      setCurrentIndex(onboardingData.length); // Move to account options
    }
  };

  const handleSkip = () => {
    setCurrentIndex(onboardingData.length); // Skip to account options
  };

  const handleOptionSelect = async (option: "new" | "existing" | "quick") => {
    setSelectedOption(option);
    setTimeout(async () => {
      if (option === "new") {
        gotoTab("Auth", "Register");
      } else if (option === "existing") {
        gotoTab("Auth", "Login");
      } else if (option === "quick") {
        setIsGenerating(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          gotoTab("SetupInitScreen", "SetupInitScreen");
        } catch (error) {
          console.error("Failed to generate account:", error);
        } finally {
          setIsGenerating(false);
        }
      }
    }, 300);
  };

  const currentData = onboardingData[currentIndex];

  if (currentIndex < onboardingData.length) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.animationContainer}>
            <Icon name={currentData.icon} size={120} color={currentData.color} />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>{t(currentData.title)}</Text>
            <Text style={styles.subtitle}>{t(currentData.subtitle)}</Text>
          </View>
        </Animated.View>

        <View style={styles.bottomContainer}>
          <View style={styles.pagination}>
            {onboardingData.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex === onboardingData.length - 1 ? t('onboarding.start') : t('onboarding.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.appTitle}>LinguaMonkey</Text>
        <Text style={styles.appSubtitle}>{t('account.choose')}</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, styles.newAccountButton, selectedOption === "new" && styles.selectedOption]}
            onPress={() => handleOptionSelect("new")}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <Icon name="person-add" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{t('account.startFresh')}</Text>
              <Text style={styles.optionDescription}>{t('account.startFreshDesc')}</Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, styles.existingAccountButton, selectedOption === "existing" && styles.selectedOption]}
            onPress={() => handleOptionSelect("existing")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, styles.existingIcon]}>
              <Icon name="login" size={32} color="#4F46E5" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.existingTitle]}>{t('account.welcomeBack')}</Text>
              <Text style={[styles.optionDescription, styles.existingDescription]}>{t('account.signInDesc')}</Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#4F46E5" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, styles.quickStartButton, selectedOption === "quick" && styles.selectedOption, isGenerating && styles.buttonDisabled]}
            onPress={() => handleOptionSelect("quick")}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, styles.quickStartIcon]}>
              <Icon name="flash-on" size={32} color="#F59E0B" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.quickStartTitle]}>{t('account.quickStart')}</Text>
              <Text style={[styles.optionDescription, styles.quickStartDescription]}>
                {t('account.quickStartDesc')}
              </Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#F59E0B" />
          </TouchableOpacity>
        </View>

        <Text style={styles.termsText}>
          {t('terms.byContinuing')}{' '}
          <Text style={styles.linkText}>{t('terms.termsOfService')}</Text> {t('terms.and')}{' '}
          <Text style={styles.linkText}>{t('terms.privacyPolicy')}</Text>
        </Text>

        <Text style={styles.disclaimerText}>{t('account.disclaimer')}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  skipText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  animationContainer: {
    width: width * 0.8,
    height: height * 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#4F46E5',
    width: 24,
  },
  inactiveDot: {
    backgroundColor: '#D1D5DB',
  },
  nextButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  optionsContainer: {
    width: "100%",
    gap: 16,
    marginBottom: 32,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  newAccountButton: {
    backgroundColor: "#4F46E5",
  },
  existingAccountButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  quickStartButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  selectedOption: {
    transform: [{ scale: 0.98 }],
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  existingIcon: {
    backgroundColor: "#EEF2FF",
  },
  quickStartIcon: {
    backgroundColor: "#FEF3C7",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  existingTitle: {
    color: "#1F2937",
  },
  quickStartTitle: {
    color: "#F59E0B",
  },
  optionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  existingDescription: {
    color: "#6B7280",
  },
  quickStartDescription: {
    color: "#6B7280",
  },
  termsText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    color: "#4F46E5",
    fontWeight: "500",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 16,
  },
});

export default AppLaunchScreen;