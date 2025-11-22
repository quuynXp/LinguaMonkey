import { useState } from "react"
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useUserStore } from "../../stores/UserStore"
import * as WebBrowser from "expo-web-browser"
import { useTransactionsApi } from "../../hooks/useTransaction"
import { createScaledSheet } from "../../utils/scaledStyles"
import { useTranslation } from "react-i18next"
import * as Enums from "../../types/enums"
import { PaymentRequest } from "../../types/dto"
import ScreenLayout from "../../components/layout/ScreenLayout"

interface CourseType {
  courseId: string;
  title: string;
  price: number;
  instructor: string;
}

const PaymentScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { course } = route.params as { course: CourseType };

  const { user } = useUserStore();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"card" | "paypal" | "apple" | "google">("card")
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardholderName, setCardholderName] = useState("")

  const createPayment = useTransactionsApi().useCreatePayment()

  const paymentMethods = [
    { id: "card", label: t('payment.method.card') ?? "Credit/Debit Card", icon: "credit-card" },
    { id: "paypal", label: t('payment.method.paypal') ?? "PayPal", icon: "account-balance-wallet" },
    { id: "apple", label: t('payment.method.apple') ?? "Apple Pay", icon: "phone-iphone" },
    { id: "google", label: t('payment.method.google') ?? "Google Pay", icon: "android" },
  ]

  const getProviderEnum = (method: string): Enums.TransactionProvider => {
    switch (method) {
      case "card":
      case "paypal":
        return Enums.TransactionProvider.STRIPE;
      case "apple":
      case "google":
        return Enums.TransactionProvider.VNPAY;
      default:
        return Enums.TransactionProvider.STRIPE;
    }
  }

  const handlePayment = () => {
    if (!user?.userId) {
      Alert.alert(t('common.error'), t('errors.userNotFound') ?? "User not authenticated.")
      return;
    }

    if (selectedPaymentMethod === "card" && (!cardNumber || !expiryDate || !cvv || !cardholderName)) {
      Alert.alert(t('common.error'), t('payment.error.cardDetails') ?? "Please fill in all card details")
      return
    }

    const provider: Enums.TransactionProvider = getProviderEnum(selectedPaymentMethod);

    const payload: PaymentRequest = {
      userId: user.userId,
      amount: course.price,
      provider: provider,
      currency: "VND",
      returnUrl: "linguamonkey://payment/success",
      description: t('payment.orderInfo', { title: course.title, userId: user.userId }),
    };

    createPayment.mutate(
      payload,
      {
        onSuccess: async (paymentUrl) => {
          await WebBrowser.openBrowserAsync(paymentUrl)
          navigation.navigate('Wallet');
        },
        onError: (error) => {
          Alert.alert(t('payment.failedTitle') ?? "Please try again or use a different method.")
        },
      }
    )
  }

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, "").replace(/\D/g, "")
    const match = cleaned.match(/.{1,4}/g)
    return match ? match.join(" ") : cleaned
  }

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, "")
    if (cleaned.length >= 2) return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4)
    return cleaned
  }

  const isButtonDisabled = createPayment.isPending || (selectedPaymentMethod === "card" && (!cardNumber || !expiryDate || !cvv || !cardholderName));

  return (
    <ScreenLayout style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.title') ?? "Payment"}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Course Summary */}
        <View style={styles.courseSummary}>
          <Text style={styles.summaryTitle}>{t('payment.summaryTitle') ?? "Course Summary"}</Text>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseInstructor}>{t('payment.instructorPrefix') ?? "by"} {course.instructor}</Text>

          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('payment.coursePrice') ?? "Course Price"}</Text>
              <Text style={styles.priceValue}>{course.price.toLocaleString('vi-VN')} đ</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>{t('payment.total') ?? "Total"}</Text>
              <Text style={styles.totalValue}>{course.price.toLocaleString('vi-VN')} đ</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethods}>
          <Text style={styles.sectionTitle}>{t('payment.methodTitle') ?? "Payment Method"}</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.paymentMethod, selectedPaymentMethod === method.id && styles.selectedPaymentMethod]}
              onPress={() => setSelectedPaymentMethod(method.id as any)}
            >
              <Icon name={method.icon} size={24} color="#4F46E5" />
              <Text style={styles.paymentMethodText}>{method.label}</Text>
              <View style={styles.radioButton}>
                {selectedPaymentMethod === method.id && <View style={styles.radioButtonSelected} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Card Details */}
        {selectedPaymentMethod === "card" && (
          <View style={styles.cardDetails}>
            <Text style={styles.sectionTitle}>{t('payment.cardDetailsTitle') ?? "Card Details"}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('payment.cardNamePlaceholder') ?? "Cardholder Name"}
              value={cardholderName}
              onChangeText={setCardholderName}
            />
            <TextInput
              style={styles.textInput}
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              keyboardType="numeric"
              maxLength={19}
            />
            <View style={styles.cardRow}>
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                placeholder="MM/YY"
                value={expiryDate}
                onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                keyboardType="numeric"
                maxLength={5}
              />
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                placeholder="CVV"
                value={cvv}
                onChangeText={setCvv}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={[styles.payButton, isButtonDisabled && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={isButtonDisabled}
        >
          {createPayment.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Icon name="lock" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>{t('payment.payButton', { amount: course.price.toLocaleString('vi-VN') }) ?? `Pay ${course.price.toLocaleString('vi-VN')} đ`}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF"
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  placeholder: { width: 24 },
  content: { flex: 1 },

  // Summary Card
  courseSummary: { backgroundColor: "#FFF", marginHorizontal: 24, marginTop: 16, padding: 20, borderRadius: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 8 },
  courseTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 4 },
  courseInstructor: { fontSize: 14, color: "#6B7280", marginBottom: 12 },

  priceBreakdown: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 16 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center' },
  priceLabel: { fontSize: 14, color: "#6B7280" },
  priceValue: { fontSize: 14, fontWeight: "500", color: "#374151" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },
  totalLabel: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#4F46E5" },

  // Payment Methods
  paymentMethods: { backgroundColor: "#FFF", marginHorizontal: 24, padding: 20, borderRadius: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
  paymentMethod: { flexDirection: "row", alignItems: "center", padding: 16, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, marginBottom: 12 },
  selectedPaymentMethod: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  paymentMethodText: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: "500", color: "#374151" },
  radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  radioButtonSelected: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4F46E5" },

  // Card Details
  cardDetails: { backgroundColor: "#FFF", marginHorizontal: 24, padding: 20, borderRadius: 16, marginBottom: 16 },
  textInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, marginBottom: 12, color: "#1F2937" },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  halfInput: { flex: 1, marginBottom: 0 },

  // Bottom Action Bar
  bottomAction: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  payButton: {
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8
  },
  payButtonDisabled: {
    backgroundColor: "#9CA3AF"
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF"
  },
});