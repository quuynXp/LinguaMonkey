"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Alert, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { resetPassword } from '../../services/authService'

const ResetPasswordScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { resetToken } = route.params;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    if (newPassword.length < 6) {
      Alert.alert(t('error'), t('passwordLength'));
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('error'), t('passwordMismatch'));
      return false;
    }
    return true;
  };

  const handleReset = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      Alert.alert(t('success'), t('passwordResetSuccess'), [
        { text: t('ok'), onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

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
        

        {/* Title */}
        <Text style={styles.title}>{t('resetPassword')}</Text>
        <Text style={styles.subtitle}>
          {t('enterNewPassword')}
        </Text>

        {/* Password Inputs */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
              <Icon name={showNewPassword ? "visibility" : "visibility-off"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('confirmNewPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Icon name={showConfirmPassword ? "visibility" : "visibility-off"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.resetButton, isLoading && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <Icon name="hourglass-top" size={20} color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.resetButtonText}>{t('setNewPassword')}</Text>
                <Icon name="check" size={20} color="#FFFFFF" />
              </>
            )}
            ) : (
              <>
                <Text style={styles.resetButtonText}>{t('setNewPassword')}</Text>
                <Icon name="check" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
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
    marginBottom: 40,
    lineHeight: 24,
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
    marginBottom: 16,
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
  eyeIcon: {
    padding: 4,
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
})

export default ResetPasswordScreen;