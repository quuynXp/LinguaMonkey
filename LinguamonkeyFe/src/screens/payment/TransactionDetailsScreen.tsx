import { ScrollView, Text, View, ActivityIndicator } from "react-native"
import { useTransaction } from "../../hooks/useTransaction"

const TransactionDetailsScreen = ({ route }) => {
  const { id } = route.params
  const { data: transaction, isLoading } = useTransaction(id)

  if (isLoading || !transaction) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="bg-white p-6 rounded-2xl shadow-md">
        <Text className="text-xl font-bold text-gray-900 mb-4">Transaction Details</Text>

        <Text className="text-base text-gray-800">
          💰 Amount: <Text className="font-semibold">{transaction.amount.toLocaleString()} đ</Text>
        </Text>

        {transaction.method && (
          <Text className="text-base text-gray-800 mt-2">
            🔗 Provider: <Text className="font-medium">{transaction.method}</Text>
          </Text>
        )}

        <Text className="text-base text-gray-800 mt-2">
          📌 Status:{" "}
          <Text
            className={`font-bold ${
              transaction.status === "SUCCESS"
                ? "text-green-600"
                : transaction.status === "PENDING"
                ? "text-yellow-500"
                : transaction.status === "FAILED"
                ? "text-red-500"
                : "text-gray-500"
            }`}
          >
            {transaction.status}
          </Text>
        </Text>

        <Text className="text-base text-gray-800 mt-2">
          🕒 Created At: <Text className="font-medium">{new Date(transaction.createdAt).toLocaleString()}</Text>
        </Text>

        <Text className="text-base text-gray-800 mt-2">
          🔄 Updated At: <Text className="font-medium">{new Date(transaction.updatedAt).toLocaleString()}</Text>
        </Text>
      </View>
    </ScrollView>
  )
}

export default TransactionDetailsScreen
