import { useState, useMemo } from "react";
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
import { getStatisticsOverview } from "../../services/statisticsApi";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";

const { width } = Dimensions.get("window");

type Period = "week" | "month" | "year";

const AdminDashboardScreen = () => {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["admin-stats-overview", selectedPeriod],
    queryFn: () => getStatisticsOverview({ period: selectedPeriod }),
  });

  const onRefresh = () => {
    refetch();
  };

  const StatCard = ({ title, value, icon, color, subValue }: any) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsCardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
        <Text style={styles.statsTitle}>{title}</Text>
      </View>
      <Text style={[styles.statsValue, { color }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      {subValue && <Text style={styles.statsSub}>{subValue}</Text>}
    </View>
  );

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.headerArea}>
          <Text style={styles.headerTitle}>{t("admin.dashboard.overview")}</Text>
          <View style={styles.filterRow}>
            {(["week", "month", "year"] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setSelectedPeriod(p)}
                style={[
                  styles.filterBtn,
                  selectedPeriod === p && styles.filterBtnActive
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedPeriod === p && styles.filterTextActive
                  ]}
                >
                  {t(`common.period.${p}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading && !stats ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              title={t("admin.stats.users")}
              value={stats?.users || 0}
              icon="people"
              color="#4F46E5"
            />
            <StatCard
              title={t("admin.stats.revenue")}
              value={`$${(stats?.revenue || 0).toLocaleString()}`}
              icon="attach-money"
              color="#10B981"
            />
            <StatCard
              title={t("admin.stats.courses")}
              value={stats?.courses || 0}
              icon="school"
              color="#F59E0B"
            />
            <StatCard
              title={t("admin.stats.transactions")}
              value={stats?.transactions || 0}
              icon="receipt"
              color="#EF4444"
            />
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t("admin.dashboard.quickActions")}</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionBtn}>
              <Icon name="person-add" size={24} color="#4F46E5" />
              <Text style={styles.actionText}>{t("admin.actions.addUser")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Icon name="post-add" size={24} color="#10B981" />
              <Text style={styles.actionText}>{t("admin.actions.addCourse")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  headerArea: { padding: 16, backgroundColor: "#fff", marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
  filterRow: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 8, padding: 4, alignSelf: 'flex-start' },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  filterBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  filterText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  filterTextActive: { color: "#4F46E5" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
  statsCard: { width: (width - 44) / 2, backgroundColor: "#fff", padding: 16, borderRadius: 12, borderLeftWidth: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statsCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  iconContainer: { padding: 6, borderRadius: 8, marginRight: 8 },
  statsTitle: { fontSize: 13, color: "#6B7280", fontWeight: "600", flex: 1 },
  statsValue: { fontSize: 20, fontWeight: "700" },
  statsSub: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  sectionContainer: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  actionText: { marginTop: 8, fontWeight: '600', color: '#374151' }
});

export default AdminDashboardScreen;