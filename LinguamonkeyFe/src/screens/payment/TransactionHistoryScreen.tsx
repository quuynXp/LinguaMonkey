import { FlatList, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useUserStore } from "../../stores/UserStore"
import { useTransactionsApi } from "../../hooks/useTransaction"
import { useTranslation } from "react-i18next"
import { TransactionResponse } from "../../types/dto"
import ScreenLayout from "../../components/layout/ScreenLayout"
import * as Enums from "../../types/enums"
import { createScaledSheet } from "../../utils/scaledStyles"

const TransactionHistoryScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useUserStore();

  const { data: historyData, isLoading } = useTransactionsApi().useTransactionsByUser(user?.userId, 0, 50);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.dateText}>{t('common.loading')}</Text>
      </View>
    )
  }

  const transactions: TransactionResponse[] = (historyData?.data as TransactionResponse[]) ?? [];

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return t('transaction.type.deposit') ?? 'Nạp tiền';
      case 'WITHDRAW': return t('transaction.type.withdraw') ?? 'Rút tiền';
      case 'PAYMENT': return t('transaction.type.payment') ?? 'Thanh toán';
      case 'TRANSFER': return t('transaction.type.transfer') ?? 'Chuyển khoản';
      case 'UPGRADE_VIP': return t('transaction.type.vip') ?? 'Nâng cấp VIP';
      case 'REFUND': return t('transaction.type.refund') ?? 'Hoàn tiền';
      default: return type;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'add-circle-outline';
      case 'WITHDRAW': return 'remove-circle-outline';
      case 'PAYMENT': return 'shopping-cart';
      case 'UPGRADE_VIP': return 'workspace-premium';
      case 'REFUND': return 'undo';
      default: return 'payment';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'VNPAY': return '#005BAA';
      case 'STRIPE': return '#635BFF';
      case 'INTERNAL': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const renderItem = ({ item }: { item: TransactionResponse }) => {
    const status = item.status;
    const isNegative = item.type === 'PAYMENT' || item.type === 'WITHDRAW' || item.type === 'UPGRADE_VIP' || (item.type === 'TRANSFER' && item.user.userId === user?.userId);
    const sign = isNegative ? '-' : '+';
    const amountColor = isNegative ? '#EF4444' : '#10B981';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("TransactionDetailsScreen", { transactionId: item.transactionId })}
        key={item.transactionId}
        style={styles.itemCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <View style={[styles.iconBox, { backgroundColor: isNegative ? '#FEE2E2' : '#D1FAE5' }]}>
              <Icon name={getTransactionTypeIcon(item.type)} size={20} color={isNegative ? '#EF4444' : '#10B981'} />
            </View>
            <View style={styles.titleColumn}>
              <Text style={styles.typeText}>{getTransactionTypeLabel(item.type)}</Text>
              <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
            </View>
          </View>
          <Text style={[styles.amountText, { color: amountColor }]}>
            {sign}{item.amount.toLocaleString('vi-VN')} {item.currency}
          </Text>
        </View>

        {item.description && (
          <Text style={styles.descriptionText} numberOfLines={1} ellipsizeMode="tail">
            {item.description}
          </Text>
        )}

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <View style={[styles.badge, { backgroundColor: getProviderColor(item.provider) + '20' }]}>
            <Text style={[styles.badgeText, { color: getProviderColor(item.provider) }]}>{item.provider}</Text>
          </View>

          <Text
            style={[
              styles.statusOther,
              status === Enums.TransactionStatus.SUCCESS && styles.statusSuccess,
              status === Enums.TransactionStatus.PENDING && styles.statusPending,
              status === Enums.TransactionStatus.FAILED && styles.statusFailed,
              status === Enums.TransactionStatus.REJECTED && styles.statusFailed,
              status === Enums.TransactionStatus.REFUNDED && styles.statusOther,
            ]}
          >
            {t(`transaction.status.${status}`)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('history.title') ?? 'Lịch sử giao dịch'}</Text>
        <View style={styles.placeholder} />
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="receipt-long" size={60} color="#D1D5DB" />
          <Text style={styles.emptyText}>{t('history.noTransactions') ?? 'Chưa có giao dịch nào.'}</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.transactionId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    backgroundColor: '#F3F4F6'
  },
  listContent: {
    padding: 16
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  titleColumn: {
    flex: 1
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8
  },
  descriptionText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 18
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  statusSuccess: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981'
  },
  statusPending: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B'
  },
  statusFailed: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444'
  },
  statusOther: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF'
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF'
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