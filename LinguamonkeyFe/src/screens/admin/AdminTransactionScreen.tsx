import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getTransactionStatistics } from "../../services/statisticsApi";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const { width } = Dimensions.get("window");

const AdminTransactionScreen = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["transaction-stats", period],
    queryFn: () => getTransactionStatistics({ period, aggregate: period }),
  });

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.controls}>
          {(["week", "month", "year"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.pill, period === p && styles.pillActive]}
            >
              <Text style={[styles.pillText, period === p && styles.pillTextActive]}>
                {t(`common.period.${p}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Icon name="receipt" size={24} color="#6366F1" />
            </View>
            <Text style={styles.cardValue}>{stats?.totalTransactions || 0}</Text>
            <Text style={styles.cardLabel}>{t("admin.transactions.total")}</Text>
          </View>
          <View style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: '#DEF7EC' }]}>
              <Icon name="check-circle" size={24} color="#059669" />
            </View>
            <Text style={styles.cardValue}>{stats?.successfulTransactions || 0}</Text>
            <Text style={styles.cardLabel}>{t("admin.transactions.success")}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("admin.transactions.breakdown")}</Text>
          {/* If stats contains breakdown array, map here. Mocking display for robustness if empty */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>PayPal</Text>
            <Text style={styles.rowValue}>{stats?.provider?.paypal || 0} txns</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Stripe</Text>
            <Text style={styles.rowValue}>{stats?.provider?.stripe || 0} txns</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  controls: { flexDirection: "row", padding: 16, gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: "#E2E8F0" },
  pillActive: { backgroundColor: "#4F46E5" },
  pillText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  pillTextActive: { color: "#fff" },
  grid: { flexDirection: "row", padding: 16, paddingTop: 0, gap: 12 },
  card: { flex: 1, backgroundColor: "#fff", padding: 16, borderRadius: 12, alignItems: 'flex-start', shadowColor: "#000", shadowOpacity: 0.05, elevation: 1 },
  iconBox: { padding: 8, borderRadius: 8, backgroundColor: "#E0E7FF", marginBottom: 8 },
  cardValue: { fontSize: 22, fontWeight: "700", color: "#1F2937" },
  cardLabel: { fontSize: 12, color: "#6B7280" },
  section: { backgroundColor: "#fff", margin: 16, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowLabel: { fontSize: 14, color: "#4B5563" },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#1F2937" }
});

export default AdminTransactionScreen;