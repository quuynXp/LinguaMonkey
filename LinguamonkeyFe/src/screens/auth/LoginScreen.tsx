"use client";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from "../../utils/toastHelper";


import { loginWithEmail, loginWithGoogle, loginWithFacebook } from '../../services/authService';

const LoginScreen = ({ navigation, onLogin}) => {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      showError(t("fillAllFields"));
      return;
    }
    setIsLoading(true);
    try {
    const result =  await loginWithEmail(email, password);
      if (result) {
        onLogin();
        showSuccess(t("loginSuccess"));
      }
    } catch (err: any) {
      showError(err.message || t("loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result) {
      onLogin();
      showSuccess(t("loginSuccess"));
      }
    } catch (err: any) {
      showError(err.message || t("loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      const result = await loginWithFacebook();
      if (result) {
      onLogin();
      showSuccess(t("loginSuccess"));
      }
    } catch (err: any) {
      showError(err.message || t("loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Welcome Animation */}

        {/* Title */}
        <Text style={styles.title}>{t('welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('signInContinue')}</Text>

        {/* Email Login Form */}
        <View style={styles.formContainer}>
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
              <Icon name="hourglass-top" size={20} color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>{t('signIn')}</Text>
                <Icon name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Social Login Buttons */}
          <TouchableOpacity style={[styles.socialButton, isLoading && styles.loginButtonDisabled]} onPress={handleGoogleLogin} disabled={isLoading}>
            {/* <Icon name="google" size={20} color="#4285F4" /> */}
            <Text style={styles.socialButtonText}>{t('loginWithGoogle')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.socialButton, isLoading && styles.loginButtonDisabled]} onPress={handleFacebookLogin} disabled={isLoading}>
            <Icon name="facebook" size={20} color="#1877F2" />
            <Text style={styles.socialButtonText}>{t('loginWithFacebook')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 50 },
  header: { marginBottom: 20 },
  welcomeAnimation: { width: 150, height: 150, alignSelf: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "bold", color: "#1F2937", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280", textAlign: "center", marginBottom: 40, lineHeight: 24 },
  formContainer: { marginBottom: 32 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 16, paddingHorizontal: 16, paddingVertical: 4 },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 16, color: "#1F2937", paddingVertical: 12 },
  eyeIcon: { padding: 4 },
  forgotPassword: { alignSelf: "flex-end", marginBottom: 24 },
  forgotPasswordText: { fontSize: 14, color: "#4F46E5", fontWeight: "500" },
  loginButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4F46E5", borderRadius: 12, paddingVertical: 16, gap: 8 },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },
  loadingAnimation: { width: 24, height: 24 },
  socialButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 16, gap: 8, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 16 },
  socialButtonText: { fontSize: 16, color: "#1F2937", fontWeight: "600" },
});

export default LoginScreen;