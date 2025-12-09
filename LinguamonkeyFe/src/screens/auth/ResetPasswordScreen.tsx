import { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Animated, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { authService } from '../../services/authService';
import { showError, showSuccess } from "../../utils/toastHelper";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const ResetPasswordScreen = ({ navigation, route }) => {
    const { identifier, methods, userId } = route.params || {};

    const isChangePasswordFlow = !!userId;

    const [currentStep, setCurrentStep] = useState<'METHOD' | 'OTP' | 'NEW_PASSWORD'>(
        isChangePasswordFlow ? 'NEW_PASSWORD' : 'METHOD'
    );
    const [selectedMethod, setSelectedMethod] = useState<'EMAIL' | 'PHONE' | null>(null);
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState(""); // Cần cho Change Password
    const [confirmPassword, setConfirmPassword] = useState("");
    const [secureToken, setSecureToken] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { t } = useTranslation();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();
    }, [currentStep]);

    useEffect(() => {
        if (!isChangePasswordFlow && methods) {
            if (methods.hasEmail && !methods.hasPhone) {
                handleSendOtp('EMAIL');
            } else if (!methods.hasEmail && methods.hasPhone) {
                handleSendOtp('PHONE');
            }
        }
    }, [methods, isChangePasswordFlow]);

    const targetIdentifier = selectedMethod === 'EMAIL' ? methods?.email : methods?.phone;
    const resetTarget = targetIdentifier || identifier;

    const handleSendOtp = async (method: 'EMAIL' | 'PHONE') => {
        if (!resetTarget) {
            showError(t('errors.missingIdentifier') || 'Missing account identifier.');
            return;
        }

        setSelectedMethod(method);
        setIsLoading(true);
        try {
            await authService.requestPasswordResetOtp(resetTarget, method);
            showSuccess(t('otpSentSuccess'));
            setCurrentStep('OTP');
        } catch (error: any) {
            showError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length < 6) {
            showError(t('invalidOtp'));
            return;
        }
        setIsLoading(true);
        try {
            const token = await authService.verifyPasswordResetOtp(resetTarget, otp);
            setSecureToken(token);
            setCurrentStep('NEW_PASSWORD');
        } catch (error: any) {
            showError(error.message || t('otpVerifyFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (newPassword.length < 6) {
            showError(t('passwordLength'));
            return;
        }
        if (newPassword !== confirmPassword) {
            showError(t('passwordMismatch'));
            return;
        }
        setIsLoading(true);
        try {
            await authService.resetPassword(secureToken, newPassword);
            showSuccess(t('passwordResetSuccess'));

            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        } catch (error: any) {
            showError(error.message || t('resetFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 6) {
            showError(t('passwordLength'));
            return;
        }
        if (newPassword !== confirmPassword) {
            showError(t('passwordMismatch'));
            return;
        }
        if (!currentPassword) {
            showError(t('enterCurrentPassword'));
            return;
        }

        setIsLoading(true);
        try {
            await authService.changePasswordForAuthenticatedUser(userId, currentPassword, newPassword);

            showSuccess(t('passwordChangedSuccess'));
            navigation.goBack();
        } catch (error: any) {
            showError(error.message || t('changePasswordFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = isChangePasswordFlow ? handleChangePassword : handleResetPassword;

    const renderMethodSelection = () => {
        // Nếu không có identifier hoặc methods, báo lỗi
        if (!identifier || !methods || (!methods.hasEmail && !methods.hasPhone)) {
            return <Text style={styles.stepDesc}>{t('errors.noRecoveryMethods') || 'No recovery methods available.'}</Text>;
        }

        return (
            <View>
                <Text style={styles.stepTitle}>{t('selectRecoveryMethod')}</Text>
                {methods?.hasEmail && (
                    <TouchableOpacity style={styles.methodButton} onPress={() => handleSendOtp('EMAIL')}>
                        <Icon name="email" size={24} color="#4F46E5" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.methodLabel}>{t('sendViaEmail')}</Text>
                            <Text style={styles.methodValue}>{methods.email}</Text>
                        </View>
                    </TouchableOpacity>
                )}
                {methods?.hasPhone && (
                    <TouchableOpacity style={styles.methodButton} onPress={() => handleSendOtp('PHONE')}>
                        <Icon name="smartphone" size={24} color="#4F46E5" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.methodLabel}>{t('sendViaSms')}</Text>
                            <Text style={styles.methodValue}>{methods.phone}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    const renderOtpInput = () => (
        <View>
            <Text style={styles.stepTitle}>{t('enterOtp')}</Text>
            <Text style={styles.stepDesc}>{t('otpSentTo')} {selectedMethod === 'EMAIL' ? methods.email : methods.phone}</Text>
            <TextInput
                style={[styles.textInput, { textAlign: 'center', letterSpacing: 8, fontSize: 24 }]}
                placeholder="000000"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{t('verify')}</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderNewPasswordInput = () => (
        <View>
            <Text style={styles.stepTitle}>
                {isChangePasswordFlow ? t('changePasswordTitle') : t('createNewPassword')}
            </Text>

            {isChangePasswordFlow && (
                <TextInput
                    style={styles.textInput}
                    placeholder={t('currentPassword')}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showPassword}
                />
            )}

            <View style={[styles.inputWrapper, { marginTop: isChangePasswordFlow ? 12 : 0 }]}>
                <TextInput
                    style={styles.textInput}
                    placeholder={t('newPassword')}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Icon name={showPassword ? "visibility" : "visibility-off"} size={20} color="#6B7280" />
                </TouchableOpacity>
            </View>
            <TextInput
                style={[styles.textInput, { marginTop: 12 }]}
                placeholder={t('confirmNewPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{isChangePasswordFlow ? t('savePassword') : t('updatePassword')}</Text>}
            </TouchableOpacity>
        </View>
    );

    // Xử lý nút back
    const handleGoBack = () => {
        if (currentStep === 'METHOD' || isChangePasswordFlow) {
            navigation.goBack();
        } else if (currentStep === 'OTP') {
            setCurrentStep('METHOD');
        } else if (currentStep === 'NEW_PASSWORD') {
            setCurrentStep('OTP');
        }
    };

    return (
        <ScreenLayout style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleGoBack}>
                        <Icon name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                </View>
                {currentStep === 'METHOD' && renderMethodSelection()}
                {currentStep === 'OTP' && renderOtpInput()}
                {currentStep === 'NEW_PASSWORD' && renderNewPasswordInput()}
                {isLoading && <ActivityIndicator style={styles.loadingOverlay} size="large" color="#4F46E5" />}
            </Animated.View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    content: { flex: 1, paddingHorizontal: 24, paddingTop: 50 },
    header: { marginBottom: 20 },
    stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
    stepDesc: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
    methodButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    methodLabel: { fontSize: 14, color: '#6B7280' },
    methodValue: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
    textInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, fontSize: 16, color: '#1F2937' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center' },
    eyeIcon: { position: 'absolute', right: 12, padding: 4 },
    primaryButton: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        zIndex: 99
    }
});

export default ResetPasswordScreen;