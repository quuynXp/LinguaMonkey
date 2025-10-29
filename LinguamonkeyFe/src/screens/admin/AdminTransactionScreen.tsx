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
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Toast from "../../components/Toast";
import { getTransactions } from "../../services/statisticsApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import { resetToAuth } from "../../utils/navigationRef";
import { createScaledSheet } from "../../utils/scaledStyles";

const { width } = Dimensions.get("window");
type Period = "week" | "month" | "year" | "custom";

/* reuse same small date helpers as admin dashboard when needed (omitted here for brevity) */
const formatISODate = (d: Date) => d.toISOString().split("T")[0];

const AdminTransactionScreen = () => {
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
    // simplified: month anchor only (you can copy full helpers if needed)
    return { start: anchorDate, end: new Date(anchorDate.getTime() + 24 * 3600 * 1000) };
  }, [selectedPeriod, anchorDate, customDate]);

  const queryKey = computedRange
    ? ["transactions", "range", formatISODate(computedRange.start), formatISODate(new Date(computedRange.end.getTime() - 1))]
    : ["transactions", "period", selectedPeriod];

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => {
      if (computedRange) {
        return getTransactions({
          startDate: formatISODate(computedRange.start),
          endDate: formatISODate(new Date(computedRange.end.getTime() - 1)),
        });
      }
      return getTransactions({ aggregate: selectedPeriod === "month" ? "week" : "day" } as any);
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
      await refetch();
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View style={styles.headerArea}>
          <Text style={styles.headerTitle}>{t("admin.transactions.title")}</Text>
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

        {showDatePicker && (
          <DateTimePicker
            value={showDatePicker === "anchor" ? anchorDate || new Date() : showDatePicker === "start" ? customDate.start || new Date() : customDate.end || new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        <View style={styles.listContainer}>
          {isLoading ? <ActivityIndicator size="small" color="#3B82F6" /> : (
            <>
              {Array.isArray(data) && data.length > 0 ? (
                <FlatList
                  data={data}
                  keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
                  renderItem={({ item }: any) => (
                    <View style={styles.txRow}>
                      <View>
                        <Text style={styles.txTitle}>{item.title ?? item.type ?? item.provider ?? t("admin.transactions.defaultTitle")}</Text>
                        <Text style={styles.txMeta}>{item.date ?? item.createdAt ?? ""}</Text>
                      </View>
                      <Text style={styles.txAmount}>${Number(item.amount ?? 0).toLocaleString()}</Text>
                    </View>
                  )}
                />
              ) : (
                <Text style={{ color: "#6B7280", padding: 16 }}>{t("admin.transactions.noTransactions")}</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  headerArea: { padding: 16, backgroundColor: "#fff", marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  periodSelector: { flexDirection: "row", alignItems: "center", padding: 8, backgroundColor: "#EEF2FF", borderRadius: 8, marginRight: 8 },
  periodSelectorText: { marginLeft: 6, fontSize: 14, fontWeight: "600", color: "#4F46E5" },
  listContainer: { padding: 16 },
  txRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  txTitle: { fontSize: 16, fontWeight: "600" },
  txMeta: { color: "#6B7280", fontSize: 12 },
  txAmount: { fontSize: 16, fontWeight: "700", color: "#111827" },
  logoutButton: { marginLeft: 12, padding: 8, backgroundColor: "#FEE2E2", borderRadius: 8 },
});

export default AdminTransactionScreen;