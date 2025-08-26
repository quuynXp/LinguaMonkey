import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Toast from "../../components/Toast";
import { getStatisticsOverview, getTransactions } from "../../services/statisticsApi";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit"; // Added PieChart if needed
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

type Period = "week" | "month" | "year" | "custom";

// Reuse helpers from AdminDashboardScreen (startOfWeek, etc.) - assume imported or duplicated

const AdminRevenueAnalyticsScreen = () => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [anchorDate, setAnchorDate] = useState<Date | undefined>(undefined);
  const [customDate, setCustomDate] = useState<{ start?: Date; end?: Date }>({});
  const [showDatePicker, setShowDatePicker] = useState<"anchor" | "start" | "end" | null>(null);

  const computedRange = useMemo(() => {
    // Same as AdminDashboardScreen
    // ...
  }, [selectedPeriod, anchorDate, customDate]);

  const queryKey = computedRange ? /* ... */ : /* ... */;

  const { data: overviewData, isLoading: overviewLoading, refetch: overviewRefetch } = useQuery({
    queryKey: ["revenueOverview", ...queryKey.slice(1)],
    queryFn: () => getStatisticsOverview(computedRange ? { startDate: computedRange.start, endDate: computedRange.end } : { period: selectedPeriod }),
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ["transactions", ...queryKey.slice(1)],
    queryFn: () => getTransactions(computedRange ? { startDate: formatISODate(computedRange.start), endDate: formatISODate(computedRange.end) } : {}),
  });

  // Auto-open pickers - same as AdminDashboard

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([overviewRefetch()]);
    setRefreshing(false);
  };

  const onDateChange = /* same as AdminDashboard */;

  // Chart data
  const revenueChartData = overviewData?.raw?.revenueChart || { labels: [], values: [] };
  const transactionChartData = transactionsData?.transactionVolume || { labels: [], values: [] };
  const breakdownPieData = transactionsData?.breakdown?.map((item: any) => ({ name: item.type, population: item.amount, color: item.color, legendFontColor: "#7F7F7F" })) || [];

  // Stats cards
  const statsCards = [
    { title: "Total Revenue", value: `$${overviewData?.revenue || 0}`, icon: "attach-money", color: "#EF4444" },
    { title: "Avg Transaction", value: `$${transactionsData?.avgAmount || 0}`, icon: "trending-up", color: "#10B981" },
    { title: "Success Rate", value: `${transactionsData?.successRate || 0}%`, icon: "check-circle", color: "#3B82F6" },
    { title: "Refunds", value: transactionsData?.refunds || 0, icon: "refresh", color: "#F59E0B" },
  ];

  const renderStatsCard = /* similar to AdminDashboard */;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View style={styles.headerArea}>
          <Text style={styles.headerTitle}>Revenue Analytics</Text>
          {/* Period selection and date pickers - same as AdminDashboard */}
        </View>

        {/* Charts */}
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          {overviewLoading ? <ActivityIndicator /> : (
            <LineChart data={{ labels: revenueChartData.labels, datasets: [{ data: revenueChartData.values }] }} /* config same */ />
          )}
          <Text style={styles.sectionTitle}>Transaction Volume</Text>
          {transactionsLoading ? <ActivityIndicator /> : (
            <BarChart data={{ labels: transactionChartData.labels, datasets: [{ data: transactionChartData.values }] }} /* config same */ />
          )}
          <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
          {transactionsLoading ? <ActivityIndicator /> : (
            <PieChart data={breakdownPieData} width={width - 48} height={220} chartConfig={{ /* similar */ }} accessor="population" backgroundColor="transparent" paddingLeft="15" />
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.statsGrid}>{statsCards.map(renderStatsCard)}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles similar to AdminDashboard, adjusted for revenue theme (e.g., more red accents)

export default AdminRevenueAnalyticsScreen;