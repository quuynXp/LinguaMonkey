import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, TextInput, TouchableOpacity, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRoadmap } from "../../hooks/useRoadmap";
import { RoadmapItem, Roadmap } from "../../types/entity";
import { CreateRoadmapRequest } from "../../types/dto";
import { Certification, ProficiencyLevel } from "../../types/enums";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

type EditableRoadmap = Roadmap;

const EditRoadmapScreen = ({ route, navigation }) => {
  const { roadmapId, userId } = route.params;
  const { t } = useTranslation();
  const { useRoadmapWithProgress, useEditRoadmap } = useRoadmap();

  const { data: rawRoadmap, isLoading, error, refetch } = useRoadmapWithProgress(roadmapId);

  const roadmap: EditableRoadmap = useMemo(() => {
    return (rawRoadmap as unknown as EditableRoadmap) || null;
  }, [rawRoadmap]);

  const editMut = useEditRoadmap();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (roadmap && !isDataLoaded) {
      setTitle(roadmap.title || "");
      setDescription(roadmap.description || "");
      setIsDataLoaded(true);
    }
  }, [roadmap, isDataLoaded]);

  const handleSave = async () => {
    if (!title.trim() || !roadmap) {
      Alert.alert(t("common.error"), t("roadmap.titleRequired"));
      return;
    }

    const updateRequest: CreateRoadmapRequest = {
      title: title,
      description: description,
      languageCode: roadmap.languageCode || 'en',
      currentLevel: 0,
      targetLevel: 0,
      targetProficiency: ProficiencyLevel.A1,
      estimatedCompletionTime: 1,
      certification: 'NONE' as Certification, // SỬA LỖI: Gán giá trị cụ thể ('NONE') và ép kiểu
    };

    try {
      await editMut.mutateAsync({
        id: roadmapId,
        req: updateRequest,
      });
      Alert.alert(t("common.success"), t("roadmap.saveSuccess"));
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message || t("errors.unknown"));
    }
  };

  // --- PLACEHOLDER HANDLERS (Do thiếu hooks item CRUD) ---
  const handleAddItem = () => {
    Alert.alert(t("common.info"), "Add Item feature requires useAddItemToRoadmap mutation.");
  };

  const handleEditItem = (item: RoadmapItem) => {
    Alert.alert(t("common.info"), `Edit Item feature requires useEditRoadmapItem mutation for item: ${item.title}`);
  };

  const handleDeleteItem = (item: RoadmapItem) => {
    Alert.alert(t("common.info"), `Delete Item feature requires useDeleteRoadmapItem mutation for item: ${item.title}`);
  };

  // --- Render Functions ---

  const renderRoadmapItem = (item: RoadmapItem, index: number) => (
    <View key={item.itemId || index} style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>
          {item.type || t("roadmap.item")} {t("common.dot")} {item.estimatedTime || 0} {t("common.minutes")}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => handleEditItem(item)} style={styles.editButton}>
          <Icon name="edit" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteItem(item)} style={styles.deleteButton}>
          <Icon name="delete" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- Conditional Renders ---

  if (isLoading || editMut.isPending) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>
          {editMut.isPending ? t("common.saving") : t("common.loading")}
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !roadmap) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="error" size={48} color="#EF4444" />
        <Text style={styles.errorText}>
          {t("errors.loadFailed")}
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("roadmap.editRoadmap")}</Text>
        <TouchableOpacity onPress={handleSave} disabled={editMut.isPending}>
          <Icon name="save" size={24} color={editMut.isPending ? "#9CA3AF" : "#3B82F6"} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>{t("roadmap.roadmapDetails")}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t("common.title")}
          placeholderTextColor="#9CA3AF"
        />
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          value={description}
          onChangeText={setDescription}
          placeholder={t("common.description")}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.itemHeaderSection}>
          <Text style={styles.sectionTitle}>{t("roadmap.items")}</Text>
          <TouchableOpacity onPress={handleAddItem} style={styles.addButton}>
            <Icon name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>{t("common.add")}</Text>
          </TouchableOpacity>
        </View>

        {/* List of Items */}
        {roadmap.items && roadmap.items.length > 0 ? (
          roadmap.items.map(renderRoadmapItem)
        ) : (
          <View style={styles.emptyItemsContainer}>
            <Text style={styles.emptyItemsText}>{t("roadmap.noItemsYet")}</Text>
          </View>
        )}

      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#3B82F6" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { fontSize: 16, color: "#EF4444", marginVertical: 10 },
  retryButton: { backgroundColor: "#3B82F6", padding: 10, borderRadius: 8, marginTop: 10 },
  retryButtonText: { color: "#FFFFFF", fontWeight: "600" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  descriptionInput: {
    minHeight: 100,
  },
  itemHeaderSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 20,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  itemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: "#EBF5FF",
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  emptyItemsContainer: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  emptyItemsText: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
  },
});

export default EditRoadmapScreen;