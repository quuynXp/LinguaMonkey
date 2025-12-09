import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  TextInput,
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useRoadmap } from "../../hooks/useRoadmap";
import { CreateRoadmapRequest } from "../../types/dto";
import { Certification, ProficiencyLevel } from "../../types/enums";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import FileUploader from "../../components/common/FileUploader";

const EditRoadmapScreen = ({ route, navigation }: any) => {
  const { userId } = route.params || {};
  const { t } = useTranslation();

  const {
    useUserRoadmaps,
    useRoadmapDetail,
    useCreateRoadmap,
    useEditRoadmap,
    useDeleteRoadmap
  } = useRoadmap();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: roadmapList, isLoading: isListLoading, refetch: refetchList } = useUserRoadmaps();
  const { data: detailData, isLoading: isDetailLoading } = useRoadmapDetail(editingId);

  const createMut = useCreateRoadmap();
  const editMut = useEditRoadmap();
  const deleteMut = useDeleteRoadmap();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<any[]>([]);

  // Item Modal State
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [inputType, setInputType] = useState<'upload' | 'link'>('link');

  const [tempItem, setTempItem] = useState({
    title: "",
    description: "",
    estimatedTime: "",
    resourceUrl: "",
    resourceType: "article",
    resourceTitle: ""
  });

  useEffect(() => {
    if (isCreating) {
      setEditingId(null);
      setTitle("");
      setDescription("");
      setItems([]);
    }
  }, [isCreating]);

  useEffect(() => {
    if (editingId && detailData) {
      setTitle(detailData.title || "");
      setDescription(detailData.description || "");
      const formattedItems = (detailData.items || []).map((item: any, index: number) => ({
        ...item,
        key: item.id || `item-${index}`,
        resources: item.resources || []
      }));
      setItems(formattedItems);
    }
  }, [detailData, editingId]);

  const handleStartCreate = () => setIsCreating(true);

  const handleStartEdit = (id: string) => {
    setIsCreating(false);
    setEditingId(id);
  };

  const handleBackFromEditor = () => {
    setEditingId(null);
    setIsCreating(false);
  };

  const handleSaveRoadmap = async () => {
    if (!title.trim()) {
      Alert.alert(t("common.error"), t("roadmap.titleRequired"));
      return;
    }

    // STRICT CLEANING: Ensure items match the Backend DTO exactly
    // Removing 'key', 'name', 'id' and other UI-only fields to prevent backend validation errors
    const cleanedItems = items.map((item, idx) => ({
      title: item.title || item.name || "Untitled Step",
      description: item.description || "",
      orderIndex: idx,
      estimatedTime: parseInt(String(item.estimatedTime || 0)),
      // Map resources to ResourceRequest list structure
      resources: (item.resources || []).map((res: any) => ({
        title: res.title || "Resource",
        url: res.url || "",
        type: res.type || "article",
        description: res.description || "",
        duration: res.duration || 0 // Default duration if missing
      }))
    }));

    const req: CreateRoadmapRequest = {
      title,
      description,
      languageCode: 'en',
      currentLevel: 0,
      targetLevel: 10,
      targetProficiency: ProficiencyLevel.A1,
      estimatedCompletionTime: cleanedItems.reduce((acc, i) => acc + (i.estimatedTime || 0), 0),
      certification: 'NONE' as Certification,
      items: cleanedItems
    };

    try {
      if (isCreating) {
        await createMut.mutateAsync(req);
        Alert.alert("Success", "Roadmap created successfully!");
        setIsCreating(false);
      } else if (editingId) {
        await editMut.mutateAsync({ id: editingId, req });
        Alert.alert("Success", "Roadmap updated successfully!");
        setEditingId(null);
      }
      refetchList();
    } catch (err: any) {
      console.error("Save Roadmap Error:", err);
      Alert.alert("Error", err.message || "Failed to save. Please check input data.");
    }
  };

  const handleDeleteRoadmap = (id: string) => {
    Alert.alert("Confirm", "Delete this roadmap?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMut.mutateAsync(id);
          refetchList();
        }
      }
    ]);
  };

  const openAddItem = () => {
    setEditingItemIndex(null);
    setTempItem({
      title: "",
      description: "",
      estimatedTime: "15",
      resourceUrl: "",
      resourceType: "article",
      resourceTitle: ""
    });
    setInputType('link');
    setIsItemModalVisible(true);
  };

  const openEditItem = (item: any, index: number) => {
    setEditingItemIndex(index);
    const res = item.resources && item.resources.length > 0 ? item.resources[0] : null;
    setTempItem({
      title: item.name || item.title || "",
      description: item.description || "",
      estimatedTime: String(item.estimatedTime || "15"),
      resourceUrl: res ? res.url : "",
      resourceType: res ? res.type : "article",
      resourceTitle: res ? res.title : ""
    });
    setInputType(res && !res.url.startsWith('http') ? 'upload' : 'link');
    setIsItemModalVisible(true);
  };

  const handleUploadSuccess = (result: any, type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT') => {
    const url = result?.url || result?.secure_url || result;
    setTempItem(prev => ({
      ...prev,
      resourceUrl: url,
      resourceType: type.toLowerCase()
    }));
  };

  const handleSaveItem = () => {
    if (!tempItem.title.trim()) {
      Alert.alert("Required", "Please enter a title");
      return;
    }

    const newItem = {
      title: tempItem.title,
      name: tempItem.title, // kept for UI compatibility if needed, stripped before save
      description: tempItem.description,
      estimatedTime: parseInt(tempItem.estimatedTime) || 0,
      key: editingItemIndex !== null ? items[editingItemIndex].key : `new-${Date.now()}`,
      resources: tempItem.resourceUrl ? [{
        title: tempItem.resourceTitle || "Attached Resource",
        url: tempItem.resourceUrl,
        type: tempItem.resourceType,
        description: "User uploaded resource",
        duration: 0
      }] : []
    };

    if (editingItemIndex !== null) {
      const updated = [...items];
      updated[editingItemIndex] = { ...updated[editingItemIndex], ...newItem };
      setItems(updated);
    } else {
      setItems([...items, newItem]);
    }
    setIsItemModalVisible(false);
  };

  const handleDeleteItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const renderDraggableItem = ({ item, drag, isActive, getIndex }: RenderItemParams<any>) => {
    const index = getIndex();
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[styles.itemCard, isActive && styles.activeItemCard]}
        >
          <View style={styles.dragHandle}>
            <Icon name="drag-indicator" size={24} color="#9CA3AF" />
          </View>

          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>{item.name || item.title}</Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {item.estimatedTime} min • {item.description}
            </Text>
            {item.resources && item.resources.length > 0 && (
              <View style={styles.resourceBadge}>
                <Icon name="attach-file" size={12} color="#4B5563" />
                <Text style={styles.resourceText}>
                  {item.resources[0].type.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.itemActions}>
            <TouchableOpacity onPress={() => index !== undefined && openEditItem(item, index)} style={styles.actionIcon}>
              <Icon name="edit" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => index !== undefined && handleDeleteItem(index)} style={styles.actionIcon}>
              <Icon name="delete" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  if (isCreating || editingId) {
    if (editingId && isDetailLoading) {
      return <ActivityIndicator size="large" style={styles.loading} color="#3B82F6" />;
    }

    return (
      <ScreenLayout style={styles.container}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackFromEditor}>
              <Icon name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isCreating ? "New Roadmap" : "Edit Roadmap"}</Text>
            <TouchableOpacity onPress={handleSaveRoadmap}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaContainer}>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Roadmap Title"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              multiline
            />
            <TouchableOpacity style={styles.addItemBtn} onPress={openAddItem}>
              <Icon name="add" size={20} color="#FFF" />
              <Text style={styles.addItemText}>Add New Step</Text>
            </TouchableOpacity>
            <Text style={styles.hintText}>Long press an item to reorder</Text>
          </View>

          <DraggableFlatList
            data={items}
            onDragEnd={({ data }) => setItems(data)}
            keyExtractor={(item) => item.key}
            renderItem={renderDraggableItem}
            containerStyle={styles.listContainer}
            ListEmptyComponent={<Text style={styles.emptyText}>No items yet. Add one!</Text>}
          />

          <Modal visible={isItemModalVisible} animationType="slide" transparent>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{editingItemIndex !== null ? "Edit Step" : "New Step"}</Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Step Title"
                    value={tempItem.title}
                    onChangeText={(t) => setTempItem({ ...tempItem, title: t })}
                  />
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      placeholder="Time (min)"
                      keyboardType="numeric"
                      value={tempItem.estimatedTime}
                      onChangeText={(t) => setTempItem({ ...tempItem, estimatedTime: t })}
                    />
                  </View>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Description"
                    multiline
                    value={tempItem.description}
                    onChangeText={(t) => setTempItem({ ...tempItem, description: t })}
                  />

                  {/* Resource Section */}
                  <Text style={styles.sectionLabel}>Attach Resource</Text>

                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, inputType === 'link' && styles.toggleBtnActive]}
                      onPress={() => setInputType('link')}
                    >
                      <Text style={[styles.toggleText, inputType === 'link' && styles.toggleTextActive]}>External Link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, inputType === 'upload' && styles.toggleBtnActive]}
                      onPress={() => setInputType('upload')}
                    >
                      <Text style={[styles.toggleText, inputType === 'upload' && styles.toggleTextActive]}>Upload File</Text>
                    </TouchableOpacity>
                  </View>

                  {inputType === 'link' ? (
                    <>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Resource URL (YouTube, Blog, etc.)"
                        value={tempItem.resourceUrl}
                        onChangeText={(t) => setTempItem({ ...tempItem, resourceUrl: t, resourceType: 'article' })}
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Link Title (Optional)"
                        value={tempItem.resourceTitle}
                        onChangeText={(t) => setTempItem({ ...tempItem, resourceTitle: t })}
                      />
                    </>
                  ) : (
                    <FileUploader
                      onUploadSuccess={handleUploadSuccess}
                      mediaType="all"
                      style={styles.uploader}
                    >
                      {tempItem.resourceUrl ? (
                        <View style={styles.uploadPreview}>
                          {tempItem.resourceType.includes('image') ? (
                            <Image source={{ uri: tempItem.resourceUrl }} style={styles.previewImage} />
                          ) : (
                            <Icon name="check-circle" size={40} color="#10B981" />
                          )}
                          <Text style={styles.uploadedText} numberOfLines={1}>
                            File Uploaded
                          </Text>
                          <Text style={styles.changeText}>Tap to change</Text>
                        </View>
                      ) : (
                        <View style={styles.uploadPlaceholder}>
                          <Icon name="cloud-upload" size={32} color="#6B7280" />
                          <Text style={styles.uploadText}>Tap to upload Video/Image/Doc</Text>
                        </View>
                      )}
                    </FileUploader>
                  )}

                </ScrollView>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsItemModalVisible(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveItem}>
                    <Text style={styles.confirmText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

        </GestureHandlerRootView>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("roadmap.manageRoadmaps")}</Text>
        <TouchableOpacity onPress={handleStartCreate}>
          <Icon name="add" size={28} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {isListLoading ? (
          <ActivityIndicator color="#3B82F6" />
        ) : roadmapList?.map((item: any) => (
          <View key={item.roadmapId || item.id} style={styles.roadmapCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listDesc} numberOfLines={1}>{item.description}</Text>
            </View>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => handleStartEdit(item.roadmapId || item.id)} style={styles.iconBtn}>
                <Icon name="edit" size={20} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteRoadmap(item.roadmapId || item.id)} style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}>
                <Icon name="delete" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loading: { marginTop: 50 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#FFF", borderBottomWidth: 1, borderColor: "#E5E7EB" },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
  saveText: { color: "#3B82F6", fontWeight: "bold", fontSize: 16 },

  metaContainer: { padding: 16, backgroundColor: "#FFF" },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14, backgroundColor: "#F9FAFB" },
  textArea: { height: 80, textAlignVertical: 'top' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', padding: 12, borderRadius: 8 },
  addItemText: { color: '#FFF', fontWeight: '600', marginLeft: 8 },
  hintText: { fontSize: 12, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40, flex: 1 },

  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB', elevation: 2 },
  activeItemCard: { borderColor: '#3B82F6', transform: [{ scale: 1.02 }] },
  dragHandle: { paddingRight: 12 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  itemSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  resourceBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: '#EFF6FF', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  resourceText: { fontSize: 10, color: '#4B5563', marginLeft: 4 },
  itemActions: { flexDirection: 'row' },
  actionIcon: { padding: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  modalTextArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center' },
  confirmBtn: { flex: 1, padding: 14, backgroundColor: '#3B82F6', borderRadius: 8, alignItems: 'center' },
  cancelText: { color: '#374151', fontWeight: '600' },
  confirmText: { color: '#FFF', fontWeight: '600' },

  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  toggleRow: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#F3F4F6', borderRadius: 8, padding: 2 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#FFF', elevation: 1 },
  toggleText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  toggleTextActive: { color: '#3B82F6', fontWeight: '600' },

  uploader: { width: '100%', marginBottom: 12 },
  uploadPlaceholder: { height: 100, borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  uploadText: { marginTop: 8, color: '#6B7280', fontSize: 13 },
  uploadPreview: { height: 100, borderWidth: 1, borderColor: '#10B981', borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ECFDF5' },
  previewImage: { width: 60, height: 60, borderRadius: 4, marginBottom: 4 },
  uploadedText: { color: '#059669', fontWeight: '600', fontSize: 13 },
  changeText: { color: '#059669', fontSize: 11, textDecorationLine: 'underline' },

  roadmapCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  listTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  listDesc: { fontSize: 13, color: '#6B7280' },
  iconBtn: { padding: 8, backgroundColor: '#EFF6FF', borderRadius: 8, marginLeft: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF' }
});

export default EditRoadmapScreen;