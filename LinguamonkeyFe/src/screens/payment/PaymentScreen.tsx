import { useState } from "react"
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useUserStore } from "../../stores/UserStore"
import * as WebBrowser from "expo-web-browser"
import { useCreatePayment } from "../../hooks/useTransaction" 
import { createScaledSheet } from "../../utils/scaledStyles"

const PaymentScreen = ({ navigation, route }) => {
  const { course } = route.params
  const { user } = useUserStore()
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"card" | "paypal" | "apple" | "google">("card")
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardholderName, setCardholderName] = useState("")

  const createPayment = useCreatePayment()

  const paymentMethods = [
    { id: "card", label: "Credit/Debit Card", icon: "credit-card" },
    { id: "paypal", label: "PayPal", icon: "account-balance-wallet" },
    { id: "apple", label: "Apple Pay", icon: "phone-iphone" },
    { id: "google", label: "Google Pay", icon: "android" },
  ]

  const handlePayment = () => {
    if (selectedPaymentMethod === "card" && (!cardNumber || !expiryDate || !cvv || !cardholderName)) {
      Alert.alert("Error", "Please fill in all card details")
      return
    }

    const provider =
      selectedPaymentMethod === "paypal"
        ? "STRIPE"
        : selectedPaymentMethod === "card"
        ? "STRIPE"
        : selectedPaymentMethod.toUpperCase()

    createPayment.mutate(
      {
        userId: user.userId,
        amount: course.price,
        method: provider,
        orderInfo: `Payment for ${course.title}`,
      },
      {
        onSuccess: async (paymentUrl) => {
          await WebBrowser.openBrowserAsync(paymentUrl)
        },
        onError: () => {
          Alert.alert("Payment Failed", "Please try again or use a different method.")
        },
      }
    )
  }

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, "")
    const match = cleaned.match(/.{1,4}/g)
    return match ? match.join(" ") : cleaned
  }

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, "")
    if (cleaned.length >= 2) return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4)
    return cleaned
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Course Summary */}
        <View style={styles.courseSummary}>
          <Text style={styles.summaryTitle}>Course Summary</Text>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseInstructor}>by {course.instructor}</Text>

          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Course Price</Text>
              <Text style={styles.priceValue}>{course.price.toLocaleString()} đ</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{course.price.toLocaleString()} đ</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethods}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
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
            <Text style={styles.sectionTitle}>Card Details</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Cardholder Name"
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
            <TextInput
              style={styles.textInput}
              placeholder="MM/YY"
              value={expiryDate}
              onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
              keyboardType="numeric"
              maxLength={5}
            />
            <TextInput
              style={styles.textInput}
              placeholder="CVV"
              value={cvv}
              onChangeText={setCvv}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
            />
          </View>
        )}
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={[styles.payButton, createPayment.isPending && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={createPayment.isPending}
        >
          {createPayment.isPending ? (
            <>
              <LottieView source={require("../../assets/animations/loading.json")} autoPlay loop style={styles.loadingAnimation} />
              <Text style={styles.payButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <Icon name="lock" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Pay {course.price.toLocaleString()} đ</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: "#FFFFFF" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  content: { flex: 1 },
  courseSummary: { backgroundColor: "#FFF", margin: 24, padding: 20, borderRadius: 16 },
  summaryTitle: { fontSize: 18, fontWeight: "bold" },
  courseTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  courseInstructor: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  priceBreakdown: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 16 },
  priceRow: { flexDirection: "row", justifyContent: "space-between" },
  priceLabel: { fontSize: 14, color: "#6B7280" },
  priceValue: { fontSize: 14, fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  totalLabel: { fontSize: 16, fontWeight: "600" },
  totalValue: { fontSize: 16, fontWeight: "bold" },
  paymentMethods: { backgroundColor: "#FFF", margin: 24, padding: 20, borderRadius: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  paymentMethod: { flexDirection: "row", alignItems: "center", padding: 16, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, marginBottom: 12 },
  selectedPaymentMethod: { borderColor: "#4F46E5", backgroundColor: "#F8FAFF" },
  paymentMethodText: { flex: 1, marginLeft: 12 },
  radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  radioButtonSelected: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4F46E5" },
  cardDetails: { backgroundColor: "#FFF", margin: 24, padding: 20, borderRadius: 16 },
  textInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, marginBottom: 12 },
  bottomAction: { backgroundColor: "#FFF", padding: 24 },
  payButton: { backgroundColor: "#4F46E5", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 12, gap: 8 },
  payButtonDisabled: { backgroundColor: "#9CA3AF" },
  payButtonText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  loadingAnimation: { width: 20, height: 20 },
})

export default PaymentScreen
