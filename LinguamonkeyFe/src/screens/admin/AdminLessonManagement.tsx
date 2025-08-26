import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getActivities, getStatisticsOverview } from "../../services/statisticsApi";
import { BarChart, LineChart } from "react-native-chart-kit";
// Reuse period/date logic from AdminDashboard - assume imported

const AdminLessonManagement = () => {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  // ... Period/date states same as above

  const { data: overviewData } = useQuery({ /* getStatisticsOverview for lessons */ });
  const { data: activitiesData } = useQuery({
    queryFn: () => getActivities({ activityType: "lesson", /* range params */ }),
  });

  const [lessons] = useState([ /* mock or fetch list of lessons */ ]);

  // Charts
  const completionChart = activitiesData?.completions || { labels: [], values: [] };
  const timeSpentChart = activitiesData?.timeSpent || { labels: [], values: [] };

  // Stats cards similar

  const renderLesson = ({ item }) => (
    <TouchableOpacity style={styles.lessonCard}>
      <Text>{item.title}</Text>
      {/* Edit/Delete buttons */}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>Lesson Management & Analytics</Text>
        {/* Period selection */}
      </View>
      <ScrollView>
        {/* Charts section */}
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>Lesson Completions</Text>
          <BarChart /* data={completionChart} */ />
          <Text style={styles.sectionTitle}>Time Spent</Text>
          <LineChart /* data={timeSpentChart} */ />
        </View>
        {/* Stats */}
        {/* Lesson List */}
        <FlatList data={lessons} renderItem={renderLesson} keyExtractor={(item) => item.id} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles similar

export default AdminLessonManagement;