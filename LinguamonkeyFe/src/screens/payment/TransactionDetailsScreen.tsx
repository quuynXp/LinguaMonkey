import React from "react"
import { ScrollView, Text, View, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTransactionsApi } from "../../hooks/useTransaction"
import { TransactionResponse } from "../../types/dto"
import { useTranslation } from "react-i18next"
import * as Enums from "../../types/enums"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { createScaledSheet } from "../../utils/scaledStyles"
import { useCurrencyConverter } from "../../hooks/useCurrencyConverter"
import { SupportedCurrency } from "../../utils/currency";

const TransactionDetailsScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation()
  const { transactionId } = route.params
  const { convert } = useCurrencyConverter()

  const { data: rawData, isLoading } = useTransactionsApi().useTransaction(transactionId)
  const transaction = rawData as TransactionResponse

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  if (!transaction) {
    return (
      <ScreenLayout style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('transaction.notFound') ?? 'Transaction not found'}</Text>
        </View>
      </ScreenLayout>
    )
  }

  const getStatusColor = (status: Enums.TransactionStatus) => {
    switch (status) {
      case Enums.TransactionStatus.SUCCESS: return styles.statusSuccess
      case Enums.TransactionStatus.PENDING: return styles.statusPending
      case Enums.TransactionStatus.FAILED: return styles.statusFailed
      case Enums.TransactionStatus.REJECTED: return styles.statusFailed
      case Enums.TransactionStatus.REFUNDED: return styles.statusOther
      default: return styles.statusOther
    }
  }

  const getIconName = (type: Enums.TransactionType) => {
    switch (type) {
      case Enums.TransactionType.DEPOSIT: return "account-balance-wallet";
      case Enums.TransactionType.WITHDRAW: return "payments";
      case Enums.TransactionType.TRANSFER: return "swap-horiz";
      case Enums.TransactionType.PAYMENT: return "shopping-cart";
      case Enums.TransactionType.REFUND: return "undo";
      default: return "receipt";
    }
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('transaction.detailsTitle') ?? 'Details'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.amountCard}>
          <View style={styles.iconCircle}>
            <Icon name={getIconName(transaction.type)} size={32} color="#4F46E5" />
          </View>
          <Text style={styles.amountLabel}>{t('transaction.totalAmount')}</Text>
          <Text style={styles.amountLarge}>
            {convert(transaction.amount, (transaction.currency || 'USD') as SupportedCurrency)}
          </Text>
          <View style={[styles.statusBadge, { borderColor: getStatusColor(transaction.status).color }]}>
            <Text style={[styles.statusText, getStatusColor(transaction.status)]}>
              {t(`transaction.status.${transaction.status}`)}
            </Text>
          </View>
        </View>

        {/* Details List */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>{t('transaction.summary')}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>{t('transaction.transactionId')}</Text>
            <Text style={styles.value} selectable>{transaction.transactionId}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>{t('transaction.type')}</Text>
            <Text style={styles.value}>{t(`transaction.type.${transaction.type}`)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>{t('transaction.provider')}</Text>
            <Text style={styles.value}>{transaction.provider}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>{t('transaction.createdAt')}</Text>
            <Text style={styles.value}>{new Date(transaction.createdAt).toLocaleString('vi-VN')}</Text>
          </View>

          {transaction.updatedAt !== transaction.createdAt && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>{t('transaction.updatedAt')}</Text>
                <Text style={styles.value}>{new Date(transaction.updatedAt).toLocaleString('vi-VN')}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.rowVertical}>
            <Text style={styles.label}>{t('transaction.description')}</Text>
            <Text style={styles.valueDescription}>{transaction.description}</Text>
          </View>

        </View>
      </ScrollView>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#EF4444' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  placeholder: { width: 24 },

  scrollContent: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },

  amountCard: { alignItems: 'center', marginBottom: 24, padding: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  amountLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  amountLarge: { fontSize: 32, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderWidth: 1 },
  statusText: { fontSize: 14, fontWeight: '600' },

  detailsContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowVertical: { paddingVertical: 12 },
  label: { fontSize: 14, color: '#6B7280' },
  value: { fontSize: 14, color: '#1F2937', fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 16 },
  valueDescription: { fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },

  statusSuccess: { color: '#10B981' },
  statusPending: { color: '#F59E0B' },
  statusFailed: { color: '#EF4444' },
  statusOther: { color: '#6B7280' },
});

export default TransactionDetailsScreen;