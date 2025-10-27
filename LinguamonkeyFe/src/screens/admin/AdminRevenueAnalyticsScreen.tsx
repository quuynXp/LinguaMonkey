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
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Toast from "../../components/Toast";
import { getStatisticsOverview, getTransactions } from "../../services/statisticsApi";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import DateTimePicker from "@react-native-community/datetimepicker";
import { resetToAuth } from "../../utils/navigationRef";

const { width } = Dimensions.get("window");
type Period = "week" | "month" | "year" | "custom";

/* --- date helpers (same as Dashboard) --- */
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

const AdminRevenueAnalyticsScreen = () => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [anchorDate, setAnchorDate] = useState<Date | undefined>(undefined);
  const [customDate, setCustomDate] = useState<{ start?: Date; end?: Date }>({});
  const [showDatePicker, setShowDatePicker] = useState<"anchor" | "start" | "end" | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  // --- HELPER FUNCTION FOR I18N ---
  const getPeriodTranslation = (p: Period) => {
    switch (p) {
      case "week": return t("admin.analytics.periods.week");
      case "month": return t("admin.analytics.periods.month");
      case "year": return t("admin.analytics.periods.year");
      case "custom": return t("admin.analytics.periods.custom");
      default: return p;
    }
  };
  // --- END HELPER ---

  const computedRange = useMemo(() => {
    if (selectedPeriod === "custom") {
      if (customDate.start && customDate.end && customDate.start <= customDate.end) {
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

  const computeAggregate = () => {
    if (selectedPeriod === "week") return "day";
    if (selectedPeriod === "month") return "week";
    if (selectedPeriod === "year") return "month";
    return "day";
  };

  const queryKey = computedRange
    ? [
      "revenueOverview",
      "range",
      formatISODate(computedRange.start),
      formatISODate(new Date(computedRange.end.getTime() - 1)),
      computeAggregate(),
    ]
    : ["revenueOverview", "period", selectedPeriod];

  const { data: overviewData, isLoading: overviewLoading, refetch: overviewRefetch } = useQuery({
    queryKey,
    queryFn: () => {
      const aggregate = computeAggregate();
      if (computedRange) {
        return getStatisticsOverview({
          startDate: computedRange.start,
          endDate: new Date(computedRange.end.getTime() - 1),
          aggregate,
        });
      }
      return getStatisticsOverview({
        period: selectedPeriod === "custom" ? "month" : (selectedPeriod as any),
        aggregate,
      });
    },
    staleTime: 1000 * 60,
    keepPreviousData: true,
  });

  const { data: transactionsData, isLoading: transactionsLoading, refetch: transactionsRefetch } = useQuery({
    queryKey: ["transactions", ...queryKey.slice(1)],
    queryFn: () => {
      if (computedRange) {
        return getTransactions({
          startDate: formatISODate(computedRange.start),
          endDate: formatISODate(new Date(computedRange.end.getTime() - 1)),
          aggregate: computeAggregate() as any,
        });
      }
      return getTransactions({ aggregate: computeAggregate() as any });
    },
    staleTime: 1000 * 60,
    keepPreviousData: true,
  });

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([overviewRefetch(), transactionsRefetch()]);
    } catch (err) {
      Toast.show({ type: "error", text1: t("common.error"), text2: t("errors.unknown") });
    } finally {
      setRefreshing(false);
    }
  };

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
    if (showDatePicker === "anchor") setAnchorDate(date);
    else if (showDatePicker === "start") {
      setCustomDate((prev) => ({ ...prev, start: date }));
      setTimeout(() => setShowDatePicker("end"), 100);
      return;
    } else if (showDatePicker === "end") {
      if (customDate.start && date < customDate.start) {
        Alert.alert(
          t("admin.analytics.errors.invalidRangeTitle"),
          t("admin.analytics.errors.invalidRangeMessage")
        );
        setShowDatePicker(null);
        return;
      }
      setCustomDate((prev) => ({ ...prev, end: date }));
    }
    setShowDatePicker(null);
  };

  // Prepare chart data (use overviewData.raw.timeSeries if present)
  const revenueChart = useMemo(() => {
    const fallbackLabel = t("admin.analytics.charts.notAvailable");
    if (!overviewData) return { labels: [fallbackLabel], values: [0] };
    if (Array.isArray(overviewData.raw?.timeSeries) && overviewData.raw.timeSeries.length) {
      return {
        labels: overviewData.raw.timeSeries.map((p: any) => p.label),
        values: overviewData.raw.timeSeries.map((p: any) => Number(p.revenue ?? 0)),
      };
    }
    return { labels: [fallbackLabel], values: [Number(overviewData.revenue ?? 0)] };
  }, [overviewData, t]);

  const transactionsChart = useMemo(() => {
    const fallbackLabel = t("admin.analytics.charts.notAvailable");
    if (!transactionsData) return { labels: [fallbackLabel], values: [0] };
    if (Array.isArray(transactionsData.timeSeries) && transactionsData.timeSeries.length) {
      return {
        labels: transactionsData.timeSeries.map((p: any) => p.label),
        values: transactionsData.timeSeries.map((p: any) => Number(p.transactions ?? 0)),
      };
    }
    return { labels: [fallbackLabel], values: [0] };
  }, [transactionsData, t]);

  const breakdownPie = (transactionsData?.breakdown || []).map((b: any, idx: number) => ({
    name: b.label || b.type || t("admin.analytics.charts.itemLabel", { index: idx + 1 }),
    population: Number(b.amount ?? 0),
    color: b.color || ["#F97316", "#60A5FA", "#34D399", "#F87171"][idx % 4],
    legendFontColor: "#6B7280",
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* HEADER */}
        <View style={styles.headerArea}>
          <Text style={styles.headerTitle}>{t("admin.analytics.title")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity style={styles.periodSelector} onPress={() => setShowPeriodModal(true)}>
              <Icon name="event" size={20} color="#4F46E5" />
              <Text style={styles.periodSelectorText}>{getPeriodTranslation(selectedPeriod)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={() => {
              Alert.alert(
                t("admin.analytics.logout.title"),
                t("admin.analytics.logout.message"),
                [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("common.logout"), style: "destructive", onPress: () => resetToAuth() },
                ]);
            }}>
              <Icon name="logout" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Period modal */}
        <Modal visible={showPeriodModal} transparent animationType="fade" onRequestClose={() => setShowPeriodModal(false)}>
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
                  <Text style={styles.modalOptionText}>{getPeriodTranslation(p)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Date picker */}
        {showDatePicker && (
          <DateTimePicker
            value={showDatePicker === "anchor" ? anchorDate || new Date() : showDatePicker === "start" ? customDate.start || new Date() : customDate.end || new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        {/* Charts */}
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>{t("admin.analytics.charts.revenue")}</Text>
          {overviewLoading ? <ActivityIndicator size="small" color="#3B82F6" /> : (
            <LineChart
              data={{ labels: revenueChart.labels, datasets: [{ data: revenueChart.values }] }}
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
            />
          )}

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>{t("admin.analytics.charts.transactions")}</Text>
          {transactionsLoading ? <ActivityIndicator size="small" color="#3B82F6" /> : (
            <BarChart
              data={{ labels: transactionsChart.labels, datasets: [{ data: transactionsChart.values }] }}
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

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>{t("admin.analytics.charts.breakdown")}</Text>
          {!transactionsLoading && breakdownPie.length > 0 ? (
            // PieChart from react-native-chart-kit expects differently; using BarChart fallback if Pie not working in your set up
            <BarChart
              data={{ labels: breakdownPie.map((b) => b.name), datasets: [{ data: breakdownPie.map((b) => b.population) }] }}
              width={width - 48}
              height={140}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(99,102,241,${opacity})`,
                labelColor: (opacity = 1) => `rgba(107,114,128,${opacity})`,
              }}
              style={{ borderRadius: 12 }}
            />
          ) : (
            <Text style={{ color: "#6B7280" }}>{t("admin.analytics.charts.noBreakdown")}</Text>
          )}
        </View>

        {/* Key stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{t("admin.analytics.overview.title")}</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statsCard, { borderLeftColor: "#3B82F6" }]}>
              <View style={styles.statsCardHeader}>
                <View style={[styles.statsIcon, { backgroundColor: "#3B82F620" }]}>
                  <Icon name="people" size={24} color="#3B82F6" />
                </View>
              </View>
              <Text style={styles.statsValue}>{overviewData?.users ?? 0}</Text>
              <Text style={styles.statsTitle}>{t("admin.analytics.overview.users")}</Text>
            </View>

            <View style={[styles.statsCard, { borderLeftColor: "#EF4444" }]}>
              <View style={styles.statsCardHeader}>
                <View style={[styles.statsIcon, { backgroundColor: "#EF444420" }]}>
                  <Icon name="attach-money" size={24} color="#EF4444" />
                </View>
              </View>
              <Text style={styles.statsValue}>{overviewData?.revenue != null ? `$${Number(overviewData.revenue).toLocaleString()}` : "$0"}</Text>
              <Text style={styles.statsTitle}>{t("admin.analytics.overview.revenue")}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
    marginRight: 8,
  },
  periodSelectorText: { marginLeft: 6, fontSize: 14, fontWeight: "600", color: "#4F46E5" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#fff", borderRadius: 12, padding: 20, width: "70%" },
  modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalOptionText: { fontSize: 16, color: "#1F2937", textAlign: "center" },
  chartsContainer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  statsSection: { padding: 24 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statsCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, width: (width - 60) / 2, borderLeftWidth: 4, marginBottom: 12 },
  statsCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statsIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statsValue: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  statsTitle: { fontSize: 13, color: "#6B7280" },
  logoutButton: { marginLeft: 12, padding: 8, backgroundColor: "#FEE2E2", borderRadius: 8 },
});

export default AdminRevenueAnalyticsScreen;