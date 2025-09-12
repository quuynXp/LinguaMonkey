import { FlatList, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useUserStore } from "../../stores/UserStore"
import { useTransactionsByUser } from "../../hooks/useTransaction"
import { gotoTab } from "../../utils/navigationRef"

const TransactionHistoryScreen = () => {
  const { user } = useUserStore()
  const { data, isLoading } = useTransactionsByUser(user.userId, 0, 20)

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  const transactions = data?.content ?? []

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => gotoTab("TransactionDetailsScreen", { id: item.id })}
      key={item.id}
      className="bg-white p-4 rounded-2xl mb-3 shadow-sm"
    >
      <View className="flex-row items-center mb-2">
        <Icon name="payment" size={22} color="#4F46E5" />
        <Text className="ml-2 text-lg font-semibold text-gray-900">{item.amount.toLocaleString()} đ</Text>
      </View>

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
        <Text className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  )

  return <FlatList data={transactions} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 16 }} />
}

export default TransactionHistoryScreen
