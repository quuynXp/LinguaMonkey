import { useState, useEffect, useMemo, useRef } from "react"
import { Alert, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, TextInput, Keyboard, Switch, AppState } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useUserStore } from "../../stores/UserStore"
import * as WebBrowser from "expo-web-browser"
import * as Linking from "expo-linking"
import { useTransactionsApi } from "../../hooks/useTransaction"
import { useWallet } from "../../hooks/useWallet"
import { useCourses } from "../../hooks/useCourses"
import { useCurrencyConverter } from "../../hooks/useCurrencyConverter"
import { useTranslation } from "react-i18next"
import * as Enums from "../../types/enums"
import { PaymentRequest, TransactionRequest } from "../../types/dto"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { createScaledSheet } from "../../utils/scaledStyles"
import PaymentMethodSelector from "../../components/payment/PaymentMethodSelector"
import { SupportedCurrency } from "../../utils/currency"
import privateClient from "../../api/axiosClient"

// Ensure WebBrowser works correctly on Android
WebBrowser.maybeCompleteAuthSession();

interface PaymentCourseVersion {
  versionId: string;
  price: number;
  currency?: string;
}

interface PaymentCourseParams {
  courseId: string;
  title: string;
  instructor: string;
  creatorId: string;
  latestPublicVersion: PaymentCourseVersion;
}

const PaymentScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const appState = useRef(AppState.currentState);

  const { course } = route.params as { course: PaymentCourseParams };
  const { user } = useUserStore();

  const [selectedMethod, setSelectedMethod] = useState<"wallet" | "gateway">("gateway");
  const [gatewayProvider, setGatewayProvider] = useState<Enums.TransactionProvider>(Enums.TransactionProvider.VNPAY);

  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);

  const [useCoins, setUseCoins] = useState(false);
  const [coinsToUse, setCoinsToUse] = useState(0);

  const { data: walletData, refetch: refetchWallet } = useWallet().useWalletBalance(user?.userId);
  const createPaymentUrl = useTransactionsApi().useCreatePayment();
  const createTransaction = useTransactionsApi().useCreateTransaction();
  const { convert, isLoading: loadingRates } = useCurrencyConverter();
  const { mutate: validateDiscount, isPending: isValidatingCoupon } = useCourses().useValidateDiscount();

  const { refetch: refetchCourse } = useCourses().useCourse(course.courseId);

  const COINS_PER_USD = 1000;
  const basePriceUSD = course.latestPublicVersion?.price || 0;

  const targetCurrency = useMemo((): SupportedCurrency => {
    if (selectedMethod === 'gateway') {
      if (gatewayProvider === Enums.TransactionProvider.VNPAY) return 'VND';
      if (gatewayProvider === Enums.TransactionProvider.STRIPE) return 'USD';
    }
    return user?.country === Enums.Country.VIETNAM ? 'VND' : 'USD';
  }, [selectedMethod, gatewayProvider, user?.country]);

  const displayOriginalPrice = useMemo(() => {
    return convert(basePriceUSD, targetCurrency);
  }, [basePriceUSD, targetCurrency, convert]);

  const discountAmount = useMemo(() => {
    return appliedDiscount
      ? (displayOriginalPrice * appliedDiscount.percent) / 100
      : 0;
  }, [displayOriginalPrice, appliedDiscount]);

  const priceAfterCoupon = Math.max(0, displayOriginalPrice - discountAmount);

  const valuePerCoin = useMemo(() => {
    const valueInUSD = 1 / COINS_PER_USD;
    return convert(valueInUSD, targetCurrency);
  }, [targetCurrency, convert]);

  const availableCoins = user?.coins || 0;

  const maxCoinsUsable = useMemo(() => {
    if (valuePerCoin === 0) return 0;
    const maxCoinsForPrice = Math.floor(priceAfterCoupon / valuePerCoin);
    return Math.floor(Math.min(availableCoins, maxCoinsForPrice));
  }, [availableCoins, priceAfterCoupon, valuePerCoin]);

  useEffect(() => {
    setCoinsToUse(useCoins ? maxCoinsUsable : 0);
  }, [useCoins, maxCoinsUsable, targetCurrency]);

  const coinDiscountAmount = useCoins ? (coinsToUse * valuePerCoin) : 0;
  const finalAmount = Math.max(0, priceAfterCoupon - coinDiscountAmount);
  const walletBalanceDisplay = convert(walletData?.balance || 0, targetCurrency);
  const isBalanceSufficient = walletBalanceDisplay >= finalAmount;

  // --- APP STATE HANDLER (Handle Token Refresh on Resume) ---
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        privateClient.get('/api/v1/users/me/profile')
          .then(() => {
            refetchWallet();
          })
          .catch((err) => {
            console.log("Token check on resume failed or token invalid", err);
          });
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [refetchWallet]);

  const handleApplyCoupon = () => {
    Keyboard.dismiss();
    if (!couponCode.trim()) return;

    validateDiscount({ code: couponCode, versionId: course.latestPublicVersion.versionId }, {
      onSuccess: (data) => {
        setAppliedDiscount({ code: data.code, percent: data.discountPercentage });
        Alert.alert(t("success"), t("payment.couponApplied", { percent: data.discountPercentage }));
      },
      onError: () => {
        setAppliedDiscount(null);
        Alert.alert(t("error"), t("payment.invalidCoupon"));
      }
    });
  };

  const handlePayment = () => {
    if (!user?.userId) return;
    if (selectedMethod === "wallet") {
      if (!isBalanceSufficient) return Alert.alert(t('common.error'), t('payment.insufficientBalance'));
      processWalletPayment();
    } else {
      processGatewayPayment();
    }
  };

  const processWalletPayment = () => {
    const cleanAmount = Number(finalAmount.toFixed(2));

    const payload: TransactionRequest = {
      userId: user!.userId,
      amount: cleanAmount,
      provider: Enums.TransactionProvider.INTERNAL,
      currency: targetCurrency,
      type: Enums.TransactionType.PAYMENT,
      status: Enums.TransactionStatus.SUCCESS,
      description: `Payment for course: ${course.title} ${appliedDiscount ? `(Code: ${appliedDiscount.code})` : ''}`,
      coins: useCoins ? coinsToUse : 0,
      receiverId: course.creatorId,
      courseVersionId: course.latestPublicVersion.versionId
    };

    createTransaction.mutate(payload, {
      onSuccess: () => {
        Alert.alert(t('common.success'), t('payment.success'), [
          {
            text: 'OK', onPress: () => {
              refetchWallet();
              refetchCourse();
              navigation.navigate('MyCoursesScreen');
            }
          }
        ]);
      },
      onError: () => Alert.alert(t('common.error'), t('payment.failed'))
    });
  };

  const handlePaymentResult = async (resultUrl: string | null) => {
    if (!resultUrl) return;

    // Parse result from deep link
    const { queryParams } = Linking.parse(resultUrl);

    // Wait a bit for webhook to process
    await new Promise(resolve => setTimeout(resolve, 1500));

    await refetchWallet();
    await refetchCourse();

    if (queryParams?.status === 'success' || queryParams?.vnp_ResponseCode === '00') {
      Alert.alert(t('common.success'), t('payment.success'), [
        {
          text: 'OK', onPress: () => {
            navigation.navigate('MyCoursesScreen');
          }
        }
      ]);
    } else if (queryParams?.status === 'cancel') {
      // User cancelled, do nothing or show toast
    } else {
      Alert.alert(t('common.error'), t('payment.failed') + ': ' + (queryParams?.reason || 'Unknown'));
    }
  }

  const processGatewayPayment = () => {
    let cleanAmount = finalAmount;
    if (targetCurrency === 'VND') {
      cleanAmount = Math.round(finalAmount);
    } else {
      cleanAmount = Number(finalAmount.toFixed(2));
    }

    // Creates: exp://192.168.1.x:8081/--/payment/result (Dev) or monkeylingua://payment/result (Prod)
    const returnDeepLink = Linking.createURL("payment/result");

    const payload: PaymentRequest & { coins?: number; courseVersionId?: string } = {
      userId: user!.userId,
      amount: cleanAmount,
      provider: gatewayProvider,
      currency: targetCurrency,
      type: Enums.TransactionType.PAYMENT,
      returnUrl: returnDeepLink,
      description: `Buy ${course.title}`,
      coins: useCoins ? coinsToUse : 0,
      courseVersionId: course.latestPublicVersion.versionId
    };

    createPaymentUrl.mutate(payload, {
      onSuccess: async (paymentUrl) => {
        if (paymentUrl) {
          try {
            // FIX: Use openAuthSessionAsync instead of openBrowserAsync
            // This waits for the redirect and automatically closes the browser window
            const result = await WebBrowser.openAuthSessionAsync(
              paymentUrl,
              returnDeepLink
            );

            if (result.type === 'success' && result.url) {
              handlePaymentResult(result.url);
            }
          } catch (error) {
            console.error("Browser Error:", error);
          }
        }
      },
      onError: (err: any) => {
        console.error("Gateway Error:", err);
        Alert.alert(t('common.error'), t('payment.gatewayError'));
      }
    });
  };

  const renderPriceDisplay = () => {
    if (loadingRates) return <ActivityIndicator size="small" color="#4F46E5" />;

    const formattedOriginal = displayOriginalPrice.toLocaleString('vi-VN', { style: 'currency', currency: targetCurrency });
    const formattedFinal = finalAmount.toLocaleString('vi-VN', { style: 'currency', currency: targetCurrency });

    return (
      <View style={{ alignItems: 'flex-end' }}>
        {(appliedDiscount || useCoins) && (
          <Text style={styles.originalPrice}>
            {formattedOriginal}
          </Text>
        )}
        <Text style={styles.totalValue}>
          {formattedFinal}
        </Text>
      </View>
    );
  };

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.instructor}>by {course.instructor}</Text>
          <View style={styles.divider} />

          <View style={styles.couponContainer}>
            <View style={styles.inputWrapper}>
              <Icon name="local-offer" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.couponInput}
                placeholder={t("payment.enterCode")}
                value={couponCode}
                onChangeText={setCouponCode}
                editable={!appliedDiscount}
                autoCapitalize="characters"
              />
            </View>
            {appliedDiscount ? (
              <TouchableOpacity style={styles.removeBtn} onPress={() => { setAppliedDiscount(null); setCouponCode(""); }}>
                <Icon name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.applyBtn, (!couponCode || isValidatingCoupon) && styles.disabledBtn]}
                onPress={handleApplyCoupon}
                disabled={!couponCode || isValidatingCoupon}
              >
                {isValidatingCoupon ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.applyText}>{t("common.apply")}</Text>}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.coinSection}>
            <View style={styles.coinHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="monetization-on" size={20} color="#F59E0B" />
                <Text style={styles.coinLabel}>Use Coins ({availableCoins})</Text>
              </View>
              <Switch
                value={useCoins}
                onValueChange={setUseCoins}
                trackColor={{ false: "#D1D5DB", true: "#FBBF24" }}
                thumbColor={useCoins ? "#F59E0B" : "#F4F3F4"}
                disabled={availableCoins <= 0}
              />
            </View>
            {useCoins && (
              <Text style={styles.discountText}>
                - {coinDiscountAmount.toLocaleString('vi-VN', { style: 'currency', currency: targetCurrency })}
              </Text>
            )}
          </View>

          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.label}>{t('payment.total')}</Text>
            {renderPriceDisplay()}
          </View>
        </View>

        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          selectedProvider={gatewayProvider}
          onMethodChange={setSelectedMethod}
          onProviderChange={setGatewayProvider}
          walletBalance={walletData?.balance}
          currency={targetCurrency}
          showWalletOption={true}
          insufficientBalance={!isBalanceSufficient}
        />

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, (selectedMethod === 'wallet' && !isBalanceSufficient) && styles.disabledButton]}
          disabled={selectedMethod === 'wallet' && !isBalanceSufficient}
          onPress={handlePayment}
        >
          {createPaymentUrl.isPending || createTransaction.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.payButtonText}>
              {selectedMethod === 'wallet' ? t('payment.payNow') : t('payment.continueToGateway')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF" },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
  placeholder: { width: 24 },
  content: { flex: 1, padding: 20 },
  card: { backgroundColor: "#FFF", padding: 20, borderRadius: 12, marginBottom: 24, elevation: 2 },
  courseTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 4 },
  instructor: { fontSize: 14, color: "#6B7280" },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  couponContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, marginRight: 8 },
  inputIcon: { marginRight: 8 },
  couponInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1F2937' },
  applyBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  disabledBtn: { backgroundColor: '#A5B4FC' },
  applyText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  removeBtn: { padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8 },
  coinSection: { marginTop: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  coinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coinLabel: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#4B5563' },
  discountText: { fontSize: 14, fontWeight: '600', color: '#059669', textAlign: 'right', marginTop: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 16, color: "#4B5563" },
  originalPrice: { fontSize: 14, color: '#9CA3AF', textDecorationLine: 'line-through', marginBottom: 2 },
  totalValue: { fontSize: 20, fontWeight: "700", color: "#4F46E5" },
  footer: { padding: 20, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  payButton: { backgroundColor: "#4F46E5", padding: 16, borderRadius: 12, alignItems: "center" },
  disabledButton: { backgroundColor: "#9CA3AF" },
  payButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});

export default PaymentScreen;