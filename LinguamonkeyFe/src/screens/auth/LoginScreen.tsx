import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from "../../utils/toastHelper";
import {
  loginWithEmail,
  requestOtp,
  handleGoogleLogin as serviceHandleGoogle,
  handleFacebookLogin as serviceHandleFacebook
} from '../../services/authService';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import { isValidEmail } from '../../utils/validation';
import { gotoTab } from '../../utils/navigationRef';
import PhoneInput from 'react-native-phone-number-input';
import { createScaledSheet } from '../../utils/scaledStyles';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
const FACEBOOK_CLIENT_ID = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID;

const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();

  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

  // Phone State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedValue, setFormattedValue] = useState('');
  const [validPhone, setValidPhone] = useState(false);
  const phoneInputRef = useRef<PhoneInput>(null);

  // Email State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // General State
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // --- CẤU HÌNH AUTH HOOKS ---
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    webClientId: GOOGLE_CLIENT_ID_WEB,
    scopes: ['profile', 'email'],
  });

  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_CLIENT_ID as string,
    scopes: ['public_profile', 'email'],
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      if (id_token) {
        setIsLoading(true);
        serviceHandleGoogle(id_token)
          .then((result) => {
            if (result) showSuccess(t("loginSuccess"));
            else showError(t("loginFailed"));
          })
          .catch((err) => showError(err.message || t("loginFailed")))
          .finally(() => setIsLoading(false));
      } else {
        showError(t("loginFailed"));
      }
    } else if (googleResponse?.type === 'error') {
      console.error("Google Auth Error:", googleResponse.error);
      showError(t("loginFailed") + (googleResponse.error?.message ? `: ${googleResponse.error.message}` : ''));
    }
  }, [googleResponse]);

  useEffect(() => {
    if (fbResponse?.type === 'success') {
      const { access_token } = fbResponse.params;
      if (access_token) {
        setIsLoading(true);
        serviceHandleFacebook(access_token)
          .then((result) => {
            if (result) showSuccess(t("loginSuccess"));
            else showError(t("loginFailed"));
          })
          .catch((err) => showError(err.message || t("loginFailed")))
          .finally(() => setIsLoading(false));
      } else {
        showError(t("loginFailed"));
      }
    } else if (fbResponse?.type === 'error') {
      console.error("Facebook Auth Error:", fbResponse.error);
      showError(t("loginFailed") + (fbResponse.error?.message ? `: ${fbResponse.error.message}` : ''));
    }
  }, [fbResponse]);

  const handleEmailLogin = async () => {
    if (!isValidEmail(email)) {
      showError(t("invalidEmail"));
      return;
    }
    if (!password) {
      showError(t("fillAllFields"));
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithEmail(email, password);
      console.log("Login result:", result);
      if (result) {
        showSuccess(t("loginSuccess"));
      } else {
        showError(t("loginFailed"));
      }
    } catch (err: any) {
      showError(err.response?.data?.message || err.message || t("loginFailed"));
      console.error("Email login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (isLoading) return;
    googlePromptAsync();
  };

  const handleFacebookLogin = () => {
    if (isLoading) return;
    fbPromptAsync();
  };

  const handlePhoneLogin = async () => {
    if (!validPhone) {
      showError(t("invalidPhoneNumber"));
      return;
    }
    setIsLoading(true);
    try {
      const success = await requestOtp(formattedValue);
      if (success) {
        showSuccess(t("otpSentSuccess"));
        navigation.navigate('VerifyOtp', { identifier: formattedValue });
      } else {
        showError(t("otpSentFailed"));
      }
    } catch (error: any) {
      let errorMessage = t("otpSentFailed"); 
      if (error && error.message === 'PHONE_NOT_FOUND') {
        errorMessage = t("phoneNotFound");
      } else if (error && typeof error.message === 'string' && error.message) {
        errorMessage = error.message;
      } else if (error && error.response && error.response.data && typeof error.response.data.message === 'string') {
        errorMessage = error.response.data.message;
      }

      showError(errorMessage);

    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Icon name="email" size={20} color="#6B7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder={t('emailAddress')}
          value={email}
          onChangeText={setEmail}
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
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="password"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Icon name={showPassword ? "visibility" : "visibility-off"} size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.forgotPassword} onPress={() => navigation.navigate("ForgotPassword")}>
        <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} onPress={handleEmailLogin} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.loginButtonText}>{t('signIn')}</Text>
            <Icon name="arrow-forward" size={20} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </>
  );

  const renderPhoneForm = () => (
    <>
      <PhoneInput
        ref={phoneInputRef}
        defaultValue={phoneNumber}
        defaultCode="VN" // Đặt Việt Nam làm mặc định
        layout="first"
        onChangeText={(text) => {
          setPhoneNumber(text);
        }}
        onChangeFormattedText={(text) => {
          setFormattedValue(text);
          const checkValid = phoneInputRef.current?.isValidNumber(text);
          setValidPhone(checkValid || false);
        }}
        containerStyle={styles.phoneInputContainer}
        textInputStyle={styles.phoneInputText}
        withShadow
        autoFocus
      />
      <View style={{ height: 24 }} /> {/* Spacer */}
      <TouchableOpacity
        style={[styles.loginButton, (!validPhone || isLoading) && styles.loginButtonDisabled]}
        onPress={handlePhoneLogin}
        disabled={!validPhone || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.loginButtonText}>{t('sendOtp')}</Text>
            <Icon name="arrow-forward" size={20} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => gotoTab("AppLaunchScreen")}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('signInContinue')}</Text>

        {/* Toggle Login Method */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, loginMethod === 'email' && styles.toggleButtonActive]}
            onPress={() => setLoginMethod('email')}
          >
            <Text style={[styles.toggleButtonText, loginMethod === 'email' && styles.toggleButtonTextActive]}>{t('email')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, loginMethod === 'phone' && styles.toggleButtonActive]}
            onPress={() => setLoginMethod('phone')}
          >
            <Text style={[styles.toggleButtonText, loginMethod === 'phone' && styles.toggleButtonTextActive]}>{t('phoneNumber')}</Text>
          </TouchableOpacity>
        </View>

        {/* Form Container (Conditional) */}
        <View style={styles.formContainer}>
          {loginMethod === 'email' ? renderEmailForm() : renderPhoneForm()}
        </View>

        {/* Social Login Buttons (chỉ hiển thị khi login bằng email) */}
        {loginMethod === 'email' && (
          <>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('orContinueWith')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.socialButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={isLoading || !googleRequest} // Vô hiệu hóa nếu hook chưa sẵn sàng
            >
              <Image source={require('../../assets/icons/google-icon.png')} style={{ width: 20, height: 20 }} />
              <Text style={styles.socialButtonText}>{t('loginWithGoogle')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleFacebookLogin}
              disabled={isLoading || !fbRequest} // Vô hiệu hóa nếu hook chưa sẵn sàng
            >
              <Icon name="facebook" size={20} color="#1877F2" />
              <Text style={styles.socialButtonText}>{t('loginWithFacebook')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('dontHaveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>{t('signUp')}</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </View>
  );
};

// Cập nhật styles
const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 50 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#1F2937", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280", textAlign: "center", marginBottom: 30, lineHeight: 24 },

  // Toggle Styles
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },

  formContainer: { marginBottom: 24 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 16, paddingHorizontal: 16, paddingVertical: 4 },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 16, color: "#1F2937", paddingVertical: 12 },
  eyeIcon: { padding: 4 },

  // Phone Input Styles
  phoneInputContainer: {
    width: '100%',
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 58, // Cần set chiều cao cố định
  },
  phoneInputText: {
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 12,
    height: 40, // Cần set chiều cao cố định
  },

  forgotPassword: { alignSelf: "flex-end", marginBottom: 24 },
  forgotPasswordText: { fontSize: 14, color: "#4F46E5", fontWeight: "500" },
  loginButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4F46E5", borderRadius: 12, paddingVertical: 16, gap: 8 },
  loginButtonDisabled: { opacity: 0.7, backgroundColor: '#A5B4FC' },
  loginButtonText: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Social
  socialButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 16, gap: 8, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 16 },
  socialButtonText: { fontSize: 16, color: "#1F2937", fontWeight: "600" },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
});

export default LoginScreen;