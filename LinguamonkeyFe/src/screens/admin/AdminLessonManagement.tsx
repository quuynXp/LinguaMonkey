import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getActivityStatistics, getStatisticsOverview } from "../../services/statisticsApi";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const AdminLessonManagementScreen = () => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["lesson-stats"],
    queryFn: () => getStatisticsOverview({ period: "month" }),
  });

  const { data: activities, refetch: refetchActivities } = useQuery({
    queryKey: ["activity-stats"],
    queryFn: () => getActivityStatistics({ period: "month" }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchActivities()]);
    setRefreshing(false);
  };

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{t("admin.lessons.overview")}</Text>
          <Text style={styles.bannerCount}>{stats?.lessons || 0}</Text>
          <Text style={styles.bannerSub}>{t("admin.lessons.totalLessons")}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("admin.lessons.engagement")}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t("admin.lessons.activeLearners")}</Text>
            <Text style={styles.value}>{activities?.activeUsers || 0}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("admin.lessons.completionRate")}</Text>
            <Text style={styles.value}>{activities?.completionRate || "0%"}</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  banner: { padding: 24, backgroundColor: "#4F46E5", alignItems: "center", marginBottom: 16 },
  bannerTitle: { color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  bannerCount: { color: "#fff", fontSize: 40, fontWeight: "800" },
  bannerSub: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  section: { backgroundColor: "#fff", padding: 16, margin: 16, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  label: { color: "#64748B", fontSize: 14 },
  value: { color: "#1F2937", fontWeight: "600", fontSize: 14 }
});

export default AdminLessonManagementScreen;