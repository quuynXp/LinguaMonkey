import { FlatList, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useUserStore } from "../../stores/UserStore"
import { useTransactionsApi } from "../../hooks/useTransaction" // Giả định hook library useTransactionsApi tồn tại
import { gotoTab } from "../../utils/navigationRef"
import { useTranslation } from "react-i18next"
import { TransactionResponse } from "../../types/dto" // DTO đã được xác minh
import ScreenLayout from "../../components/layout/ScreenLayout" // Giả định ScreenLayout tồn tại
import * as Enums from "../../types/enums" // Import Enums để đảm bảo type safety cho status
import { createScaledSheet } from "../../utils/scaledStyles"

const TransactionHistoryScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useUserStore();

  const { data: historyData, isLoading } = useTransactionsApi().useTransactionsByUser(user?.userId, 0, 20);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.dateText}>{t('common.loading')}</Text>
      </View>
    )
  }

  const transactions: TransactionResponse[] = (historyData?.data as TransactionResponse[]) ?? [];

  const renderItem = ({ item }: { item: TransactionResponse }) => {
    const status = item.status;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("TransactionDetailsScreen", { id: item.transactionId })}
        key={item.transactionId} // KeyExtractor an toàn
        style={styles.itemCard}
      >
        <View style={styles.amountRow}>
          <Icon name="payment" size={22} color="#4F46E5" />
          <Text style={styles.amountText}>{item.amount.toLocaleString('vi-VN')} VND</Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            style={[
              styles.statusOther,
              status === Enums.TransactionStatus.SUCCESS && styles.statusSuccess,
              status === Enums.TransactionStatus.PENDING && styles.statusPending,
              status === Enums.TransactionStatus.FAILED && styles.statusFailed,
            ]}
          >
            {t(`transaction.status.${status}`)}
          </Text>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScreenLayout style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('history.title') ?? 'Transaction History'}</Text>
        <View style={styles.placeholder} />
      </View>

      {transactions.length === 0 ? (
        // Empty State: Hiển thị khi không có giao dịch
        <View style={styles.emptyState}>
          <Icon name="receipt-long" size={60} color="#D1D5DB" />
          <Text style={styles.emptyText}>{t('history.noTransactions') ?? 'No transactions found.'}</Text>
        </View>
      ) : (
        // FlatList hiển thị danh sách giao dịch
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.transactionId}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  placeholder: {
    width: 24
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  },
  listContent: {
    padding: 16
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  amountText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  statusSuccess: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981' // green-600 
  },
  statusPending: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B' // yellow-500 
  },
  statusFailed: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444' // red-500 
  },
  statusOther: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280' // gray-500 
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280'
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
});


export default TransactionHistoryScreen