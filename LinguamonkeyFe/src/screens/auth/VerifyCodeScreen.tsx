"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Alert, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { verifyResetCode } from '../../services/authService'
import { gotoTab, resetToTab } from "../../utils/navigationRef";
import { createScaledSheet } from "../../utils/scaledStyles";


const VerifyCodeScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { email } = route.params;
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [timeLeft, setTimeLeft] = useState(300); 
  const [canResend, setCanResend] = useState(false);

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert(t('error'), t('enter6DigitCode'));
      return;
    }
    setIsLoading(true);
    try {
      const resetToken = await verifyResetCode(email, code);
      gotoTab("Auth", "ResetPasswordScreen", { email, resetToken });
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('verificationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    verifyResetCode(email, code);
    Alert.alert(t('info'), t('codeResent', { email }));
    setTimeLeft(300);
    setCanResend(false);
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

        {/* Animation */}
        <Icon name="lock" size={150} color="#4F46E5" style={styles.animation} />

        {/* Title */}
        <Text style={styles.title}>{t('verifyCode')}</Text>
        <Text style={styles.subtitle}>
          {t('enterCodeSentTo', { email })}
        </Text>

        <Text style={styles.countdown}>
          {canResend
            ? t('youCanResend')
            : t('timeRemaining', { time: formatTime(timeLeft) })}
        </Text>

        {/* Code Input */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('enter6DigitCode')}
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={6}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <Icon name="hourglass-top" size={20} color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.verifyButtonText}>{t('verify')}</Text>
                <Icon name="check" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Resend Button */}
        {canResend && (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>{t('resendCode')}</Text>
          </TouchableOpacity>
        )}
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
  animation: {
    width: 150,
    height: 150,
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
    marginBottom: 20,
    lineHeight: 24,
  },
  countdown: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20,
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
  verifyButton: {
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
  verifyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  resendLink: {
    fontSize: 14,
    color: "#4F46E5",
    textAlign: "center",
    fontWeight: "500",
    marginTop: 12,
  },
})

export default VerifyCodeScreen;
