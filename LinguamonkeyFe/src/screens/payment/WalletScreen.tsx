import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useUserStore } from '../../stores/UserStore';
import { useWallet } from '../../hooks/useWallet';
import { useTransactionsApi } from '../../hooks/useTransaction'; // Sử dụng đúng hook từ prompt đầu tiên
import { createScaledSheet } from '../../utils/scaledStyles';
import { useCurrencyConverter } from '../../hooks/useCurrencyConverter';
import { TransactionResponse } from '../../types/dto';
import ScreenLayout from '../../components/layout/ScreenLayout';
import * as Enums from '../../types/enums';

const PAGE_SIZE = 10;

const WalletScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const formatCurrency = useCurrencyConverter().convert;

  const [page, setPage] = useState(0);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);

  // 1. Lấy số dư ví
  const {
    data: walletData,
    isLoading: loadingBalance,
    refetch: refetchWallet
  } = useWallet().useWalletBalance(user?.userId);

  // 2. Lấy lịch sử giao dịch (Sử dụng useTransactionsByUser từ useTransactionsApi)
  const {
    data: historyQueryResult,
    isLoading: loadingHistory,
    refetch: refetchHistory,
    isRefetching,
  } = useTransactionsApi().useTransactionsByUser(user?.userId, page, PAGE_SIZE);

  // Xử lý dữ liệu phân trang: Reset list khi refresh, nối list khi load more
  useEffect(() => {
    if (historyQueryResult?.data) {
      if (page === 0) {
        setTransactions(historyQueryResult.data);
      } else {
        setTransactions(prev => [...prev, ...historyQueryResult.data]);
      }
    }
  }, [historyQueryResult, page]);

  const hasNextPage = historyQueryResult?.pagination?.hasNext ?? false;

  const onRefresh = async () => {
    setPage(0);
    await Promise.all([
      refetchWallet(),
      refetchHistory()
    ]);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loadingHistory && !isRefetching) {
      setPage(prev => prev + 1);
    }
  };

  // --- Render Components ---

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('wallet.availableBalance')}</Text>
        <Text style={styles.balanceAmount}>
          {loadingBalance ? '...' : formatCurrency(walletData?.balance || 0, 'USD')}
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

      {/* Section Title */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>{t('wallet.transactionHistory')}</Text>
      </View>
    </View>
  );

  const renderTransactionItem = ({ item }: { item: TransactionResponse }) => {
    const isIncome = [
      Enums.TransactionType.DEPOSIT,
      Enums.TransactionType.REFUND,
      // Logic backend cho transfer receive chưa rõ ràng trong DTO, giả định check receiverId === userId
      // Nhưng ở đây dùng Type để style đơn giản
    ].includes(item.type) || (item.type === Enums.TransactionType.TRANSFER && item.receiver?.userId === user?.userId);

    const isExpense = !isIncome; // Transfer sent, Payment, Withdraw

    const statusColor =
      item.status === Enums.TransactionStatus.SUCCESS ? '#10B981' :
        item.status === Enums.TransactionStatus.PENDING ? '#F59E0B' : '#EF4444';

    return (
      <TouchableOpacity
        style={styles.txnCard}
        onPress={() => navigation.navigate('TransactionDetailsScreen', { transactionId: item.transactionId })}
      >
        <View style={styles.txnLeft}>
          <View style={[styles.txnIcon, { backgroundColor: isIncome ? '#D1FAE5' : '#FEE2E2' }]}>
            <Icon
              name={isIncome ? 'arrow-downward' : 'arrow-upward'}
              size={24}
              color={isIncome ? '#10B981' : '#EF4444'}
            />
          </View>
          <View style={styles.txnInfo}>
            <Text style={styles.txnType} numberOfLines={1}>{t(`transaction.type.${item.type}`) || item.type}</Text>
            <Text style={styles.txnDate}>
              {new Date(item.createdAt).toLocaleDateString('vi-VN')} • {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
        <View style={styles.txnRight}>
          <Text style={[styles.txnAmount, { color: isIncome ? '#10B981' : '#EF4444' }]}>
            {isIncome ? '+' : '-'}{formatCurrency(item.amount, item.currency || 'USD')}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {t(`transaction.status.${item.status}`) || item.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (loadingHistory || isRefetching) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#4F46E5" />
        </View>
      );
    }
    return <View style={{ height: 20 }} />;
  };

  const renderEmpty = () => {
    if (loadingHistory && page === 0) return null; // Đang load lần đầu
    return (
      <View style={styles.emptyState}>
        <Icon name="receipt" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>{t('wallet.noTransactions')}</Text>
      </View>
    );
  }

  return (
    <ScreenLayout style={styles.container}>
      {/* Top Bar - Fixed */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main List - Includes Balance Card as Header */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.transactionId}
        renderItem={renderTransactionItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={page === 0 && loadingHistory}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
          />
        }
      />
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Top Bar
  topBar: {
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

  // List Config
  listContent: { paddingBottom: 20 },
  headerContainer: { paddingBottom: 8 },

  // Balance Card
  balanceCard: { backgroundColor: '#4F46E5', margin: 16, padding: 24, borderRadius: 16, elevation: 4, shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  balanceLabel: { color: '#E0E7FF', fontSize: 14, marginBottom: 8 },
  balanceAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginBottom: 24 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },

  // History Section
  listHeader: { paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },

  // Transaction Card
  txnCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  txnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  txnIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txnInfo: { flex: 1, paddingRight: 8 },
  txnType: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  txnDate: { fontSize: 12, color: '#9CA3AF' },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 50, alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Utils
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
  loadingFooter: { paddingVertical: 20, alignItems: 'center' },
});

export default WalletScreen;