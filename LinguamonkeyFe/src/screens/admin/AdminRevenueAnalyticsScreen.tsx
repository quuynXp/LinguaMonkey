import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getDepositRevenueStatistics } from "../../services/statisticsApi";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { LineChart } from "react-native-chart-kit";
import { createScaledSheet } from "../../utils/scaledStyles";

const { width } = Dimensions.get("window");

type Period = "day" | "week" | "month" | "year";

const AdminRevenueAnalyticsScreen = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("month");

  const { data: depositStats, isLoading, refetch } = useQuery({
    queryKey: ["stats-deposit-revenue", period],
    queryFn: () => getDepositRevenueStatistics({ period, aggregate: period }),
  });

  const onRefresh = () => {
    refetch();
  };

  const chartLabels = depositStats?.timeSeries.map(item => item.label) || [];
  const chartDataPoints = depositStats?.timeSeries.map(item => item.value || 0) || [];
  const totalRevenue = depositStats?.totalRevenue || 0;

  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ["N/A"],
    datasets: [{
      data: chartDataPoints.length > 0 ? chartDataPoints : [0]
    }]
  };

  const ChartPeriodSelector = () => (
    <View style={styles.filterContainer}>
      {(["day", "week", "month", "year"] as Period[]).map((p) => (
        <TouchableOpacity
          key={p}
          onPress={() => setPeriod(p)}
          style={[
            styles.filterBtn,
            period === p && styles.filterBtnActive,
          ]}
        >
          <Text
            style={[
              styles.filterText,
              period === p && styles.filterTextActive,
            ]}
          >
            {t(`common.period.${p}`)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("admin.revenue.depositRevenue") || "Deposit Revenue"}</Text>
          <ChartPeriodSelector />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>{t("common.loading")}</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t("admin.revenue.totalDepositRevenue") || "Total Deposit Revenue"}</Text>
              <Text style={styles.summaryValue}>
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Text>
              <Text style={styles.summarySub}>{t(`common.period.${period}`)}</Text>
            </View>

            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>{t("admin.revenue.depositTrend") || "Deposit Revenue Trend"}</Text>
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
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    padding: 2,
  },
  filterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  filterTextActive: {
    color: "#1F2937",
  },
  summaryCard: { margin: 16, padding: 20, backgroundColor: "#10B981", borderRadius: 16, alignItems: "center" },
  summaryLabel: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  summaryValue: { color: "#fff", fontSize: 32, fontWeight: "700" },
  summarySub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 },
  chartContainer: { backgroundColor: "#fff", margin: 16, marginTop: 0, padding: 16, borderRadius: 12 },
  chartTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 16 },
  chart: { borderRadius: 12 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: "#64748B"
  }
});

export default AdminRevenueAnalyticsScreen;