import React, { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMemorizations } from "../../hooks/useMemorizations";
import { MemorizationResponse, MemorizationRequest } from "../../types/dto";
import * as Enums from "../../types/enums";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";

const NotesScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useUserStore();

  const [selectedContentType, setSelectedContentType] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [selectedNoteType, setSelectedNoteType] = useState<"word" | "phrase" | "grammar">("word");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    useUserMemorizations,
    useCreateMemorization,
    useDeleteMemorization,
    useToggleFavorite,
  } = useMemorizations();

  // Search Param hook integration
  const searchParams = useMemo(() => {
    const params: any = { page: 0, size: 20 };
    if (selectedContentType !== "all") params.content_type = selectedContentType;
    if (searchQuery.length > 2) params.keyword = searchQuery; // Assuming backend supports keyword
    return params;
  }, [selectedContentType, searchQuery]);

  const {
    data: memorizationsPage,
    isLoading: memorizationsLoading,
    refetch: refetchMemorizations,
  } = useUserMemorizations(searchParams);

  const { mutate: createMemorization, isPending: isCreating } = useCreateMemorization();
  const { mutate: deleteMemorization, isPending: isDeleting } = useDeleteMemorization();
  const { mutate: toggleFavorite } = useToggleFavorite();

  const notesList = useMemo(() => {
    let list = (memorizationsPage?.data as MemorizationResponse[]) || [];
    if (showFavoritesOnly) {
      list = list.filter(item => item.isFavorite);
    }
    // Client-side filtering fallback if backend keyword search isn't instant
    if (searchQuery && !searchParams.keyword) {
      list = list.filter(n => n.noteText?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [memorizationsPage, showFavoritesOnly, searchQuery, searchParams.keyword]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const mapNoteTypeToContentType = (type: string): Enums.ContentType => {
    switch (type) {
      case "word": return Enums.ContentType.VOCABULARY;
      case "phrase": return Enums.ContentType.VOCABULARY; // Or specific enum if available
      case "grammar": return Enums.ContentType.FORMULA;
      default: return Enums.ContentType.NOTE;
    }
  };

  const contentTypes = [
    { key: "all", label: t("notes.all") ?? "All" },
    { key: "VOCABULARY", label: t("notes.vocab") ?? "Vocab" },
    { key: "FORMULA", label: t("notes.grammar") ?? "Grammar" },
    { key: "NOTE", label: t("notes.general") ?? "Notes" },
  ];

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const payload: MemorizationRequest = {
      contentType: mapNoteTypeToContentType(selectedNoteType),
      contentId: null, // Custom note
      noteText: newNote.trim(),
      isFavorite: false,
      userId: user?.userId || "", // Ensure userId is passed
    };

    createMemorization(payload, {
      onSuccess: () => {
        setNewNote("");
        setShowAddModal(false);
        refetchMemorizations();
      },
      onError: () => Alert.alert("Error", t("common.error"))
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert(t("common.delete"), t("notes.confirmDelete"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteMemorization(id) }
    ]);
  };

  const renderNoteItem = ({ item }: { item: MemorizationResponse }) => (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <View style={styles.noteTypeTag}>
          <Text style={styles.noteTypeTagText}>
            {item.contentType === Enums.ContentType.VOCABULARY ? "🔤" :
              item.contentType === Enums.ContentType.FORMULA ? "📐" : "📝"}
          </Text>
        </View>
        <Text style={styles.noteDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>

      <Text style={styles.noteText}>{item.noteText}</Text>

      <View style={styles.noteFooter}>
        <TouchableOpacity
          onPress={() => toggleFavorite({ id: item.memorizationId, currentReq: item as any })}
          style={styles.iconBtn}
        >
          <Icon name={item.isFavorite ? "star" : "star-border"} size={20} color={item.isFavorite ? "#F59E0B" : "#9CA3AF"} />
        </TouchableOpacity>

        {/* Mock Reminder Button - triggers logic backend implies */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => Alert.alert("Reminder", t("notes.reminderSet"))}
        >
          <Icon name="alarm" size={20} color="#6B7280" />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity onPress={() => handleDelete(item.memorizationId)} style={styles.iconBtn}>
          <Icon name="delete-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenLayout style={styles.container}>
      {/* Notion-style Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#37352F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notes.title") ?? "My Notes"}</Text>
        <TouchableOpacity onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}>
          <Icon name={showFavoritesOnly ? "star" : "star-outline"} size={24} color={showFavoritesOnly ? "#F59E0B" : "#37352F"} />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("notes.searchPlaceholder") ?? "Search..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {contentTypes.map(type => (
            <TouchableOpacity
              key={type.key}
              style={[styles.filterChip, selectedContentType === type.key && styles.activeFilterChip]}
              onPress={() => setSelectedContentType(type.key)}
            >
              <Text style={[styles.filterText, selectedContentType === type.key && styles.activeFilterText]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {memorizationsLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#37352F" />
        ) : (
          <FlatList
            data={notesList}
            renderItem={renderNoteItem}
            keyExtractor={item => item.memorizationId}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="post-add" size={48} color="#E5E7EB" />
                <Text style={styles.emptyText}>{t("notes.empty") ?? "No notes found. Tap + to add."}</Text>
              </View>
            }
          />
        )}
      </Animated.View>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Icon name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("notes.newNote") ?? "New Note"}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color="#37352F" />
              </TouchableOpacity>
            </View>

            <View style={styles.typeSelector}>
              {(["word", "phrase", "grammar"] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, selectedNoteType === type && styles.activeTypeBtn]}
                  onPress={() => setSelectedNoteType(type)}
                >
                  <Text style={[styles.typeBtnText, selectedNoteType === type && styles.activeTypeBtnText]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              multiline
              placeholder={t("notes.inputPlaceholder") ?? "Type your note here..."}
              value={newNote}
              onChangeText={setNewNote}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.saveButton, (!newNote.trim() || isCreating) && styles.disabledBtn]}
              onPress={handleAddNote}
              disabled={!newNote.trim() || isCreating}
            >
              {isCreating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>{t("common.save")}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Notion white
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#37352F',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  searchSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F5',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#37352F',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  activeFilterChip: {
    backgroundColor: '#37352F',
    borderColor: '#37352F',
  },
  filterText: {
    fontSize: 12,
    color: '#37352F',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#FBFBFA', // Slight off-white for content area
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9E9E9',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTypeTag: {
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    padding: 4,
  },
  noteTypeTagText: {
    fontSize: 12,
  },
  noteDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noteText: {
    fontSize: 15,
    color: '#37352F',
    lineHeight: 22,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F7F7F7',
    paddingTop: 8,
    gap: 16,
  },
  iconBtn: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#37352F', // Notion black
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#9CA3AF',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#37352F',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  typeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F7F7F5',
  },
  activeTypeBtn: {
    backgroundColor: '#E6F3FF',
  },
  typeBtnText: {
    fontSize: 13,
    color: '#37352F',
  },
  activeTypeBtnText: {
    color: '#0077D6',
    fontWeight: '600',
  },
  modalInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#37352F',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#37352F',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#A0A0A0',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  }
});

export default NotesScreen;