import { useEffect, useRef, useState } from "react"
import { Alert, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { sendPasswordReset } from '../../services/authService';
import { createScaledSheet } from "../../utils/scaledStyles";

const ForgotPasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

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

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert(t('error'), t('enterEmail'));
      return
    }

    if (!email.includes("@")) {
      Alert.alert(t('error'), t('validEmail'));
      return
    }

    setIsLoading(true)
    try {
      await sendPasswordReset(email);
      setIsEmailSent(true);
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('resetFailed'));
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setIsLoading(true)
    try {
      await sendPasswordReset(email);
      Alert.alert(t('success'), t('emailResent'));
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('resendFailed'));
    } finally {
      setIsLoading(false)
    }
  }

  if (isEmailSent) {
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Success Animation */}
          
          {/* Success Content */}
          <Text style={styles.successTitle}>{t('checkEmail')}</Text>
          <Text style={styles.successSubtitle}>
            {t('resetLinkSentTo')}{"\n"}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          <View style={styles.instructionsContainer}>
            <View style={styles.instructionItem}>
              <Icon name="email" size={20} color="#10B981" />
              <Text style={styles.instructionText}>{t('checkInboxSpam')}</Text>
            </View>
            <View style={styles.instructionItem}>
              <Icon name="link" size={20} color="#10B981" />
              <Text style={styles.instructionText}>{t('clickResetLink')}</Text>
            </View>
            <View style={styles.instructionItem}>
              <Icon name="lock" size={20} color="#10B981" />
              <Text style={styles.instructionText}>{t('createNewPassword')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.resendButton, isLoading && styles.buttonDisabled]}
            onPress={handleResendEmail}
            disabled={isLoading}
          >
            <Text style={styles.resendButtonText}>{t('resendEmail')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backToLoginButton} onPress={() => navigation.navigate("VerifyCode", { email })}>
            <Text style={styles.backToLoginText}>{t('enterResetCode')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backToLoginButton} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.backToLoginText}>{t('backToSignIn')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    )
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Forgot Password Animation */}
       

        {/* Title */}
        <Text style={styles.title}>{t('forgotPassword')}</Text>
        <Text style={styles.subtitle}>
          {t('enterEmailForReset')}
        </Text>

        {/* Email Input */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon name="email" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('enterEmailAddress')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <TouchableOpacity
            style={[styles.resetButton, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <Icon name="hourglass-top" size={20} color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.resetButtonText}>{t('sendResetLink')}</Text>
                <Icon name="send" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Alternative Options */}
        <View style={styles.alternativeContainer}>
          <Text style={styles.alternativeText}>{t('rememberPassword')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.alternativeLink}>{t('signIn')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alternativeContainer}>
          <Text style={styles.alternativeText}>{t('noAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("SetupInitScreen")}>
            <Text style={styles.alternativeLink}>{t('startNow')}</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 50,
  },
  header: {
    marginBottom: 20,
  },
  forgotAnimation: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginBottom: 24,
  },
  successAnimation: {
    width: 200,
    height: 200,
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#10B981",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  emailText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  formContainer: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 12,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  loadingAnimation: {
    width: 24,
    height: 24,
  },
  instructionsContainer: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
    flex: 1,
  },
  resendButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  resendButtonText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
  },
  backToLoginButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  backToLoginText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  alternativeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  alternativeText: {
    fontSize: 14,
    color: "#6B7280",
    marginRight: 4,
  },
  alternativeLink: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },
})

export default ForgotPasswordScreen;