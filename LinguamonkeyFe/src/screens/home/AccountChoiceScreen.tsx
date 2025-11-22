import { useEffect, useRef } from "react"
import { Animated, Text, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation, Trans } from "react-i18next"; // <-- 1. IMPORT
import { createScaledSheet } from "../../utils/scaledStyles";

const AccountChoiceScreen = ({ navigation }) => {
  const { t } = useTranslation(); // <-- 2. KHỞI TẠO HOOK
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

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
    ]).start()
  }, [])

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
        {/* App Title */}
        <Text style={styles.appTitle}>{t('common.appName')}</Text>
        <Text style={styles.appSubtitle}>{t('auth.choice.subtitle')}</Text>

        {/* Account Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, styles.loginButton]}
            onPress={() => navigation.navigate("LoginScreen")}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <Icon name="login" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{t('auth.choice.signInTitle')}</Text>
              <Text style={styles.optionDescription}>{t('auth.choice.signInDescription')}</Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, styles.registerButton]}
            onPress={() => navigation.navigate("RegisterScreen")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, styles.registerIcon]}>
              <Icon name="person-add" size={32} color="#10B981" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.registerTitle]}>{t('auth.choice.createAccountTitle')}</Text>
              <Text style={[styles.optionDescription, styles.registerDescription]}>
                {t('auth.choice.createAccountDescription')}
              </Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#10B981" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, styles.quickStartButton]}
            onPress={() => navigation.navigate("SetupInitScreen")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, styles.quickStartIcon]}>
              <Icon name="flash-on" size={32} color="#F59E0B" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.quickStartTitle]}>{t('auth.choice.startNowTitle')}</Text>
              <Text style={[styles.optionDescription, styles.quickStartDescription]}>
                {t('auth.choice.startNowDescription')}
              </Text>
            </View>
            <Icon name="arrow-forward" size={24} color="#F59E0B" />
          </TouchableOpacity>
        </View>

        {/* Terms and Privacy */}
        {/*           3. SỬ DỤNG COMPONENT `Trans`
          Giả sử key trong file JSON của bạn là:
          "auth.choice.termsAndPolicy": "By continuing, you agree to our <1>Terms of Service</1> and <3>Privacy Policy</3>"
        */}
        <Trans
          i18nKey="auth.choice.termsAndPolicy"
          parent={Text} // Bọc toàn bộ bằng component <Text>
          style={styles.termsText} // Áp dụng style cho <Text> cha
          components={{
            1: <Text style={styles.linkText} />, // Ánh xạ <1>...<1/>
            3: <Text style={styles.linkText} />, // Ánh xạ <3>...<3/>
          }}
        />
      </Animated.View>
    </View>
  )
}

const styles = createScaledSheet({
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
  welcomeAnimation: {
    width: 200,
    height: 200,
    marginBottom: 32,
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
    marginBottom: 48,
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
  loginButton: {
    backgroundColor: "#4F46E5",
  },
  registerButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  quickStartButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#F59E0B",
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
  registerIcon: {
    backgroundColor: "#D1FAE5",
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
  registerTitle: {
    color: "#10B981",
  },
  quickStartTitle: {
    color: "#F59E0B",
  },
  optionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  registerDescription: {
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
})

export default AccountChoiceScreen