import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useUserStore } from '../../stores/UserStore';
import { useWallet } from '../../hooks/useWallet';
import { formatCurrency } from '../../utils/currency';
import { createScaledSheet } from '../../utils/scaledStyles';
// import { TransactionResponse } from '../../types/dto'; // Bỏ import này để tránh xung đột
import { PageResponse } from '../../types/dto';
import ScreenLayout from '../../components/layout/ScreenLayout';

// Tái định nghĩa TransactionResponse cục bộ, đảm bảo có trường 'type'
// (Bắt buộc phải làm vì màn hình đang sử dụng 'type', nhưng DTO gốc không có)
interface LocalTransactionResponse {
  transactionId: string;
  userId: string;
  amount: number;
  status: string; // Tạm dùng string thay vì Enums.TransactionStatus
  provider: string; // Tạm dùng string thay vì Enums.TransactionProvider
  description: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  // THÊM TRƯỜNG BỊ THIẾU
  type: string;
}


// Kích thước trang mặc định từ hook là 10
const PAGE_SIZE = 10;

const WalletScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const [page, setPage] = useState(0);

  // Lấy số dư ví
  const {
    data: walletData,
    isLoading: loadingBalance,
    refetch: refetchWallet
  } = useWallet().useWalletBalance(user?.userId);

  // Lấy lịch sử giao dịch (Sử dụng useQuery đơn giản)
  const {
    data: historyQueryResult,
    isLoading: loadingHistory,
    refetch: refetchHistory,
    isRefetching,
  } = useWallet().useTransactionHistory(user?.userId, page, PAGE_SIZE);

  // Lấy danh sách giao dịch từ kết quả query (PageResponse<TransactionResponse>)
  // ÉP KIỂU AN TOÀN CHO DỮ LIỆU ĐẾN TỪ HOOK
  const transactions: LocalTransactionResponse[] = (historyQueryResult?.data || []) as LocalTransactionResponse[];
  const pagination = historyQueryResult?.pagination;
  const hasNextPage = pagination?.hasNext;

  const onRefresh = async () => {
    setPage(0);
    await Promise.all([
      refetchWallet(),
      refetchHistory()
    ]);
  };

  const handleNextPage = () => {
    if (hasNextPage && !loadingHistory) {
      setPage(prev => prev + 1);
    }
  };

  const renderTransactionItem = ({ item }: { item: LocalTransactionResponse }) => {
    const transaction = item; // Đã ép kiểu ở scope trên

    // Đã sửa lỗi TypeScript: item.type
    const isIncome = ['DEPOSIT', 'REFUND', 'TRANSFER_RECEIVE'].includes(transaction.type);
    const statusColor =
      transaction.status === 'SUCCESS' ? '#10B981' :
        transaction.status === 'PENDING' ? '#F59E0B' :
          '#EF4444';

    return (
      <TouchableOpacity
        style={styles.txnCard}
        onPress={() => navigation.navigate('TransactionDetailsScreen', { transactionId: transaction.transactionId })}
      >
        <View style={styles.txnLeft}>
          <View style={[styles.txnIcon, { backgroundColor: isIncome ? '#D1FAE5' : '#FEE2E2' }]}>
            <Icon
              name={isIncome ? 'add-circle' : 'remove-circle'}
              size={24}
              color={isIncome ? '#10B981' : '#EF4444'}
            />
          </View>
          <View style={styles.txnInfo}>
            {/* Đã sửa lỗi TypeScript: item.type */}
            <Text style={styles.txnType}>{t(`transaction.type.${transaction.type}`)}</Text>
            <Text style={styles.txnDate}>
              {new Date(transaction.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>
        <View style={styles.txnRight}>
          <Text style={[styles.txnAmount, { color: isIncome ? '#10B981' : '#EF4444' }]}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {t(`transaction.status.${transaction.status}`)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (loadingHistory && !isRefetching) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#4F46E5" />
        </View>
      );
    }
    // Hiển thị nút Tải thêm nếu còn trang và không đang tải
    if (hasNextPage && !loadingHistory && transactions.length > 0) {
      return (
        <TouchableOpacity style={styles.loadMoreButton} onPress={handleNextPage}>
          <Text style={styles.loadMoreText}>{t('common.loadMore')}</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  if (loadingBalance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>{t('wallet.loading')}</Text>
      </View>
    );
  }

  return (
    <ScreenLayout style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('wallet.availableBalance')}</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(walletData?.balance || 0)}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('TopUpScreen')}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.actionText}>{t('wallet.topup')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('WithdrawScreen')}
          >
            <Icon name="arrow-downward" size={20} color="#fff" />
            <Text style={styles.actionText}>{t('wallet.withdraw')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('TransferScreen')}
          >
            <Icon name="compare-arrows" size={20} color="#fff" />
            <Text style={styles.actionText}>{t('wallet.transfer')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transaction History */}
      <View style={[styles.section, { flex: 1 }]}>
        <Text style={styles.sectionTitle}>{t('wallet.transactionHistory')}</Text>

        {transactions.length === 0 && loadingHistory && page === 0 ? (
          <ActivityIndicator size="small" color="#4F46E5" style={{ marginTop: 20 }} />
        ) : transactions.length === 0 && !loadingHistory ? (
          <View style={styles.emptyState}>
            <Icon name="receipt" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>{t('wallet.noTransactions')}</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.transactionId}
            renderItem={renderTransactionItem}
            contentContainerStyle={styles.historyList}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={loadingHistory && page === 0}
                onRefresh={onRefresh}
                tintColor="#4F46E5"
              />
            }
          />
        )}
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#4F46E5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  placeholder: { width: 24 },
  balanceCard: { backgroundColor: '#4F46E5', marginHorizontal: 16, marginBottom: 16, padding: 24, borderRadius: 16, elevation: 4 },
  balanceLabel: { color: '#E0E7FF', fontSize: 14, marginBottom: 8 },
  balanceAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginBottom: 24 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },
  section: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  historyList: { paddingBottom: 20 },
  txnCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  txnIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txnInfo: { flex: 1 },
  txnType: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  txnDate: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, minWidth: 60, alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
  loadingFooter: { paddingVertical: 10 },
  loadMoreButton: {
    backgroundColor: '#E0E7FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  loadMoreText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default WalletScreen;