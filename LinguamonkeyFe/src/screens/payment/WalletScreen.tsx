import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useUserStore } from '../../stores/UserStore';
import { useWallet } from '../../hooks/useWallet';
import { formatCurrency } from '../../utils/currency';
import { createScaledSheet } from '../../utils/scaledStyles';

const WalletScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const [page, setPage] = useState(0);

  const {
    data: walletData,
    isLoading: loadingBalance,
    refetch: refetchWallet
  } = useWallet().useWalletBalance(user?.userId);

  const {
    data: historyData,
    isLoading: loadingHistory,
    refetch: refetchHistory,
    hasNextPage,
    fetchNextPage
  } = useWallet().useTransactionHistory(user?.userId, page, 10);

  const onRefresh = async () => {
    await Promise.all([
      refetchWallet(),
      refetchHistory()
    ]);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loadingHistory) {
      setPage(prev => prev + 1);
      fetchNextPage?.();
    }
  };

  const renderTransactionItem = ({ item }) => {
    const isIncome = ['DEPOSIT', 'REFUND', 'TRANSFER_RECEIVE'].includes(item.type);
    const statusColor =
      item.status === 'SUCCESS' ? '#10B981' :
        item.status === 'PENDING' ? '#F59E0B' :
          '#EF4444';

    return (
      <TouchableOpacity
        style={styles.txnCard}
        onPress={() => navigation.navigate('TransactionDetails', { transactionId: item.transactionId })}
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
            <Text style={styles.txnType}>{t(`transaction.type.${item.type}`)}</Text>
            <Text style={styles.txnDate}>
              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>
        <View style={styles.txnRight}>
          <Text style={[styles.txnAmount, { color: isIncome ? '#10B981' : '#EF4444' }]}>
            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {t(`transaction.status.${item.status}`)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loadingBalance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('wallet.availableBalance')}</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(walletData?.balance || 0)}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('TopUp')}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.actionText}>{t('wallet.topup')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Withdraw')}
          >
            <Icon name="arrow-downward" size={20} color="#fff" />
            <Text style={styles.actionText}>{t('wallet.withdraw')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Transfer')}
          >
            <Icon name="compare-arrows" size={20} color="#fff" />
            <Text style={styles.actionText}>{t('wallet.transfer')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transaction History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('wallet.transactionHistory')}</Text>

        {loadingHistory && page === 0 ? (
          <ActivityIndicator size="small" color="#4F46E5" />
        ) : historyData?.data?.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="receipt" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>{t('wallet.noTransactions')}</Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={loadingHistory}
                onRefresh={onRefresh}
                tintColor="#4F46E5"
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
          >
            {historyData?.data?.map(item => (
              <View key={item.transactionId}>
                {renderTransactionItem({ item })}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  balanceCard: { backgroundColor: '#4F46E5', margin: 16, padding: 24, borderRadius: 16, elevation: 4 },
  balanceLabel: { color: '#E0E7FF', fontSize: 14, marginBottom: 8 },
  balanceAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginBottom: 24 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },
  section: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  txnCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  txnIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txnInfo: { flex: 1 },
  txnType: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  txnDate: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
});

export default WalletScreen;