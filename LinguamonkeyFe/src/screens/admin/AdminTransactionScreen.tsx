import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTransactionsApi } from "../../hooks/useTransaction";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import Icon from "react-native-vector-icons/MaterialIcons";

const AdminTransactionScreen = () => {
  const { t } = useTranslation();
  const { useTransactions } = useTransactionsApi();
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch, isFetching } = useTransactions({ page, size: 20 });

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: item.status === 'COMPLETED' ? '#DEF7EC' : '#FEF2F2' }]}>
        <Icon
          name={item.status === 'COMPLETED' ? "check" : "access-time"}
          size={20}
          color={item.status === 'COMPLETED' ? "#059669" : "#DC2626"}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.type}>{item.type}</Text>
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.amountBox}>
        <Text style={[styles.amount, { color: item.amount > 0 ? "#059669" : "#DC2626" }]}>
          {item.amount > 0 ? "+" : ""}{item.amount}
        </Text>
        <Text style={styles.currency}>{item.currency || 'USD'}</Text>
      </View>
    </View>
  );

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <Text style={styles.title}>{t("admin.transactions.history")}</Text>

        {isLoading && page === 0 ? (
          <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
        ) : (
          <FlatList
            data={data?.data}
            keyExtractor={(item) => item.transactionId}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
            onEndReached={() => {
              if (data?.pagination?.hasNext) setPage(p => p + 1);
            }}
          />
        )}
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  title: { fontSize: 20, fontWeight: "700", margin: 20, color: "#1E293B" },
  loader: { marginTop: 20 },
  list: { paddingHorizontal: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    elevation: 1,
  },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  type: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  date: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: "700" },
  currency: { fontSize: 11, color: "#9CA3AF" }
});

export default AdminTransactionScreen;