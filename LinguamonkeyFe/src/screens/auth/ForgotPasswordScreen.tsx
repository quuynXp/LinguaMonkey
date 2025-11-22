import { useEffect, useRef, useState } from "react";
import { Animated, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { checkResetMethods } from '../../services/authService';
import { createScaledSheet } from "../../utils/scaledStyles";
import { showError } from "../../utils/toastHelper";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { gotoTab } from "../../utils/navigationRef";

const ForgotPasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleFindAccount = async () => {
    if (!identifier || identifier.length < 3) {
      showError(t('invalidIdentifier'));
      return;
    }

    setIsLoading(true);
    try {
      const methods = await checkResetMethods(identifier);
      gotoTab("Profile", "ResetPasswordScreen", { identifier: identifier, methods: methods });
    } catch (error: any) {
      showError(error.message || t('accountNotFound'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScreenLayout style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Icon name="lock-reset" size={80} color="#4F46E5" />
        </View>
        <Text style={styles.title}>{t('forgotPassword')}</Text>
        <Text style={styles.subtitle}>{t('enterIdentifierSubtitle')}</Text>
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon name="person-search" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('emailOrPhone')}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity
            style={[styles.resetButton, isLoading && styles.buttonDisabled]}
            onPress={handleFindAccount}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.resetButtonText}>{t('findAccount')}</Text><Icon name="arrow-forward" size={20} color="#FFFFFF" /></>}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 50 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#1F2937", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280", textAlign: "center", marginBottom: 40, lineHeight: 24 },
  formContainer: { marginBottom: 32 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 24, paddingHorizontal: 16, paddingVertical: 4 },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 16, color: "#1F2937", paddingVertical: 12 },
  resetButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4F46E5", borderRadius: 12, paddingVertical: 16, gap: 8 },
  buttonDisabled: { opacity: 0.7 },
  resetButtonText: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },
});

export default ForgotPasswordScreen;