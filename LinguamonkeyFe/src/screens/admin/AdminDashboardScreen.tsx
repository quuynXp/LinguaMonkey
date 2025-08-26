// AdminDashboardScreen.tsx
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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Toast from "../../components/Toast";
import { getStatisticsOverview } from "../../services/statisticsApi";
import { LineChart, BarChart } from "react-native-chart-kit";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");
type Period = "week" | "month" | "year" | "custom";

/* --- date helpers (unchanged) --- */
const startOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};
const endOfWeek = (d: Date) => {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 7);
  e.setHours(0, 0, 0, 0);
  return e;
};
const startOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
const startOfYear = (d: Date) =>
  new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
const endOfYear = (d: Date) =>
  new Date(d.getFullYear() + 1, 0, 1, 0, 0, 0, 0);

const formatISODate = (d: Date) => d.toISOString().split("T")[0];

/* --- component --- */
const AdminDashboardScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [anchorDate, setAnchorDate] = useState<Date | undefined>(undefined);
  const [customDate, setCustomDate] = useState<{ start?: Date; end?: Date }>(
    {}
  );
  const [showDatePicker, setShowDatePicker] = useState<
    "anchor" | "start" | "end" | null
  >(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  // compute concrete range
  const computedRange = useMemo(() => {
    if (selectedPeriod === "custom") {
      if (
        customDate.start &&
        customDate.end &&
        customDate.start <= customDate.end
      ) {
        return { start: customDate.start, end: customDate.end };
      }
      return null;
    }
    if (!anchorDate) return null;
    if (selectedPeriod === "week")
      return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
    if (selectedPeriod === "month")
      return { start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) };
    if (selectedPeriod === "year")
      return { start: startOfYear(anchorDate), end: endOfYear(anchorDate) };
    return null;
  }, [selectedPeriod, anchorDate, customDate]);

  // derive aggregate to ask backend for
  const computeAggregate = () => {
    if (selectedPeriod === "week") return "day";
    if (selectedPeriod === "month") return "week";
    if (selectedPeriod === "year") return "month";
    return "day"; // custom or fallback
  };

  // query key
  const queryKey = computedRange
    ? [
        "statisticsOverview",
        "range",
        formatISODate(computedRange.start),
        formatISODate(new Date(computedRange.end.getTime() - 1)),
        computeAggregate(),
      ]
    : ["statisticsOverview", "period", selectedPeriod];

  // fetch overview (send aggregate + dates when possible)
  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => {
      const aggregate = computeAggregate();
      if (computedRange) {
        return getStatisticsOverview({
          startDate: computedRange.start,
          endDate: new Date(computedRange.end.getTime() - 1), // inclusive end
          aggregate,
        });
      }
      // fallback: when no concrete dates, ask backend using period param
      return getStatisticsOverview({
        period:
          selectedPeriod === "custom" ? "month" : (selectedPeriod as any),
        aggregate,
      });
    },
    staleTime: 1000 * 60,
    keepPreviousData: true,
  });

  // auto-open pickers as before
  useEffect(() => {
    if (selectedPeriod !== "custom" && !anchorDate) {
      const tId = setTimeout(() => setShowDatePicker("anchor"), 120);
      return () => clearTimeout(tId);
    }
    if (selectedPeriod === "custom" && !customDate.start) {
      const tId = setTimeout(() => setShowDatePicker("start"), 120);
      return () => clearTimeout(tId);
    }
  }, [selectedPeriod]);

  // refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("errors.unknown"),
      });
    } finally {
      setRefreshing(false);
    }
  };

  // datepicker handler
  const onDateChange = (event: any, date?: Date | undefined) => {
    const dismissed =
      (event &&
        (event.type === "dismissed" ||
          event.action === "dismissedAction" ||
          event.nativeEvent?.action === "dismissedAction")) ||
      !date;
    if (dismissed) {
      setShowDatePicker(null);
      return;
    }
    if (showDatePicker === "anchor") {
      setAnchorDate(date);
    } else if (showDatePicker === "start") {
      setCustomDate((prev) => ({ ...prev, start: date }));
      setTimeout(() => setShowDatePicker("end"), 100);
      return;
    } else if (showDatePicker === "end") {
      if (customDate.start && date < customDate.start) {
        Alert.alert("Invalid range", "End date must be >= start date.");
        setShowDatePicker(null);
        return;
      }
      setCustomDate((prev) => ({ ...prev, end: date }));
    }
    setShowDatePicker(null);
  };

  // CHART DATA: prefer backend.timeSeries; fallback to old behavior
  const chartData = useMemo(() => {
    if (!data) return null;

    // If backend returns timeSeries array => use it (preferred)
    if (Array.isArray(data.raw?.timeSeries) && data.raw.timeSeries.length > 0) {
      const labels = data.raw.timeSeries.map((p: any) => p.label);
      const values = data.raw.timeSeries.map((p: any) =>
        Number(p.revenue ?? 0)
      );
      const transactions = data.raw.timeSeries.map((p: any) =>
        Number(p.transactions ?? 0)
      );
      return { labels, values, transactions };
    }

    // fallback: construct using totals but with proper buckets per period
    if (computedRange) {
      const s = new Date(computedRange.start);
      const e = new Date(computedRange.end);
      if (selectedPeriod === "week") {
        const labels: string[] = [];
        const values: number[] = [];
        const cur = new Date(s);
        while (cur < e) {
          labels.push(`${cur.getDate()}/${cur.getMonth() + 1}`);
          values.push(Math.round((data.revenue ?? 0) / 7));
          cur.setDate(cur.getDate() + 1);
        }
        return { labels, values, transactions: labels.map(() => 0) };
      }
      if (selectedPeriod === "month") {
        const labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
        const values = Array(4).fill(Math.round((data.revenue ?? 0) / 4));
        return { labels, values, transactions: Array(4).fill(0) };
      }
      if (selectedPeriod === "year") {
        const labels = [
          "Jan","Feb","Mar","Apr","May","Jun",
          "Jul","Aug","Sep","Oct","Nov","Dec"
        ];
        const values = Array(12).fill(Math.round((data.revenue ?? 0) / 12));
        return { labels, values, transactions: Array(12).fill(0) };
      }
      if (selectedPeriod === "custom") {
        const labels: string[] = [];
        const values: number[] = [];
        const cur = new Date(s);
        let count = 0;
        while (cur <= e && count < 60) {
          labels.push(`${cur.getDate()}/${cur.getMonth() + 1}`);
          values.push(Math.round((data.revenue ?? 0) / Math.max(1, (Math.ceil((e.getTime()-s.getTime())/(24*3600*1000))+1))));
          cur.setDate(cur.getDate() + 1);
          count++;
        }
        return { labels, values, transactions: labels.map(() => 0) };
      }
    }

    return { labels: ["n/a"], values: [Number(data.revenue ?? 0)], transactions: [0] };
  }, [data, computedRange, selectedPeriod]);

  // handle drill-down click on chart points (month -> week, year -> month)
  const onChartPointPress = (index: number) => {
    if (!computedRange || !chartData) return;
    // month -> go to week
    if (selectedPeriod === "month") {
      // compute chunk size (days per "week" bucket)
      const s = new Date(computedRange.start);
      const e = new Date(computedRange.end);
      const totalDays = Math.ceil((e.getTime() - s.getTime()) / (24 * 3600 * 1000));
      const chunk = Math.max(1, Math.ceil(totalDays / 4));
      const weekStart = new Date(s);
      weekStart.setDate(s.getDate() + index * chunk);
      setSelectedPeriod("week");
      setAnchorDate(weekStart);
      return;
    }
    // year -> go to month
    if (selectedPeriod === "year") {
      // compute month index -> set anchor to that month
      const yearStart = new Date(computedRange.start);
      const monthIndex = index; // 0..11
      const monthAnchor = new Date(yearStart.getFullYear(), monthIndex, 1);
      setSelectedPeriod("month");
      setAnchorDate(monthAnchor);
      return;
    }
  };

  // stats cards (unchanged)
  const statsCards = [
    {
      id: "users",
      title: t("admin.dashboard.totalUsers"),
      value: data?.users ?? 0,
      icon: "people",
      color: "#3B82F6",
      screen: "AdminUserManagementScreen",
    },
    {
      id: "courses",
      title: t("admin.dashboard.totalCourses"),
      value: data?.courses ?? 0,
      icon: "school",
      color: "#10B981",
      screen: "AdminCourseManagementScreen",
    },
    {
      id: "lessons",
      title: t("admin.dashboard.totalLessons"),
      value: data?.lessons ?? 0,
      icon: "book",
      color: "#F59E0B",
      screen: "AdminLessonManagementScreen",
    },
    {
      id: "revenue",
      title: t("admin.dashboard.totalRevenue"),
      value:
        data?.revenue != null
          ? `$${Number(data.revenue).toLocaleString()}`
          : "$0",
      icon: "attach-money",
      color: "#EF4444",
      screen: "AdminRevenueAnalyticsScreen",
    },
    {
      id: "transactions",
      title: t("admin.dashboard.totalTransactions"),
      value: data?.transactions ?? 0,
      icon: "payment",
      color: "#8B5CF6",
      screen: "AdminTransactionScreen",
    },
  ];

  const renderStatsCard = (stat: any) => (
    <TouchableOpacity
      key={stat.id}
      style={[styles.statsCard, { borderLeftColor: stat.color }]}
      onPress={() => navigation.navigate(stat.screen)}
    >
      <View style={styles.statsCardHeader}>
        <View
          style={[styles.statsIcon, { backgroundColor: `${stat.color}20` }]}
        >
          <Icon name={stat.icon} size={24} color={stat.color} />
        </View>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </View>
      <Text style={styles.statsValue}>
        {typeof stat.value === "number"
          ? stat.value.toLocaleString()
          : stat.value}
      </Text>
      <Text style={styles.statsTitle}>{stat.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* HEADER */}
        <View style={styles.headerArea}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity
            style={styles.periodSelector}
            onPress={() => setShowPeriodModal(true)}
          >
            <Icon name="event" size={20} color="#4F46E5" />
            <Text style={styles.periodSelectorText}>
              {selectedPeriod === "custom"
                ? "Custom range"
                : selectedPeriod.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Period Modal */}
        <Modal
          visible={showPeriodModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPeriodModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              {(["week", "month", "year", "custom"] as Period[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={styles.modalOption}
                  onPress={() => {
                    setSelectedPeriod(p);
                    setShowPeriodModal(false);
                    if (p === "custom") {
                      if (!customDate.start) setShowDatePicker("start");
                    } else {
                      if (!anchorDate) setShowDatePicker("anchor");
                    }
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {p === "custom"
                      ? "Custom range"
                      : p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* DatePicker */}
        {showDatePicker && (
          <DateTimePicker
            value={
              showDatePicker === "anchor"
                ? anchorDate || new Date()
                : showDatePicker === "start"
                ? customDate.start || new Date()
                : customDate.end || new Date()
            }
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        {/* CHARTS */}
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>Revenue</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : chartData ? (
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{ data: chartData.values }],
              }}
              width={width - 48}
              height={220}
              yAxisLabel="$"
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
                labelColor: (opacity = 1) => `rgba(107,114,128,${opacity})`,
                style: { borderRadius: 12 },
              }}
              style={{ borderRadius: 12 }}
              // drill-down handler: only LineChart supports onDataPointClick
              onDataPointClick={(dp: any) => {
                onChartPointPress(dp.index);
              }}
            />
          ) : (
            <Text style={{ color: "#6B7280" }}>No data for chart</Text>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
            Transactions
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <BarChart
              data={{
                labels: chartData?.labels ?? ["n/a"],
                datasets: [{ data: chartData?.transactions ?? chartData?.values ?? [0] }],
              }}
              width={width - 48}
              height={160}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(139,92,246,${opacity})`,
                labelColor: (opacity = 1) => `rgba(107,114,128,${opacity})`,
                style: { borderRadius: 12 },
              }}
              style={{ borderRadius: 12 }}
            />
          )}
        </View>

        {/* STATS */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{t("admin.dashboard.overview")}</Text>
          <View style={styles.statsGrid}>{statsCards.map(renderStatsCard)}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* styles (unchanged except small adjustments) */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flex: 1 },
  headerArea: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  periodSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  periodSelectorText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "70%",
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#1F2937",
    textAlign: "center",
  },
  chartsContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  statsSection: { padding: 24 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 2,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  statsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statsValue: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  statsTitle: { fontSize: 13, color: "#6B7280" },
});

export default AdminDashboardScreen;
