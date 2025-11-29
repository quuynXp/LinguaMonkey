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
import { useLessons } from "../../hooks/useLessons";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const AdminLessonManagementScreen = () => {
  const { t } = useTranslation();
  const { useAllLessons, useDeleteLesson } = useLessons();

  const [page, setPage] = useState(0);
  const { data, isLoading, refetch, isFetching } = useAllLessons({ page, size: 20 });
  const { mutate: deleteLesson } = useDeleteLesson();

  const handleDelete = (id: string) => {
    Alert.alert(t("common.confirm"), t("admin.lessons.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteLesson(id) },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Icon name="class" size={24} color="#8B5CF6" />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.sub}>{item.difficultyLevel} • {item.expReward} XP</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.lessonId)} style={styles.delBtn}>
        <Icon name="delete-outline" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("admin.lessons.manage")}</Text>
        </View>

        {isLoading && page === 0 ? (
          <ActivityIndicator style={styles.loader} color="#8B5CF6" />
        ) : (
          <FlatList
            data={data?.data}
            keyExtractor={(item) => item.lessonId}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
            onEndReached={() => {
              if (data?.pagination?.hasNext) setPage((p) => p + 1);
            }}
          />
        )}
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  loader: { marginTop: 20 },
  list: { padding: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  sub: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  delBtn: { padding: 8 },
});

export default AdminLessonManagementScreen;