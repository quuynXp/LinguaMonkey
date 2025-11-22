import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Toast from "../../components/Toast";
import { getStatisticsOverview, getActivities } from "../../services/statisticsApi";
import { LineChart, BarChart } from "react-native-chart-kit";
import DateTimePicker from "@react-native-community/datetimepicker";
import { gotoTab, resetToAuth } from "../../utils/navigationRef";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";

const { width } = Dimensions.get("window");
type Period = "week" | "month" | "year" | "custom";

/* reuse simplified date helpers */
const formatISODate = (d: Date) => d.toISOString().split("T")[0];

const AdminLessonManagementScreen = () => {
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
      if (customDate.start && customDate.end && customDate.start <= customDate.end) return { start: customDate.start, end: customDate.end };
      return null;
    }
    if (!anchorDate) return null;
    return { start: anchorDate, end: new Date(anchorDate.getTime() + 24 * 3600 * 1000) };
  }, [selectedPeriod, anchorDate, customDate]);

  const queryKey = computedRange
    ? ["lessonsOverview", "range", formatISODate(computedRange.start), formatISODate(new Date(computedRange.end.getTime() - 1))]
    : ["lessonsOverview", "period", selectedPeriod];

  const { data: overviewData, isLoading: overviewLoading, refetch: overviewRefetch } = useQuery({
    queryKey,
    queryFn: () => getStatisticsOverview({ period: selectedPeriod as any }),
    staleTime: 1000 * 60,
  });

  const { data: activitiesData, isLoading: activitiesLoading, refetch: activitiesRefetch } = useQuery({
    queryKey: ["activities", ...queryKey.slice(1)],
    queryFn: () => getActivities({ status: "lesson", startDate: computedRange ? formatISODate(computedRange.start) : undefined, endDate: computedRange ? formatISODate(new Date(computedRange.end.getTime() - 1)) : undefined }),
    staleTime: 1000 * 60,
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
      await Promise.all([overviewRefetch(), activitiesRefetch()]);
    } catch (err) {
      Toast.show({ type: "error", text1: t("common.error"), text2: t("errors.unknown") });
    } finally {
      setRefreshing(false);
    }
  };

  const onDateChange = (event: any, date?: Date | undefined) => {
    const dismissed = (event && (event.type === "dismissed" || event.action === "dismissedAction" || event.nativeEvent?.action === "dismissedAction")) || !date;
    if (dismissed) { setShowDatePicker(null); return; }
    if (showDatePicker === "anchor") setAnchorDate(date);
    else if (showDatePicker === "start") { setCustomDate((p) => ({ ...p, start: date })); setTimeout(() => setShowDatePicker("end"), 100); return; }
    else if (showDatePicker === "end") {
      if (customDate.start && date < customDate.start) {
        Alert.alert(
          t("admin.analytics.errors.invalidRangeTitle"),
          t("admin.analytics.errors.invalidRangeMessage")
        );
        setShowDatePicker(null);
        return;
      }
      setCustomDate((p) => ({ ...p, end: date }));
    }
    setShowDatePicker(null);
  };

  const lessonsList = Array.isArray(activitiesData?.items) ? activitiesData.items : (activitiesData?.lessons || []);

  // simple completion chart
  const completionChart = {
    labels: (activitiesData?.timeSeries || []).map((p: any) => p.label) || [t("admin.analytics.charts.notAvailable")],
    values: (activitiesData?.timeSeries || []).map((p: any) => Number(p.completions ?? 0)) || [0],
  };

  return (
    <ScreenLayout style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View style={styles.headerArea}>
          <Text style={styles.headerTitle}>{t("admin.lessons.title")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity style={styles.periodSelector} onPress={() => setShowPeriodModal(true)}>
              <Icon name="event" size={20} color="#4F46E5" />
              <Text style={styles.periodSelectorText}>{getPeriodTranslation(selectedPeriod)}</Text>
              i           </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={() => {
              Alert.alert(
                t("admin.analytics.logout.title"),
                t("admin.analytics.logout.message"),
                [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("common.ok"), onPress: () => resetToAuth() }
                ]
              );
            }}>
              <Icon name="logout" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker value={showDatePicker === "anchor" ? anchorDate || new Date() : showDatePicker === "start" ? customDate.start || new Date() : customDate.end || new Date()} mode="date" display="default" onChange={onDateChange} />
        )}

        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>{t("admin.lessons.completions")}</Text>
          {activitiesLoading ? <ActivityIndicator /> : (
            <BarChart
              data={{ labels: completionChart.labels, datasets: [{ data: completionChart.values }] }}
              width={width - 48}
              height={180}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
                labelColor: (opacity = 1) => `rgba(107,114,128,${opacity})`,
              }}
              style={{ borderRadius: 12 }}
            />
          )}
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{t("admin.lessons.listTitle")}</Text>
          {activitiesLoading ? <ActivityIndicator size="small" /> : lessonsList.length === 0 ? (
            <Text style={{ color: "#6B7280", padding: 12 }}>{t("admin.lessons.noLessons")}</Text>
          ) : (
            <FlatList
              data={lessonsList}
              keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
              renderItem={({ item }: any) => (
                <TouchableOpacity style={styles.lessonCard} onPress={() => gotoTab("AdminLessonEditScreen")}>
                  <Text style={{ fontWeight: "600" }}>{item.title ?? item.name}</Text>
                  <Text style={{ color: "#6B7280", fontSize: 13 }}>{item.meta ?? item.description ?? ""}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  headerArea: { padding: 16, backgroundColor: "#fff", marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  periodSelector: { flexDirection: "row", alignItems: "center", padding: 8, backgroundColor: "#EEF2FF", borderRadius: 8, marginRight: 8 },
  periodSelectorText: { marginLeft: 6, fontSize: 14, fontWeight: "600", color: "#4F46E5" },
  chartsContainer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  statsSection: { padding: 24 },
  lessonCard: { padding: 12, backgroundColor: "#fff", borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#F1F5F9" },
  logoutButton: { marginLeft: 12, padding: 8, backgroundColor: "#FEE2E2", borderRadius: 8 },
});

export default AdminLessonManagementScreen;