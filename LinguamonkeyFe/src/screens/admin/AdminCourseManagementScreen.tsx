import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useCourses } from "../../hooks/useCourses";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const AdminCourseManagementScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { useAllCourses, useDeleteCourse } = useCourses();

  const [page, setPage] = useState(0);
  const { data, isLoading, refetch, isFetching } = useAllCourses({ page, size: 20 });
  const { mutate: deleteCourse } = useDeleteCourse();

  const confirmDelete = (id: string, title: string) => {
    Alert.alert(
      t("admin.courses.deleteTitle"),
      t("admin.courses.deleteConfirm", { title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: () => deleteCourse(id) },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() => navigation.navigate("AdminCourseDetailScreen", { courseId: item.courseId })}
    >
      <View style={styles.courseIcon}>
        <Icon name="school" size={24} color="#F59E0B" />
      </View>
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.courseMeta}>
          {item.level || "Beginner"} • {item.price ? `$${item.price}` : "Free"}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => confirmDelete(item.courseId, item.title)}
      >
        <Icon name="delete" size={20} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("admin.courses.manage")}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("AdminCourseDetailScreen", { courseId: null })} // New Create Logic
          >
            <Icon name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoading && page === 0 ? (
          <ActivityIndicator style={styles.loader} size="large" color="#4F46E5" />
        ) : (
          <FlatList
            data={data?.data}
            keyExtractor={(item) => item.courseId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
            onEndReached={() => {
              if (data?.pagination?.hasNext) setPage((prev) => prev + 1);
            }}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  loader: { marginTop: 40 },
  listContent: { padding: 16 },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  courseInfo: { flex: 1 },
  courseTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  courseMeta: { fontSize: 13, color: "#64748B", marginTop: 4 },
  actionBtn: { padding: 8 },
  emptyText: { textAlign: "center", marginTop: 40, color: "#94A3B8" },
});

export default AdminCourseManagementScreen;