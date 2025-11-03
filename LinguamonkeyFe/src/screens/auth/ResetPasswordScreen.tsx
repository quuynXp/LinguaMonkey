import { useEffect, useRef, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Alert, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
// Import các hàm API mới từ authService
import {
  checkResetMethods,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword
} from '../../services/authService'
import { createScaledSheet } from "../../utils/scaledStyles";

// Định nghĩa các bước của quy trình
type ResetStep = 'ENTER_IDENTIFIER' | 'CHOOSE_METHOD' | 'ENTER_OTP' | 'SET_NEW_PASSWORD';

const ResetPasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();

  // === State quản lý toàn bộ flow ===
  const [step, setStep] = useState<ResetStep>('ENTER_IDENTIFIER');
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState(""); // Email hoặc SĐT
  const [availableMethods, setAvailableMethods] = useState<{ hasEmail: boolean; hasPhone: boolean; email?: string; phone?: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [secureToken, setSecureToken] = useState(""); // Token an toàn sau khi xác thực OTP

  // === State cho bước cuối cùng (SET_NEW_PASSWORD) ===
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // === Animation (Giữ nguyên) ===
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
  }, [step]); // Chạy lại animation mỗi khi chuyển bước

  // === Logic cho các bước ===

  // Bước 1: Kiểm tra Email/SĐT
  const handleCheckIdentifier = async () => {
    if (identifier.length < 5) {
      Alert.alert(t('error'), t('invalidEmailOrPhone'));
      return;
    }
    setIsLoading(true);
    try {
      const methods = await checkResetMethods(identifier);
      setAvailableMethods(methods);
      
      // Quyết định bước tiếp theo
      if (methods.hasEmail && methods.hasPhone) {
        setStep('CHOOSE_METHOD');
      } else if (methods.hasEmail) {
        await handleRequestOtp('EMAIL'); // Tự động chọn Email
      } else if (methods.hasPhone) {
        await handleRequestOtp('PHONE'); // Tự động chọn Phone
      } else {
        Alert.alert(t('error'), t('noVerifiedMethod'));
      }
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('accountNotFound'));
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 1.5 (hoặc 2): Gửi OTP
  const handleRequestOtp = async (method: 'EMAIL' | 'PHONE') => {
    setIsLoading(true);
    try {
      // Sử dụng identifier (email/SĐT user đã nhập) hoặc SĐT/Email đã chuẩn hoá từ backend
      const targetIdentifier = (method === 'EMAIL' ? availableMethods?.email : availableMethods?.phone) || identifier;
      setIdentifier(targetIdentifier); // Cập nhật identifier đã chuẩn hoá
      
      await requestPasswordResetOtp(targetIdentifier, method);
      Alert.alert(t('success'), t('otpSentMessage'));
      setStep('ENTER_OTP');
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('otpSendFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Xác thực OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert(t('error'), t('invalidOtp'));
      return;
    }
    setIsLoading(true);
    try {
      const token = await verifyPasswordResetOtp(identifier, otp);
      setSecureToken(token); // Lưu token an toàn
      setStep('SET_NEW_PASSWORD'); // Chuyển sang bước cuối
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('otpVerifyFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 3: Đặt lại mật khẩu (Logic cũ của bạn)
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

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await resetPassword(secureToken, newPassword); // Dùng secureToken đã lưu
      Alert.alert(t('success'), t('passwordResetSuccess'), [
        { text: t('ok'), onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // === Hàm render cho từng bước ===

  const renderEnterIdentifier = () => (
    <>
      <Text style={styles.title}>{t('forgotPassword')}</Text>
      <Text style={styles.subtitle}>{t('enterEmailOrPhone')}</Text>
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Icon name="alternate-email" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder={t('emailOrPhone')}
            value={identifier}
            onChangeText={setIdentifier}
            autoComplete="email"
            keyboardType="email-address"
          />
        </View>
        <TouchableOpacity
          style={[styles.resetButton, isLoading && styles.buttonDisabled]}
          onPress={handleCheckIdentifier}
          disabled={isLoading}
        >
          {isLoading ? <Icon name="hourglass-top" size={20} color="#FFFFFF" /> : <Text style={styles.resetButtonText}>{t('continue')}</Text>}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderChooseMethod = () => (
    <>
      <Text style={styles.title}>{t('chooseMethod')}</Text>
      <Text style={styles.subtitle}>{t('howToSendOtp')}</Text>
      <View style={styles.formContainer}>
        {availableMethods?.hasEmail && (
          <TouchableOpacity style={styles.resetButton} onPress={() => handleRequestOtp('EMAIL')} disabled={isLoading}>
            <Icon name="email" size={20} color="#FFFFFF" />
            <Text style={styles.resetButtonText}>{t('sendToEmail')} ({availableMethods.email})</Text>
          </TouchableOpacity>
        )}
        {availableMethods?.hasPhone && (
          <TouchableOpacity style={[styles.resetButton, { marginTop: 16 }]} onPress={() => handleRequestOtp('PHONE')} disabled={isLoading}>
            <Icon name="sms" size={20} color="#FFFFFF" />
            <Text style={styles.resetButtonText}>{t('sendToPhone')} ({availableMethods.phone})</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const renderEnterOtp = () => (
    <>
      <Text style={styles.title}>{t('verifyCode')}</Text>
      <Text style={styles.subtitle}>{t('enterOtpSentTo')} {identifier}</Text>
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Icon name="dialpad" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder={t('otpCode')}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
        <TouchableOpacity
          style={[styles.resetButton, isLoading && styles.buttonDisabled]}
          onPress={handleVerifyOtp}
          disabled={isLoading}
        >
          {isLoading ? <Icon name="hourglass-top" size={20} color="#FFFFFF" /> : <Text style={styles.resetButtonText}>{t('verify')}</Text>}
        </TouchableOpacity>
        {/* Bạn có thể thêm nút "Gửi lại OTP" ở đây */}
      </View>
    </>
  );

  const renderSetNewPassword = () => (
    <>
      <Text style={styles.title}>{t('resetPassword')}</Text>
      <Text style={styles.subtitle}>{t('enterNewPassword')}</Text>
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
          onPress={handleResetPassword} // Đổi tên hàm
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
        </TouchableOpacity>
      </View>
    </>
  );

  // === Hàm Render Chính ===
  const renderCurrentStep = () => {
    switch (step) {
      case 'ENTER_IDENTIFIER':
        return renderEnterIdentifier();
      case 'CHOOSE_METHOD':
        return renderChooseMethod();
      case 'ENTER_OTP':
        return renderEnterOtp();
      case 'SET_NEW_PASSWORD':
        return renderSetNewPassword();
      default:
        return renderEnterIdentifier();
    }
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
          <TouchableOpacity onPress={() => {
            // Cho phép quay lại bước trước nếu không phải bước đầu
            if (step === 'ENTER_IDENTIFIER') {
              navigation.goBack();
            } else if (step === 'CHOOSE_METHOD' || step === 'ENTER_OTP') {
              setStep('ENTER_IDENTIFIER');
            } else if (step === 'SET_NEW_PASSWORD') {
              setStep('ENTER_OTP'); // Quay lại bước nhập OTP
            }
          }}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Render nội dung của bước hiện tại */}
        {renderCurrentStep()}

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
})

export default ResetPasswordScreen;