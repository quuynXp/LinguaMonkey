import { ScrollView, Text, View, ActivityIndicator, TouchableOpacity } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTransactionsApi } from "../../hooks/useTransaction"

import { TransactionResponse } from "../../types/dto"
import { useTranslation } from "react-i18next"
import * as Enums from "../../types/enums"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { createScaledSheet } from "../../utils/scaledStyles"

const TransactionDetailsScreen = ({ route, navigation }) => {
  const { t } = useTranslation()
  const { id } = route.params

  const { data: rawData, isLoading } = useTransactionsApi().useTransaction(id)

  const transaction = rawData as TransactionResponse

  if (isLoading || !transaction) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  const getStatusColor = (status: Enums.TransactionStatus) => {
    switch (status) {
      case Enums.TransactionStatus.SUCCESS:
        return styles.statusSuccess
      case Enums.TransactionStatus.PENDING:
        return styles.statusPending
      case Enums.TransactionStatus.FAILED:
        return styles.statusFailed
      default:
        return styles.statusOther
    }
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('transaction.detailsTitle') ?? 'Transaction Details'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('transaction.summary') ?? 'Transaction Summary'}</Text>

          <Text style={styles.detailText}>
            💰 {t('transaction.amount') ?? 'Amount'}: <Text style={styles.amountText}>{transaction.amount.toLocaleString('vi-VN')} VND</Text>
          </Text>

          {transaction.provider && (
            <Text style={styles.detailTextMt}>
              🔗 {t('transaction.provider') ?? 'Provider'}: <Text style={styles.providerText}>{transaction.provider}</Text>
            </Text>
          )}

          <Text style={styles.detailTextMt}>
            📌 {t('transaction.status') ?? 'Status'}:{" "}
            <Text
              style={[
                styles.statusBase,
                getStatusColor(transaction.status),
              ]}
            >
              {t(`transaction.status.${transaction.status}`)}
            </Text>
          </Text>

          <Text style={styles.detailTextMt}>
            🕒 {t('transaction.createdAt') ?? 'Created At'}: <Text style={styles.dateText}>{new Date(transaction.createdAt).toLocaleString('vi-VN')}</Text>
          </Text>

          <Text style={styles.detailTextMt}>
            🔄 {t('transaction.updatedAt') ?? 'Updated At'}: <Text style={styles.dateText}>{new Date(transaction.updatedAt).toLocaleString('vi-VN')}</Text>
          </Text>

          {transaction.description && (
            <Text style={styles.detailTextMt}>
              📄 {t('transaction.description') ?? 'Description'}: <Text style={styles.descriptionText}>{transaction.description}</Text>
            </Text>
          )}

        </View>
      </ScrollView>
    </ScreenLayout>
  )
}

export default TransactionDetailsScreen

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  placeholder: {
    width: 24
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16
  },
  detailText: {
    fontSize: 16,
    color: '#374151',
  },
  detailTextMt: {
    fontSize: 16,
    color: '#374151',
    marginTop: 12
  },
  amountText: {
    fontWeight: '700',
    color: '#1F2937'
  },
  providerText: {
    fontWeight: '500',
    color: '#374151'
  },
  descriptionText: {
    fontWeight: '400',
    color: '#374151',
    marginTop: 4,
  },
  statusBase: {
    fontWeight: '700',
    fontSize: 16,
  },
  statusSuccess: {
    color: '#10B981', // text-green-600
  },
  statusPending: {
    color: '#F59E0B', // text-yellow-500
  },
  statusFailed: {
    color: '#EF4444', // text-red-500
  },
  statusOther: {
    color: '#6B7280', // text-gray-500
  },
  dateText: {
    fontWeight: '500',
    color: '#374151',
  }
});