import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { getStatisticsOverview } from "../../services/statisticsApi";
import { useCourses } from "../../hooks/useCourses";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const AdminCourseManagementScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  // FIX: Destructure the specific hook from the hook factory
  const { useAllCourses } = useCourses() as any;

  // FIX: Call the specific hook to get the query result
  // Assuming a default page size suitable for a list view
  const {
    data: coursesPage,
    isLoading: loadingList,
    refetch: refetchCourses
  } = useAllCourses({ page: 0, size: 20 });

  // Extract the actual array from the paginated response
  const courses = coursesPage?.data || [];

  // Use stats for header
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ["course-stats-overview"],
    queryFn: () => getStatisticsOverview({ period: "month" }),
  });

  const isLoading = loadingList || loadingStats;

  const onRefresh = () => {
    if (refetchCourses) refetchCourses();
    refetchStats();
  };

  const renderCourse = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.courseItem}
      onPress={() => navigation.navigate("AdminCourseDetailScreen", { courseId: item.courseId })}
    >
      <View style={styles.courseIcon}>
        <Icon name="school" size={24} color="#F59E0B" />
      </View>
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.courseSub}>
          {item.difficultyLevel || t("common.notAvailable")} • {item.price ? `$${item.price}` : "Free"}
        </Text>
      </View>
      <Icon name="chevron-right" size={24} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View style={styles.statHeader}>
          <View style={styles.statBox}>
            {/* FIX: Use correct property names from StatisticsOverviewResponse */}
            <Text style={styles.statVal}>{stats?.courses || 0}</Text>
            <Text style={styles.statLbl}>{t("admin.courses.total")}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            {/* FIX: Use correct property names from StatisticsOverviewResponse */}
            <Text style={styles.statVal}>{stats?.courses || 0}</Text>
            <Text style={styles.statLbl}>{t("admin.stats.lessons")}</Text>
          </View>
        </View>

        {isLoading && !courses.length ? (
          <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#4F46E5" />
        ) : (
          <FlatList
            data={courses}
            keyExtractor={(item) => item.courseId || item.id}
            renderItem={renderCourse}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t("admin.courses.noCourses")}</Text>
            }
          />
        )}
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  statHeader: { flexDirection: "row", backgroundColor: "#fff", padding: 16, marginBottom: 8, elevation: 1 },
  statBox: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
  statLbl: { fontSize: 13, color: "#6B7280" },
  statDivider: { width: 1, backgroundColor: "#E5E7EB" },
  listContent: { padding: 16 },
  courseItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.03, elevation: 1 },
  courseIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFFBEB", justifyContent: "center", alignItems: "center", marginRight: 12 },
  courseInfo: { flex: 1 },
  courseTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  courseSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  emptyText: { textAlign: "center", color: "#9CA3AF", marginTop: 32 }
});

export default AdminCourseManagementScreen;