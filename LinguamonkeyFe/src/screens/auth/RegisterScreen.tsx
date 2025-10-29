
import { useState, useRef, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Animated, TextInput, Alert, ScrollView } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { registerWithEmail, loginWithGoogle, loginWithFacebook } from '../../services/authService';
import { resetToTab } from "../../utils/navigationRef";
import { createScaledSheet } from "../../utils/scaledStyles";

const RegisterScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

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

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      Alert.alert(t('error'), t('enterFirstName'));
      return false
    }
    if (!formData.lastName.trim()) {
      Alert.alert(t('error'), t('enterLastName'));
      return false
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      Alert.alert(t('error'), t('validEmail'));
      return false
    }
    if (formData.password.length < 6) {
      Alert.alert(t('error'), t('passwordLength'));
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert(t('error'), t('passwordMismatch'));
      return false
    }
    if (!acceptTerms) {
      Alert.alert(t('error'), t('acceptTerms'));
      return false
    }
    return true
  }

  const handleRegister = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      await registerWithEmail(formData.firstName, formData.lastName, formData.email, formData.password);
      resetToTab('Home')
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('registerFailed'));
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialRegister = async (provider: string) => {
    setIsLoading(true)
    try {
      if (provider === 'Google') {
        await loginWithGoogle();
      } else if (provider === 'Facebook') {
        await loginWithFacebook();
      }
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('registerFailedWith', { provider }));
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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

        {/* Register Animation */}


        {/* Title */}
        <Text style={styles.title}>{t('createAccount')}</Text>
        <Text style={styles.subtitle}>{t('joinLearners')}</Text>

        {/* Registration Form */}
        <View style={styles.formContainer}>
          <View style={styles.nameRow}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Icon name="person" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder={t('firstName')}
                value={formData.firstName}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Icon name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder={t('lastName')}
                value={formData.lastName}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Icon name="email" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('emailAddress')}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('password')}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Icon name={showPassword ? "visibility" : "visibility-off"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('confirmPassword')}
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Icon name={showConfirmPassword ? "visibility" : "visibility-off"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Terms Checkbox */}
          <TouchableOpacity style={styles.termsContainer} onPress={() => setAcceptTerms(!acceptTerms)}>
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Icon name="check" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsText}>
              {t('agreeTo')} <Text style={styles.linkText}>{t('termsOfService')}</Text> {t('and')}{" "}
              <Text style={styles.linkText}>{t('privacyPolicy')}</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <Icon name="hourglass-top" size={20} color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>{t('createAccount')}</Text>
                <Icon name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('orSignUpWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Registration */}
        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialRegister("Google")}
            disabled={isLoading}
          >
            <Icon name="g-translate" size={24} color="#DB4437" />
            <Text style={styles.socialButtonText}>{t('google')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialRegister("Facebook")}
            disabled={isLoading}
          >
            <Icon name="facebook" size={24} color="#4267B2" />
            <Text style={styles.socialButtonText}>{t('facebook')}</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Link */}
        <View style={styles.signinContainer}>
          <Text style={styles.signinText}>{t('haveAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.signinLink}>{t('signIn')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  registerAnimation: {
    width: 120,
    height: 120,
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
    marginBottom: 32,
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  halfWidth: {
    flex: 1,
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
  eyeIcon: {
    padding: 4,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  linkText: {
    color: "#4F46E5",
    fontWeight: "500",
  },
  registerButton: {
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
  registerButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  loadingAnimation: {
    width: 24,
    height: 24,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontSize: 14,
    color: "#6B7280",
    marginHorizontal: 16,
  },
  socialContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  signinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signinText: {
    fontSize: 14,
    color: "#6B7280",
  },
  signinLink: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },
})

export default RegisterScreen;