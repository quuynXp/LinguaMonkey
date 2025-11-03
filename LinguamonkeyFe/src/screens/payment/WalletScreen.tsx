import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useWallet } from '../../hooks/useWallet';
import { useUserStore } from '../../stores/UserStore';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

// (Cần import các Modal/Component con)
// import DepositModal from '../../components/DepositModal';
// import WithdrawModal from '../../components/WithdrawModal';
// import TransferModal from '../../components/TransferModal';

const WalletScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const { useWalletBalance, useTransactionHistory } = useWallet();

  const [isDepositVisible, setDepositVisible] = useState(false);
  const [isWithdrawVisible, setWithdrawVisible] = useState(false);
  const [isTransferVisible, setTransferVisible] = useState(false);

  const { data: wallet, isLoading: balanceLoading, refetch: refetchBalance } = useWalletBalance(user?.userId);
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useTransactionHistory(user?.userId);

  const transactions = historyData?.data || [];
  const isLoading = balanceLoading || historyLoading;
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchBalance(), refetchHistory()]);
    setIsRefreshing(false);
  };

  const renderTransactionItem = (tx) => (
    <View key={tx.transactionId} style={styles.txItem}>
      <View>
        <Text style={styles.txType}>{t(`wallet.types.${tx.type}`)}</Text>
        <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleString()}</Text>
      </View>
      <Text style={[
        styles.txAmount,
        tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? styles.txAmountCredit : styles.txAmountDebit
      ]}>
        {tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? '+' : '-'}${tx.amount.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('wallet.currentBalance')}</Text>
        {balanceLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.balanceAmount}>${wallet?.balance.toFixed(2) || '0.00'}</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setDepositVisible(true)}>
          <Icon name="account-balance-wallet" size={24} color="#4F46E5" />
          <Text style={styles.actionText}>{t('wallet.deposit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setWithdrawVisible(true)}>
          <Icon name="request-quote" size={24} color="#4F46E5" />
          <Text style={styles.actionText}>{t('wallet.withdraw')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setTransferVisible(true)}>
          <Icon name="send" size={24} color="#4F46E5" />
          <Text style={styles.actionText}>{t('wallet.transfer')}</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction History */}
      <Text style={styles.historyTitle}>{t('wallet.history')}</Text>
      <ScrollView
        style={styles.historyList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading && transactions.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyHistory}>{t('wallet.noTransactions')}</Text>
        ) : (
          transactions.map(renderTransactionItem)
        )}
      </ScrollView>

      {/* Modals */}
      {/* <DepositModal visible={isDepositVisible} onClose={() => setDepositVisible(false)} /> */}
      {/* <WithdrawModal visible={isWithdrawVisible} onClose={() => setWithdrawVisible(false)} /> */}
      {/* <TransferModal visible={isTransferVisible} onClose={() => setTransferVisible(false)} /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  balanceCard: {
    backgroundColor: '#4F46E5',
    margin: 24,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 16, color: '#E0E7FF', marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF' },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 24,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
    elevation: 2,
  },
  actionText: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#4F46E5' },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  historyList: { flex: 1, paddingHorizontal: 24 },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  txType: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  txDate: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  txAmountCredit: { color: '#10B981' },
  txAmountDebit: { color: '#EF4444' },
  emptyHistory: { textAlign: 'center', marginTop: 32, color: '#6B7280' },
});

export default WalletScreen;