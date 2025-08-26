import { useEffect, useState } from "react"
import { FlatList, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import axios from "../../api/axiosInstance"
import { useUserStore } from "../../stores/UserStore"
import { Transaction } from "../../types/api"
import { resetToTab } from "../../utils/navigationRef"

const TransactionHistoryScreen = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        const userId = useUserStore.getState().user.user_id
        const res = await axios.get(`/transactions/user/${userId}?page=0&size=20`)
        setTransactions(res.data.result.content)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchTransactions()
  }, [])

  const renderItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      onPress={() => resetToTab("TransactionDetailsScreen", { id: item.transaction_id })}
      key={item.transaction_id}
      className="bg-white p-4 rounded-2xl mb-3 shadow-sm"
    >
      <View className="flex-row items-center mb-2">
        <Icon name="payment" size={22} color="#4F46E5" />
        <Text className="ml-2 text-lg font-semibold text-gray-900">{item.amount.toLocaleString()} đ</Text>
      </View>

      {item.description && (
        <Text className="text-sm text-gray-600 mb-1">{item.description}</Text>
      )}

      <View className="flex-row justify-between items-center mt-1">
        <Text
          className={`text-sm font-semibold ${
            item.status === "SUCCESS"
              ? "text-green-600"
              : item.status === "PENDING"
              ? "text-yellow-500"
              : item.status === "FAILED"
              ? "text-red-500"
              : "text-gray-500"
          }`}
        >
          {item.status}
        </Text>
        <Text className="text-xs text-gray-500">
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  return (
    <FlatList
      data={transactions}
      renderItem={renderItem}
      keyExtractor={(item) => item.transaction_id}
      contentContainerStyle={{ padding: 16 }}
    />
  )
}

export default TransactionHistoryScreen
