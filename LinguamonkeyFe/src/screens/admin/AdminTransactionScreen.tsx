import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTransactionsApi } from "../../hooks/useTransaction";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import Icon from "react-native-vector-icons/MaterialIcons";
import { TransactionResponse } from "../../types/dto";

type FilterType = 'ALL' | 'PENDING_WITHDRAWAL';

const AdminTransactionScreen = () => {
  const { t } = useTranslation();
  const {
    useTransactions,
    usePendingWithdrawals,
    useApproveWithdrawal,
    useRejectWithdrawal
  } = useTransactionsApi();

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [page, setPage] = useState(0);

  // Rejection State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Info Modal State
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedBankInfo, setSelectedBankInfo] = useState<any>(null);

  // Queries
  const allHistoryQuery = useTransactions({ page, size: 20 });
  const pendingWithdrawalsQuery = usePendingWithdrawals(page, 20);

  // Mutations
  const approveMutation = useApproveWithdrawal();
  const rejectMutation = useRejectWithdrawal();

  const activeQuery = filter === 'ALL' ? allHistoryQuery : pendingWithdrawalsQuery;
  const { data, isLoading, refetch, isFetching } = activeQuery;

  const handleTabChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(0);
  };

  const handleApprove = (id: string) => {
    Alert.alert(
      t('admin.withdraw.confirmApproveTitle'),
      t('admin.withdraw.confirmApproveMsg') + "\n(Funds will be transferred automatically via Payout Service)",
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => approveMutation.mutate(id)
        }
      ]
    );
  };

  const openRejectModal = (id: string) => {
    setSelectedTxId(id);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleRejectConfirm = () => {
    if (selectedTxId && rejectReason.trim()) {
      rejectMutation.mutate({ id: selectedTxId, reason: rejectReason }, {
        onSuccess: () => {
          setRejectModalVisible(false);
          setSelectedTxId(null);
        }
      });
    }
  };

  // Helper to parse bank details from description
  const parseBankDetails = (description: string) => {
    try {
      // Try parsing JSON first
      return JSON.parse(description);
    } catch (e) {
      // Fallback if plain text
      return { note: description };
    }
  };

  const showBankDetails = (description: string) => {
    const info = parseBankDetails(description);
    setSelectedBankInfo(info);
    setInfoModalVisible(true);
  };

  const renderItem = ({ item }: { item: TransactionResponse }) => {
    const isActionable = filter === 'PENDING_WITHDRAWAL' && item.status === 'PENDING';
    const isWithdraw = item.type === 'WITHDRAW';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.iconBox, { backgroundColor: item.status === 'SUCCESS' ? '#DEF7EC' : item.status === 'PENDING' ? '#FEF3C7' : '#FEF2F2' }]}>
            <Icon
              name={item.status === 'SUCCESS' ? "check" : item.status === 'PENDING' ? "access-time" : "close"}
              size={20}
              color={item.status === 'SUCCESS' ? "#059669" : item.status === 'PENDING' ? "#D97706" : "#DC2626"}
            />
          </View>
          <View style={styles.info}>
            <Text style={styles.type}>{item.type}</Text>
            <Text style={styles.user}>{item.user?.fullname || item.user?.email || 'Unknown User'}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>

            {/* Show view details button if it's a withdraw request */}
            {isWithdraw && (
              <TouchableOpacity onPress={() => showBankDetails(item.description)} style={{ marginTop: 4 }}>
                <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '600' }}>View Bank Details</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.amountBox}>
            <Text style={[styles.amount, { color: item.amount > 0 ? "#059669" : "#DC2626" }]}>
              {item.amount > 0 ? "+" : ""}{item.amount}
            </Text>
            <Text style={styles.currency}>{item.currency || 'USD'}</Text>
          </View>
        </View>

        {isActionable && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnReject]}
              onPress={() => openRejectModal(item.transactionId)}
            >
              <Text style={styles.btnTextReject}>{t('common.reject')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnApprove]}
              onPress={() => handleApprove(item.transactionId)}
            >
              <Text style={styles.btnTextApprove}>{t('common.approve')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <Text style={styles.title}>{t("admin.transactions.title")}</Text>

        {/* Filter Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, filter === 'ALL' && styles.activeTab]}
            onPress={() => handleTabChange('ALL')}
          >
            <Text style={[styles.tabText, filter === 'ALL' && styles.activeTabText]}>{t('admin.transactions.all')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === 'PENDING_WITHDRAWAL' && styles.activeTab]}
            onPress={() => handleTabChange('PENDING_WITHDRAWAL')}
          >
            <Text style={[styles.tabText, filter === 'PENDING_WITHDRAWAL' && styles.activeTabText]}>{t('admin.transactions.pendingWithdraw')}</Text>
          </TouchableOpacity>
        </View>

        {isLoading && page === 0 ? (
          <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
        ) : (
          <FlatList<TransactionResponse>
            data={(data?.data || []) as TransactionResponse[]}
            keyExtractor={(item) => item.transactionId}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
            onEndReached={() => {
              if (data?.pagination?.hasNext) setPage(p => p + 1);
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Icon name="receipt" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>{t('common.noData')}</Text>
              </View>
            }
          />
        )}

        {/* Reject Modal */}
        <Modal
          visible={rejectModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRejectModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('admin.withdraw.rejectReason')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('admin.withdraw.enterReason')}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setRejectModalVisible(false)}
                >
                  <Text style={styles.modalBtnTextCancel}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={handleRejectConfirm}
                >
                  {rejectMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalBtnTextConfirm}>{t('common.confirm')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Bank Info Modal */}
        <Modal
          visible={infoModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setInfoModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Bank Information</Text>
              {selectedBankInfo && (
                <View style={styles.infoContainer}>
                  {selectedBankInfo.bankCode && (
                    <Text style={styles.infoText}><Text style={styles.bold}>Bank:</Text> {selectedBankInfo.bankCode}</Text>
                  )}
                  {selectedBankInfo.accountNumber && (
                    <Text style={styles.infoText}><Text style={styles.bold}>Account No:</Text> {selectedBankInfo.accountNumber}</Text>
                  )}
                  {selectedBankInfo.accountName && (
                    <Text style={styles.infoText}><Text style={styles.bold}>Name:</Text> {selectedBankInfo.accountName}</Text>
                  )}
                  {selectedBankInfo.note && (
                    <Text style={styles.infoText}><Text style={styles.bold}>Note:</Text> {selectedBankInfo.note}</Text>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#4F46E5', marginTop: 20, alignItems: 'center' }]}
                onPress={() => setInfoModalVisible(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  title: { fontSize: 20, fontWeight: "700", margin: 20, color: "#1E293B" },
  loader: { marginTop: 20 },
  list: { paddingHorizontal: 16 },

  // Tabs
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#4F46E5' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#4F46E5' },

  // Card
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  type: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  user: { fontSize: 12, color: "#4B5563", marginTop: 2 },
  date: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: "700" },
  currency: { fontSize: 11, color: "#9CA3AF" },

  // Actions
  actionRow: { flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 12 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnReject: { backgroundColor: '#FEF2F2' },
  btnApprove: { backgroundColor: '#EFF6FF' },
  btnTextReject: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
  btnTextApprove: { color: '#2563EB', fontWeight: '600', fontSize: 13 },

  // Empty
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 8, color: '#9CA3AF' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1F2937' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalBtnCancel: { backgroundColor: '#F3F4F6' },
  modalBtnConfirm: { backgroundColor: '#DC2626' },
  modalBtnTextCancel: { color: '#374151', fontWeight: '600' },
  modalBtnTextConfirm: { color: '#fff', fontWeight: '600' },

  infoContainer: { marginVertical: 10 },
  infoText: { fontSize: 16, marginBottom: 8, color: '#374151' },
  bold: { fontWeight: '700', color: '#1F2937' }
});

export default AdminTransactionScreen;