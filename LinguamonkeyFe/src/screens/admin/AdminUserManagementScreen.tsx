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
import { getUserCounts, getUserGrowth } from "../../services/statisticsApi";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { BarChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

const AdminUserManagementScreen = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"day" | "month" | "year">("month");

  // Fetch Total Counts
  const { data: counts, isLoading: loadCounts, refetch: refetchCounts } = useQuery({
    queryKey: ["user-counts", period],
    queryFn: () => getUserCounts({ period }),
  });

  // Fetch Growth Data
  const { data: growth, isLoading: loadGrowth, refetch: refetchGrowth } = useQuery({
    queryKey: ["user-growth", period],
    queryFn: () => getUserGrowth({ period }),
  });

  const isLoading = loadCounts || loadGrowth;

  const onRefresh = () => {
    refetchCounts();
    refetchGrowth();
  };

  // Safe chart data construction
  const chartData = {
    labels: growth?.labels || ["Jan", "Feb", "Mar", "Apr"],
    datasets: [{ data: growth?.data || [10, 20, 15, 30] }]
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      >
        <View style={styles.headerArea}>
          <Text style={styles.subtitle}>{t("admin.users.overview")}</Text>
          <View style={styles.periodRow}>
            {(["day", "month", "year"] as const).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.pBtn, period === p && styles.pBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.pText, period === p && styles.pTextActive]}>
                  {t(`common.period.${p}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name="group" size={28} color="#4F46E5" />
            <Text style={styles.statValue}>{counts?.totalUsers || 0}</Text>
            <Text style={styles.statLabel}>{t("admin.users.total")}</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="person-add" size={28} color="#10B981" />
            <Text style={styles.statValue}>{counts?.newUsers || 0}</Text>
            <Text style={styles.statLabel}>{t("admin.users.new")}</Text>
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>{t("admin.users.growthChart")}</Text>
          {isLoading ? (
            <ActivityIndicator color="#4F46E5" />
          ) : (
            <BarChart
              data={chartData}
              width={width - 32}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                barPercentage: 0.7,
              }}
              style={styles.chart}
            />
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  headerArea: { padding: 16, backgroundColor: "#fff", flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  periodRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 2 },
  pBtn: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 6 },
  pBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 1 },
  pText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  pTextActive: { color: '#4F46E5' },
  statsRow: { flexDirection: "row", gap: 12, padding: 16 },
  statCard: { flex: 1, backgroundColor: "#fff", padding: 16, borderRadius: 12, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, elevation: 1 },
  statValue: { fontSize: 24, fontWeight: "700", color: "#1F2937", marginVertical: 4 },
  statLabel: { fontSize: 14, color: "#6B7280" },
  chartSection: { margin: 16, marginTop: 0, padding: 16, backgroundColor: "#fff", borderRadius: 12 },
  chartTitle: { fontSize: 16, fontWeight: "600", marginBottom: 16, color: "#1F2937" },
  chart: { borderRadius: 8 }
});

export default AdminUserManagementScreen;