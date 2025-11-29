import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator
} from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getStatisticsOverview, getTransactionStatistics } from "../../services/statisticsApi";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { LineChart } from "react-native-chart-kit";
import { createScaledSheet } from "../../utils/scaledStyles";

const { width } = Dimensions.get("window");

const AdminRevenueAnalyticsScreen = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const { data: overview, isLoading: loadOverview, refetch: refetchOverview } = useQuery({
    queryKey: ["stats-overview", period],
    queryFn: () => getStatisticsOverview({ period }),
  });

  const { data: txStats, isLoading: loadTx, refetch: refetchTx } = useQuery({
    queryKey: ["stats-transactions", period],
    queryFn: () => getTransactionStatistics({ period, aggregate: period }),
  });

  const onRefresh = () => {
    refetchOverview();
    refetchTx();
  };

  const chartData = {
    labels: ["W1", "W2", "W3", "W4"],
    datasets: [{
      data: [
        overview?.revenue ? overview.revenue * 0.2 : 0,
        overview?.revenue ? overview.revenue * 0.3 : 0,
        overview?.revenue ? overview.revenue * 0.1 : 0,
        overview?.revenue ? overview.revenue * 0.4 : 0
      ]
    }]
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={loadOverview || loadTx} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t("admin.revenue.totalRevenue")}</Text>
          <Text style={styles.summaryValue}>
            ${overview?.revenue?.toLocaleString() ?? "0"}
          </Text>
          <Text style={styles.summarySub}>{t(`common.period.${period}`)}</Text>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{t("admin.revenue.trend")}</Text>
          <LineChart
            data={chartData}
            width={width - 32}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#10B981" }
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  summaryCard: { margin: 16, padding: 20, backgroundColor: "#10B981", borderRadius: 16, alignItems: "center" },
  summaryLabel: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  summaryValue: { color: "#fff", fontSize: 32, fontWeight: "700" },
  summarySub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 },
  chartContainer: { backgroundColor: "#fff", margin: 16, marginTop: 0, padding: 16, borderRadius: 12 },
  chartTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 16 },
  chart: { borderRadius: 12 },
});

export default AdminRevenueAnalyticsScreen;