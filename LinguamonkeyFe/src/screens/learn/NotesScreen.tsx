import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
    Alert,
    Animated,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { useMemorizations } from "../../hooks/useMemorizations"
import { useAppStore } from "../../stores/appStore"
import type { UserMemorization } from "../../types/api"
import { createScaledSheet } from "../../utils/scaledStyles";

const NotesScreen = ({ navigation }: any) => {
  const { t } = useTranslation()

  const [selectedContentType, setSelectedContentType] = useState<string>("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [selectedNoteType, setSelectedNoteType] = useState<"word" | "phrase" | "sentence">("word")
  const [searchQuery, setSearchQuery] = useState("")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current

  const {
    useUserMemorizations,
    useCreateMemorization,
    useUpdateMemorization,
    useDeleteMemorization,
    useToggleFavorite,
  } = useMemorizations()

  const {
    data: memorizations = [],
    isLoading: memorizationsLoading,
    error: memorizationsError,
    refetch: refetchMemorizations,
  } = useUserMemorizations({
    content_type: selectedContentType === "all" ? undefined : selectedContentType,
    is_favorite: showFavoritesOnly ? true : undefined,
    search: searchQuery || undefined,
  })

  const { mutate: createMemorization, isPending: isCreating } = useCreateMemorization()
  const { mutate: updateMemorization, isPending: isUpdating } = useUpdateMemorization()
  const { mutate: deleteMemorization, isPending: isDeleting } = useDeleteMemorization()
  const { mutate: toggleFavorite, isPending: isToggling } = useToggleFavorite()

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  const contentTypes = [
    { key: "all", label: t("notes.contentTypes.all") },
    { key: "lesson", label: t("notes.contentTypes.lesson") },
    { key: "video", label: t("notes.contentTypes.video") },
    { key: "vocabulary", label: t("notes.contentTypes.vocabulary") },
    { key: "grammar", label: t("notes.contentTypes.grammar") },
  ]

  const addNote = async () => {
    if (newNote.trim() === "") return

    try {
      await createMemorization({
        content_type: selectedNoteType,
        note_text: newNote.trim(),
        is_favorite: false,
      })

      setNewNote("")
      setShowAddModal(false)
      refetchMemorizations()
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("errors.unknown"))
    }
  }

  const handleDeleteNote = (memorization: UserMemorization) => {
    Alert.alert(t("notes.deleteConfirm"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMemorization(memorization.memorizationId)
            refetchMemorizations()
          } catch (error: any) {
            Alert.alert(t("common.error"), error.message || t("errors.unknown"))
          }
        },
      },
    ])
  }

  const handleToggleFavorite = async (memorization: UserMemorization) => {
    try {
      await toggleFavorite(memorization.memorizationId)
      refetchMemorizations()
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("errors.unknown"))
    }
  }

  const renderNote = ({ item: memorization }: { item: UserMemorization }) => (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <View style={[styles.noteTypeIndicator, { backgroundColor: getTypeColor(memorization.contentType) }]}>
          <Text style={styles.noteTypeText}>{memorization.contentType.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.noteActions}>
          <TouchableOpacity
            onPress={() => handleToggleFavorite(memorization)}
            disabled={isToggling}
            style={styles.favoriteButton}
          >
            <Icon
              name={memorization.isFavorite ? "favorite" : "favorite-border"}
              size={20}
              color={memorization.isFavorite ? "#F59E0B" : "#6B7280"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteNote(memorization)} disabled={isDeleting}>
            <Icon name="delete" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.noteContent}>{memorization.noteText}</Text>

      <View style={styles.noteFooter}>
        <Text style={styles.noteDate}>{new Date(memorization.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.noteType}>{t(`notes.contentTypes.${memorization.contentType}`)}</Text>
      </View>
    </View>
  )

  const getTypeColor = (type: string) => {
    switch (type) {
      case "lesson":
        return "#10B981"
      case "video":
        return "#F59E0B"
      case "vocabulary":
        return "#3B82F6"
      case "grammar":
        return "#8B5CF6"
      default:
        return "#6B7280"
    }
  }

  if (memorizationsError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#F44336" />
          <Text style={styles.errorText}>{t("errors.networkError")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetchMemorizations()}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("notes.title")}</Text>
        <TouchableOpacity onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}>
          <Icon name={showFavoritesOnly ? "favorite" : "favorite-border"} size={24} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("notes.searchPlaceholder")}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Content Type Filter */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {contentTypes.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[styles.filterChip, selectedContentType === type.key && styles.selectedFilterChip]}
                onPress={() => setSelectedContentType(type.key)}
              >
                <Text
                  style={[styles.filterText, selectedContentType === type.key && styles.selectedFilterText]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Notes List */}
        {memorizationsLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t("common.loading")}</Text>
          </View>
        ) : (
          <FlatList
            data={memorizations}
            renderItem={renderNote}
            keyExtractor={(item) => item.memorizationId}
            style={styles.notesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="note-add" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>{t("notes.emptyTitle")}</Text>
                <Text style={styles.emptyDescription}>{t("notes.emptyDescription")}</Text>
              </View>
            }
          />
        )}

        {/* Add Note Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Icon name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Add Note Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("notes.addNoteModal.title")}</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.noteTypeSelector}>
                {(["word", "phrase", "sentence"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      selectedNoteType === type && styles.selectedTypeButton,
                      { backgroundColor: selectedNoteType === type ? getTypeColor(type) : "#F3F4F6" },
                    ]}
                    onPress={() => setSelectedNoteType(type)}
                  >
                    <Text style={[styles.typeButtonText, selectedNoteType === type && styles.selectedTypeButtonText]}>
                      {t(`notes.noteTypes.${type}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.noteInput}
                placeholder={t("notes.addNoteModal.placeholder", { type: t(`notes.noteTypes.${selectedNoteType}`) })}
                value={newNote}
                onChangeText={setNewNote}
                multiline
                autoFocus
              />

              <TouchableOpacity
                style={[styles.addNoteButton, (isCreating || newNote.trim() === "") && styles.disabledButton]}
                onPress={addNote}
                disabled={isCreating || newNote.trim() === ""}
              >
                <Text style={styles.addNoteButtonText}>
                  {isCreating ? t("common.loading") : t("notes.addNoteModal.addButton")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  filtersSection: {
    marginTop: 20,
  },
  filtersScroll: {
    paddingLeft: 20,
  },
  filterChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedFilterChip: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  selectedFilterText: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  notesList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  noteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  noteTypeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  noteTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  noteActions: {
    flexDirection: "row",
    gap: 12,
  },
  favoriteButton: {
    padding: 4,
  },
  noteContent: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  noteType: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  noteTypeSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  selectedTypeButton: {
    backgroundColor: "#3B82F6",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  selectedTypeButtonText: {
    color: "#FFFFFF",
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  addNoteButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
  },
  addNoteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})

export default NotesScreen
