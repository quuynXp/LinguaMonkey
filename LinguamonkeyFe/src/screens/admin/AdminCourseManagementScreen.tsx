import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Toast from "../../components/Toast";
import { getStatisticsOverview, getActivities } from "../../services/statisticsApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import { gotoTab, resetToAuth } from "../../utils/navigationRef";

const formatISODate = (d: Date) => d.toISOString().split("T")[0];

type Period = "week" | "month" | "year" | "custom";

const AdminCourseManagementScreen = () => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [anchorDate, setAnchorDate] = useState<Date | undefined>(undefined);
  const [customDate, setCustomDate] = useState<{ start?: Date; end?: Date }>({});
  const [showDatePicker, setShowDatePicker] = useState<"anchor" | "start" | "end" | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const getPeriodTranslation = (p: Period) => {
    switch (p) {
      case "week": return t("admin.analytics.periods.week");
      case "month": return t("admin.analytics.periods.month");
      case "year": return t("admin.analytics.periods.year");
      case "custom": return t("admin.analytics.periods.custom");
      default: return p;
    }
  };

  const computedRange = useMemo(() => {
    if (selectedPeriod === "custom") {
      if (customDate.start && customDate.end && customDate.start <= customDate.end) return { start: customDate.start, end: customDate.end };
      return null;
    }
    if (!anchorDate) return null;
 
    return { start: anchorDate, end: new Date(anchorDate.getTime() + 24 * 3600 * 1000) };
  }, [selectedPeriod, anchorDate, customDate]);

  const queryKey = computedRange
    ? ["coursesOverview", "range", formatISODate(computedRange.start), formatISODate(new Date(computedRange.end.getTime() - 1))]
    : ["coursesOverview", "period", selectedPeriod];

  const { data: overviewData, isLoading: overviewLoading, refetch: overviewRefetch } = useQuery({
    queryKey,
    queryFn: () => getStatisticsOverview({ period: selectedPeriod as any }),
    staleTime: 1000 * 60,
  });

  const { data: coursesActivities, isLoading: coursesLoading, refetch: coursesRefetch } = useQuery({
    queryKey: ["coursesActivities", ...queryKey.slice(1)],
    queryFn: () => getActivities({ status: "course", startDate: computedRange ? formatISODate(computedRange.start) : undefined, endDate: computedRange ? formatISODate(new Date(computedRange.end.getTime() - 1)) : undefined }),
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
      await Promise.all([overviewRefetch(), coursesRefetch()]);
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

  const courses = coursesActivities?.items || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View style={styles.headerArea}>
          <Text style={styles.headerTitle}>{t("admin.courses.title")}</Text>
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
                  { text: t("common.ok"), onPress: () => resetToAuth() }
                ]
              );
            }}>
              <Icon name="logout" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && <DateTimePicker value={showDatePicker === "anchor" ? anchorDate || new Date() : showDatePicker === "start" ? customDate.start || new Date() : customDate.end || new Date()} mode="date" display="default" onChange={onDateChange} />}

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{t("admin.analytics.overview.title")}</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statsCard, { borderLeftColor: "#10B981" }]}>
              <View style={styles.statsCardHeader}><Icon name="school" size={20} color="#10B981" /></View>
              <Text style={styles.statsValue}>{overviewData?.courses ?? 0}</Text>
              <Text style={styles.statsTitle}>{t("admin.courses.overview.totalCourses")}</Text>
            </View>
            <View style={[styles.statsCard, { borderLeftColor: "#F59E0B" }]}>
              <View style={styles.statsCardHeader}><Icon name="book" size={20} color="#F59E0B" /></View>
              <Text style={styles.statsValue}>{overviewData?.lessons ?? 0}</Text>
              <Text style={styles.statsTitle}>{t("admin.courses.overview.lessons")}</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>{t("admin.courses.listTitle")}</Text>
          {coursesLoading ? <ActivityIndicator size="small" /> : courses.length === 0 ? (
            <Text style={{ color: "#6B7280" }}>{t("admin.courses.noCourses")}</Text>
          ) : (
            <FlatList data={courses} keyExtractor={(c: any) => c.id?.toString() ?? Math.random().toString()} renderItem={({ item }: any) => (
              <TouchableOpacity style={styles.courseRow} onPress={() => gotoTab("Admin", "AdminCourseDetailScreen", { courseId: item.id })}>
                <Text style={{ fontWeight: "600" }}>{item.title ?? item.name}</Text>
                <Text style={{ color: "#6B7280", fontSize: 13 }}>{item.meta ?? item.description ?? ""}</Text>
              </TouchableOpacity>
            )} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  sectionTitle: { padding: 16, backgroundColor: "#fff" }, // Gộp style này nếu nó giống hệt nhau
  headerArea: { padding: 16, backgroundColor: "#fff", marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  periodSelector: { flexDirection: "row", alignItems: "center", padding: 8, backgroundColor: "#EEF2FF", borderRadius: 8, marginRight: 8 },
  periodSelectorText: { marginLeft: 6, fontSize: 14, fontWeight: "600", color: "#4F46E5" },
  statsSection: { padding: 24 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statsCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, width: "48%", borderLeftWidth: 4, marginBottom: 12 },
  statsCardHeader: { marginBottom: 6 },
  statsValue: { fontSize: 18, fontWeight: "700" },
  statsTitle: { fontSize: 13, color: "#6B7280" },
  courseRow: { padding: 12, backgroundColor: "#fff", borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#F1F5F9" },
  logoutButton: { marginLeft: 12, padding: 8, backgroundColor: "#FEE2E2", borderRadius: 8 },
});

export default AdminCourseManagementScreen;