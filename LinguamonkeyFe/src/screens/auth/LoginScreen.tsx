import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from "../../utils/toastHelper";
import { authService } from '../../services/authService';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import { isValidEmail } from '../../utils/validation';
import { goBack } from '../../utils/navigationRef';
import PhoneInput from 'react-native-phone-number-input';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import * as AuthSession from 'expo-auth-session';
import { useAppStore } from '../../stores/appStore';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
const FACEBOOK_CLIENT_ID = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID;

const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { loginInput, setLoginInput, resetAuthInputs } = useAppStore();

  const [formattedValue, setFormattedValue] = useState('');
  const [validPhone, setValidPhone] = useState(false);
  const phoneInputRef = useRef(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const googleAuthConfig = {
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
    scopes: ['profile', 'email'],
  };

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest(googleAuthConfig);

  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_CLIENT_ID,
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
      if (id_token) handleSocialLogin(authService.handleGoogleLogin(id_token));
    } else if (googleResponse?.type === 'error') {
      safeShowError(t("googleLoginCancelledOrFailed"));
    }
  }, [googleResponse]);

  useEffect(() => {
    if (fbResponse?.type === 'success') {
      const { access_token } = fbResponse.params;
      if (access_token) handleSocialLogin(authService.handleFacebookLogin(access_token));
    } else if (fbResponse?.type === 'error') {
      safeShowError(t("facebookLoginCancelledOrFailed"));
    }
  }, [fbResponse]);

  const safeShowError = (error) => {
    let message = t("anErrorOccurred");
    if (typeof error === 'string') message = error;
    else if (error?.message && typeof error.message === 'string') message = error.message;
    else if (error?.response?.data?.message) message = error.response.data.message;
    showError(message);
  };

  const handleSocialLogin = (promise) => {
    setIsLoading(true);
    promise
      .then((result) => {
        if (result) {
          showSuccess(t("loginSuccess"));
          resetAuthInputs();
        } else {
          showError(t("loginFailed"));
        }
      })
      .catch((err) => safeShowError(err))
      .finally(() => setIsLoading(false));
  };

  const handleEmailPasswordLogin = async () => {
    if (!isValidEmail(loginInput.email)) {
      showError(t("invalidEmail"));
      return;
    }
    if (!loginInput.password) {
      showError(t("fillAllFields"));
      return;
    }
    setIsLoading(true);
    try {
      const result = await authService.loginWithEmail(loginInput.email, loginInput.password);
      if (result) {
        showSuccess(t("loginSuccess"));
        resetAuthInputs();
      } else {
        showError(t("loginFailed"));
      }
    } catch (err) {
      safeShowError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (identifier) => {
    setIsLoading(true);
    try {
      const success = await authService.requestOtp(identifier);
      if (success) {
        showSuccess(t("otpSentSuccess"));
        navigation.navigate('VerifyCodeScreen', { identifier: identifier });
      } else {
        showError(t("otpSentFailed"));
      }
    } catch (error) {
      safeShowError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = () => {
    if (loginInput.loginMethod === 'email') {
      if (loginInput.useOtpForEmail) {
        if (!isValidEmail(loginInput.email)) {
          showError(t("invalidEmail"));
          return;
        }
        handleRequestOtp(loginInput.email.trim());
      } else {
        handleEmailPasswordLogin();
      }
    } else {
      if (!validPhone) {
        showError(t("invalidPhoneNumber"));
        return;
      }
      handleRequestOtp(formattedValue);
    }
  };

  const renderEmailForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Icon name="email" size={20} color="#6B7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder={t('emailAddress')}
          value={loginInput.email}
          onChangeText={(text) => setLoginInput({ email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>
      {!loginInput.useOtpForEmail && (
        <View style={styles.inputContainer}>
          <Icon name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder={t('password')}
            value={loginInput.password}
            onChangeText={(text) => setLoginInput({ password: text })}
            secureTextEntry={!showPassword}
            autoComplete="password"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Icon name={showPassword ? "visibility" : "visibility-off"} size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.helpersContainer}>
        <TouchableOpacity onPress={() => setLoginInput({ useOtpForEmail: !loginInput.useOtpForEmail })}>
          <Text style={styles.helperLink}>
            {loginInput.useOtpForEmail ? t('usePasswordInstead') : t('useOtpInstead')}
          </Text>
        </TouchableOpacity>
        {!loginInput.useOtpForEmail && (
          <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
        onPress={onSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.loginButtonText}>
              {loginInput.useOtpForEmail ? t('sendOtp') : t('signIn')}
            </Text>
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
        defaultValue={loginInput.phoneNumber}
        defaultCode="VN"
        layout="first"
        onChangeText={(text) => setLoginInput({ phoneNumber: text })}
        onChangeFormattedText={(text) => {
          setFormattedValue(text);
          const checkValid = phoneInputRef.current?.isValidNumber(text);
          setValidPhone(checkValid || false);
        }}
        containerStyle={styles.phoneInputContainer}
        textInputStyle={styles.phoneInputText}
        textContainerStyle={styles.phoneTextContainer}
        withShadow
        autoFocus
      />
      <View style={{ height: 24 }} />
      <TouchableOpacity
        style={[styles.loginButton, (!validPhone || isLoading) && styles.loginButtonDisabled]}
        onPress={onSubmit}
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
    <ScreenLayout backgroundColor="#F8FAFC">
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{t('welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('signInContinue')}</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, loginInput.loginMethod === 'email' && styles.toggleButtonActive]}
            onPress={() => setLoginInput({ loginMethod: 'email', useOtpForEmail: false })}
          >
            <Text style={[styles.toggleButtonText, loginInput.loginMethod === 'email' && styles.toggleButtonTextActive]}>{t('email')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, loginInput.loginMethod === 'phone' && styles.toggleButtonActive]}
            onPress={() => setLoginInput({ loginMethod: 'phone' })}
          >
            <Text style={[styles.toggleButtonText, loginInput.loginMethod === 'phone' && styles.toggleButtonTextActive]}>{t('phoneNumber')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.formContainer}>
          {loginInput.loginMethod === 'email' ? renderEmailForm() : renderPhoneForm()}
        </View>
        {loginInput.loginMethod === 'email' && !loginInput.useOtpForEmail && (
          <>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('orContinueWith')}</Text>
              <View style={styles.dividerLine} />
            </View>
            {Platform.OS !== 'ios' && (
              <TouchableOpacity
                style={[styles.socialButton, (isLoading || !googleRequest) && styles.loginButtonDisabled]}
                onPress={() => !isLoading && googlePromptAsync()}
                disabled={isLoading || !googleRequest}
              >
                <Image source={require('../../assets/icons/google-icon.png')} style={{ width: 20, height: 20 }} />
                <Text style={styles.socialButtonText}>{t('loginWithGoogle')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.socialButton, (isLoading || !fbRequest) && styles.loginButtonDisabled, Platform.OS === 'ios' && { marginTop: Platform.OS !== 'ios' ? 16 : 0 }]}
              onPress={() => !isLoading && fbPromptAsync()}
              disabled={isLoading || !fbRequest}
            >
              <Icon name="facebook" size={20} color="#1877F2" />
              <Text style={styles.socialButtonText}>{t('loginWithFacebook')}</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('dontHaveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
            <Text style={styles.footerLink}>{t('signUp')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#1F2937", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280", textAlign: "center", marginBottom: 30, lineHeight: 24 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  toggleButtonText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  toggleButtonTextActive: { color: '#4F46E5', fontWeight: '600' },
  formContainer: { marginBottom: 24 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 16, paddingHorizontal: 16, paddingVertical: 4 },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 16, color: "#1F2937", paddingVertical: 12 },
  eyeIcon: { padding: 4 },
  helpersContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  helperLink: { fontSize: 14, color: "#4F46E5", fontWeight: "500" },
  forgotPasswordText: { fontSize: 14, color: "#4F46E5", fontWeight: "500" },
  phoneInputContainer: { width: '100%', backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", height: 58, overflow: 'hidden' },
  phoneTextContainer: { backgroundColor: "#FFFFFF" },
  phoneInputText: { fontSize: 16, color: "#1F2937", height: 50 },
  loginButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4F46E5", borderRadius: 12, paddingVertical: 16, gap: 8 },
  loginButtonDisabled: { opacity: 0.7, backgroundColor: '#A5B4FC' },
  loginButtonText: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  socialButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 16, gap: 8, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 16 },
  socialButtonText: { fontSize: 16, color: "#1F2937", fontWeight: "600" },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 'auto', paddingBottom: 30 },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },
});

export default LoginScreen;