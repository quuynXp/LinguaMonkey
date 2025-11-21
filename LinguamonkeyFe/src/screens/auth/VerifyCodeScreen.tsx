import { useEffect, useRef, useState } from "react";
import { Animated, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { verifyOtpAndLogin, requestOtp } from '../../services/authService';
import { showError, showSuccess } from "../../utils/toastHelper";
import { createScaledSheet } from "../../utils/scaledStyles";

const VerifyCodeScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { identifier } = route.params;
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      showError(t('invalidOtp'));
      return;
    }
    setIsLoading(true);
    try {
      const success = await verifyOtpAndLogin(identifier, code);
      if (success) {
        showSuccess(t('loginSuccess'));
      }
    } catch (error: any) {
      showError(error.message || t('verificationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await requestOtp(identifier);
      showSuccess(t('otpSentSuccess'));
      setTimeLeft(60);
      setCanResend(false);
    } catch (e: any) {
      showError(e.message || t('otpSentFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Icon name="security" size={100} color="#4F46E5" />
        </View>
        <Text style={styles.title}>{t('verifyCode')}</Text>
        <Text style={styles.subtitle}>{t('enterCodeSentTo')} {identifier}</Text>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="000000"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
            />
          </View>
          <TouchableOpacity
            style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.verifyButtonText}>{t('verify')}</Text>}
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={canResend ? handleResend : undefined} disabled={!canResend}>
          <Text style={[styles.resendLink, !canResend && { color: '#9CA3AF' }]}>
            {canResend ? t('resendCode') : `${t('resendIn')} ${timeLeft}s`}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 50 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#1F2937", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280", textAlign: "center", marginBottom: 30, lineHeight: 24 },
  formContainer: { marginBottom: 20 },
  inputContainer: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 24, paddingVertical: 4 },
  textInput: { fontSize: 24, color: "#1F2937", paddingVertical: 12, letterSpacing: 8, fontWeight: 'bold' },
  verifyButton: { alignItems: "center", justifyContent: "center", backgroundColor: "#4F46E5", borderRadius: 12, paddingVertical: 16 },
  buttonDisabled: { opacity: 0.7 },
  verifyButtonText: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },
  resendLink: { fontSize: 14, color: "#4F46E5", textAlign: "center", fontWeight: "500", marginTop: 12 },
});

export default VerifyCodeScreen;