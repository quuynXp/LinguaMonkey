import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, TextInput, TouchableOpacity, Text, View, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRoadmap } from "../../hooks/useRoadmap";
import { RoadmapItem } from "../../types/entity";
import { CreateRoadmapRequest } from "../../types/dto";
import { Certification, ProficiencyLevel } from "../../types/enums";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

type EditableRoadmap = any; // Using looser type for form handling ease, maps to DTO

const EditRoadmapScreen = ({ route, navigation }: any) => {
  const { userId } = route.params || {};
  const { t } = useTranslation();

  // Hooks
  const {
    useUserRoadmaps,
    useRoadmapDetail,
    useCreateRoadmap,
    useEditRoadmap,
    useDeleteRoadmap
  } = useRoadmap();

  // --- STATE: MODE SWITCHING ---
  // If editingId is null, show List View. If set, show Edit View.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // --- DATA FETCHING ---
  // List Data
  const { data: roadmapList, isLoading: isListLoading, refetch: refetchList } = useUserRoadmaps();

  // Detail Data (only fetches if editingId is set)
  const { data: detailData, isLoading: isDetailLoading } = useRoadmapDetail(editingId);

  // Mutations
  const createMut = useCreateRoadmap();
  const editMut = useEditRoadmap();
  const deleteMut = useDeleteRoadmap();

  // --- FORM STATE ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<RoadmapItem[]>([]);

  // --- EFFECTS ---

  // Reset form when entering Create Mode
  useEffect(() => {
    if (isCreating) {
      setEditingId(null);
      setTitle("");
      setDescription("");
      setItems([]);
    }
  }, [isCreating]);

  // Populate form when Detail Data loads (Edit Mode)
  useEffect(() => {
    if (editingId && detailData) {
      setTitle(detailData.title || "");
      setDescription(detailData.description || "");
      // @ts-ignore - Assuming API returns items
      setItems(detailData.items || []);
    }
  }, [detailData, editingId]);

  // --- HANDLERS: LIST VIEW ---

  const handleStartCreate = () => {
    setIsCreating(true);
  };

  const handleStartEdit = (id: string) => {
    setIsCreating(false);
    setEditingId(id);
  };

  const handleDeleteRoadmap = (id: string, roadmapTitle: string) => {
    Alert.alert(
      t("common.confirmDelete"),
      `${t("roadmap.deleteConfirmMessage")} "${roadmapTitle}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMut.mutateAsync(id);
              Alert.alert(t("common.success"), t("roadmap.deleteSuccess"));
              refetchList();
            } catch (err: any) {
              Alert.alert(t("common.error"), err.message || t("errors.unknown"));
            }
          }
        }
      ]
    );
  };

  // --- HANDLERS: EDITOR VIEW ---

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t("common.error"), t("roadmap.titleRequired"));
      return;
    }

    const req: CreateRoadmapRequest = {
      title: title,
      description: description,
      languageCode: 'en', // Default or grab from store
      currentLevel: 0,
      targetLevel: 0,
      targetProficiency: ProficiencyLevel.A1,
      estimatedCompletionTime: 1,
      certification: 'NONE' as Certification,
    };

    try {
      if (isCreating) {
        await createMut.mutateAsync(req);
        Alert.alert(t("common.success"), t("roadmap.createSuccess"));
        setIsCreating(false);
      } else if (editingId) {
        await editMut.mutateAsync({ id: editingId, req });
        Alert.alert(t("common.success"), t("roadmap.saveSuccess"));
        setEditingId(null);
      }
      refetchList();
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message || t("errors.unknown"));
    }
  };

  const handleBackFromEditor = () => {
    if (title !== (detailData?.title || "") && !isCreating) {
      // Simple unsaved changes check could go here
    }
    setEditingId(null);
    setIsCreating(false);
  };

  // --- PLACEHOLDER ITEM HANDLERS (As per requirements) ---
  const handleAddItem = () => {
    Alert.alert(t("common.info"), "Add Item feature requires useAddItemToRoadmap mutation.");
  };

  const handleEditItem = (item: RoadmapItem) => {
    Alert.alert(t("common.info"), `Edit Item feature requires useEditRoadmapItem mutation for item: ${item.title}`);
  };

  const handleDeleteItem = (item: RoadmapItem) => {
    Alert.alert(t("common.info"), `Delete Item feature requires useDeleteRoadmapItem mutation for item: ${item.title}`);
  };

  // --- RENDERERS ---

  const renderRoadmapListItem = ({ item }: { item: any }) => (
    <View style={styles.roadmapListCard}>
      <View style={styles.roadmapInfo}>
        <Text style={styles.roadmapListTitle}>{item.title}</Text>
        <Text style={styles.roadmapListMeta} numberOfLines={1}>{item.description}</Text>
        <View style={styles.roadmapBadge}>
          <Text style={styles.roadmapBadgeText}>{item.language || item.languageCode || 'en'}</Text>
        </View>
      </View>
      <View style={styles.roadmapActions}>
        <TouchableOpacity onPress={() => handleStartEdit(item.roadmapId || item.id)} style={styles.actionBtn}>
          <Icon name="edit" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteRoadmap(item.roadmapId || item.id, item.title)} style={[styles.actionBtn, styles.deleteBtn]}>
          <Icon name="delete" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEditorItem = (item: RoadmapItem, index: number) => (
    <View key={item.itemId || index} style={styles.itemCard}>
      <View style={styles.timelineConnector}>
        <View style={styles.timelineDot} />
        <View style={styles.timelineLine} />
      </View>
      <View style={styles.itemContentWrapper}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemSubtitle}>
            {item.type || t("roadmap.item")} {t("common.dot")} {item.estimatedTime || 0} {t("common.minutes")}
          </Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => handleEditItem(item)} style={styles.editButton}>
            <Icon name="edit" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteItem(item)} style={styles.deleteButton}>
            <Icon name="delete" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // --- MAIN RENDER LOGIC ---

  if (isListLoading && !editingId && !isCreating) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  // VIEW 1: EDITOR (Create or Edit)
  if (isCreating || editingId) {
    if (editingId && isDetailLoading) {
      return (
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </SafeAreaView>
      );
    }

    return (
      <ScreenLayout style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackFromEditor}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isCreating ? t("roadmap.createRoadmap") : t("roadmap.editRoadmap")}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={editMut.isPending || createMut.isPending}>
            <Icon name="save" size={24} color={(editMut.isPending || createMut.isPending) ? "#9CA3AF" : "#3B82F6"} />
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

          {/* Editor Timeline View */}
          <View style={styles.timelineContainer}>
            {items && items.length > 0 ? (
              items.map(renderEditorItem)
            ) : (
              <View style={styles.emptyItemsContainer}>
                <Text style={styles.emptyItemsText}>{t("roadmap.noItemsYet")}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScreenLayout>
    );
  }

  // VIEW 2: LIST OF ROADMAPS (Default)
  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("roadmap.manageRoadmaps")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.listContent}>
        <TouchableOpacity style={styles.createBanner} onPress={handleStartCreate}>
          <View style={styles.createIconBg}>
            <Icon name="add" size={24} color="#FFF" />
          </View>
          <View>
            <Text style={styles.createBannerTitle}>{t("roadmap.createNew")}</Text>
            <Text style={styles.createBannerSubtitle}>{t("roadmap.createNewDesc")}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>{t("roadmap.myRoadmaps")}</Text>

        <FlatList
          data={roadmapList}
          keyExtractor={(item) => item.roadmapId || item.id}
          renderItem={renderRoadmapListItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>{t("roadmap.noRoadmapsFound")}</Text>
          }
        />
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },

  // Header
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

  // List View Styles
  listContent: { flex: 1, padding: 20 },
  createBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderStyle: 'dashed'
  },
  createIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  createBannerTitle: { fontSize: 16, fontWeight: '700', color: '#1E40AF' },
  createBannerSubtitle: { fontSize: 12, color: '#60A5FA' },

  roadmapListCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1
  },
  roadmapInfo: { flex: 1 },
  roadmapListTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  roadmapListMeta: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  roadmapBadge: { backgroundColor: '#F3F4F6', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roadmapBadgeText: { fontSize: 10, color: '#4B5563', fontWeight: '600', textTransform: 'uppercase' },
  roadmapActions: { flexDirection: 'row', gap: 8, paddingLeft: 12 },
  actionBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8 },
  deleteBtn: { backgroundColor: '#FEE2E2' },
  emptyListText: { textAlign: 'center', color: '#9CA3AF', marginTop: 20 },

  // Editor View Styles
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

  // Timeline Editor Styles
  timelineContainer: { paddingLeft: 10 },
  itemCard: {
    flexDirection: "row",
    marginBottom: 0,
    minHeight: 80
  },
  timelineConnector: {
    alignItems: 'center',
    width: 20,
    marginRight: 12
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    zIndex: 2,
    marginTop: 18
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: -2,
    zIndex: 1
  },
  itemContentWrapper: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
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