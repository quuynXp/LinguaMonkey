"use client"

import LottieView from "lottie-react-native"
import { useState } from "react"
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"

const PaymentScreen = ({ navigation, route }) => {
  const { course } = route.params
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardholderName, setCardholderName] = useState("")

  const paymentMethods = [
    { id: "card", label: "Credit/Debit Card", icon: "credit-card" },
    { id: "paypal", label: "PayPal", icon: "account-balance-wallet" },
    { id: "apple", label: "Apple Pay", icon: "phone-iphone" },
    { id: "google", label: "Google Pay", icon: "android" },
  ]

  const handlePayment = async () => {
    if (selectedPaymentMethod === "card") {
      if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
        Alert.alert("Error", "Please fill in all card details")
        return
      }
    }

    setIsProcessing(true)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 3000))

      Alert.alert("Payment Successful!", "You now have access to the full course. Happy learning!", [
        {
          text: "Start Learning",
          onPress: () => {
            navigation.navigate("CourseDetails", { course, isPurchased: true })
          },
        },
      ])
    } catch (error) {
      Alert.alert("Payment Failed", "Please try again or use a different payment method.")
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s/g, "")
    const match = cleaned.match(/.{1,4}/g)
    return match ? match.join(" ") : cleaned
  }

  const formatExpiryDate = (text) => {
    const cleaned = text.replace(/\D/g, "")
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4)
    }
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
          <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>{course.title}</Text>
            <Text style={styles.courseInstructor}>by {course.instructor}</Text>
            <View style={styles.courseDetails}>
              <View style={styles.detailItem}>
                <Icon name="schedule" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{course.duration}</Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="star" size={16} color="#F59E0B" />
                <Text style={styles.detailText}>{course.rating}</Text>
              </View>
            </View>
          </View>

          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Course Price</Text>
              <Text style={styles.priceValue}>${course.price}</Text>
            </View>
            {course.originalPrice && (
              <View style={styles.priceRow}>
                <Text style={styles.discountLabel}>Discount</Text>
                <Text style={styles.discountValue}>-${(course.originalPrice - course.price).toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${course.price}</Text>
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
              onPress={() => setSelectedPaymentMethod(method.id)}
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="John Doe"
                value={cardholderName}
                onChangeText={setCardholderName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="123"
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </View>
        )}

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Icon name="security" size={20} color="#10B981" />
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We never store your card details.
          </Text>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <LottieView
                source={require("../../assets/animations/loading.json")}
                autoPlay
                loop
                style={styles.loadingAnimation}
              />
              <Text style={styles.payButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <Icon name="lock" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Pay ${course.price}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  content: {
    flex: 1,
  },
  courseSummary: {
    backgroundColor: "#FFFFFF",
    margin: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  courseInfo: {
    marginBottom: 20,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  courseInstructor: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  courseDetails: {
    flexDirection: "row",
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: "#6B7280",
  },
  priceBreakdown: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  priceValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  discountLabel: {
    fontSize: 14,
    color: "#10B981",
  },
  discountValue: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  paymentMethods: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginBottom: 12,
  },
  selectedPaymentMethod: {
    borderColor: "#4F46E5",
    backgroundColor: "#F8FAFF",
  },
  paymentMethodText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 12,
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4F46E5",
  },
  cardDetails: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  inputRow: {
    flexDirection: "row",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  securityText: {
    fontSize: 14,
    color: "#166534",
    flex: 1,
    lineHeight: 20,
  },
  bottomAction: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  payButton: {
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  loadingAnimation: {
    width: 20,
    height: 20,
  },
})

export default PaymentScreen
