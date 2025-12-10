import React, { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMemorizations } from "../../hooks/useMemorizations";
import { useReminders } from "../../hooks/useReminders";
import { MemorizationResponse, MemorizationRequest, UserReminderRequest } from "../../types/dto";
import * as Enums from "../../types/enums";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { TimeHelper } from "../../utils/timeHelper";

const NotesScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const { prefillContent, courseId } = route.params || {};

  const [selectedContentType, setSelectedContentType] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [selectedNoteType, setSelectedNoteType] = useState<"word" | "phrase" | "grammar">("word");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Reminder State
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState("09");
  const [reminderMinute, setReminderMinute] = useState("00");
  const [reminderRepeat, setReminderRepeat] = useState<Enums.RepeatType>(Enums.RepeatType.DAILY);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Hooks
  const {
    useUserMemorizations,
    useCreateMemorization,
    useDeleteMemorization,
    useUpdateMemorization,
  } = useMemorizations();

  const { useCreateReminder } = useReminders();
  const { mutate: createReminder, isPending: isCreatingReminder } = useCreateReminder();

  useEffect(() => {
    if (prefillContent) {
      setNewNote(prefillContent);
      setShowAddModal(true);
      setIsReminderEnabled(true);
    }
  }, [prefillContent]);

  const searchParams = useMemo(() => {
    const params: any = { page: 0, size: 20 };
    if (selectedContentType !== "all") params.content_type = selectedContentType;
    if (searchQuery.length > 2) params.keyword = searchQuery;
    return params;
  }, [selectedContentType, searchQuery]);

  const {
    data: memorizationsPage,
    isLoading: memorizationsLoading,
    refetch: refetchMemorizations,
  } = useUserMemorizations(searchParams);

  const { mutate: createMemorization, isPending: isCreatingNote } = useCreateMemorization();
  const { mutate: deleteMemorization } = useDeleteMemorization();
  const { mutate: updateMemorization } = useUpdateMemorization();

  const notesList = useMemo(() => {
    let list = (memorizationsPage?.data as MemorizationResponse[]) || [];
    if (showFavoritesOnly) {
      list = list.filter(item => item.isFavorite);
    }
    // Local filter fallback if API doesn't support keyword perfectly yet
    if (searchQuery && !searchParams.keyword) {
      list = list.filter(n => n.noteText?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [memorizationsPage, showFavoritesOnly, searchQuery, searchParams.keyword]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const mapNoteTypeToContentType = (type: string): Enums.ContentType => {
    switch (type) {
      case "word": return Enums.ContentType.VOCABULARY;
      case "grammar": return Enums.ContentType.FORMULA;
      case "phrase": return Enums.ContentType.NOTE; // Assuming Phrase maps to General Note
      default: return Enums.ContentType.NOTE;
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    if (!user?.userId) {
      console.error("❌ Missing UserID in Store");
      Alert.alert("Error", "User session invalid. Please login again.");
      return;
    }

    // Helper: Valid UUID or NULL (Strictly for Java Backend)
    const safeContentId = (courseId && typeof courseId === 'string' && courseId.length === 36)
      ? courseId
      : null;

    const payload: MemorizationRequest = {
      userId: user.userId,
      contentType: mapNoteTypeToContentType(selectedNoteType),
      contentId: safeContentId,
      noteText: newNote.trim(),
      isFavorite: false,
    };

    console.log("📝 Preparing to create note:", payload);

    createMemorization(payload, {
      onSuccess: (createdNote) => {
        if (isReminderEnabled) {
          handleCreateReminder(createdNote.memorizationId, createdNote.noteText);
        } else {
          finishAddProcess();
        }
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || t("common.error");
        Alert.alert("Failed to create note", msg);
      }
    });
  };

  const handleToggleFavorite = (item: MemorizationResponse) => {
    const safeContentId = (item.contentId && item.contentId.length === 36) ? item.contentId : null;

    const cleanPayload: MemorizationRequest = {
      userId: item.userId,
      contentType: item.contentType,
      contentId: safeContentId,
      noteText: item.noteText,
      isFavorite: !item.isFavorite
    };

    updateMemorization({
      id: item.memorizationId,
      req: cleanPayload
    }, {
      onError: () => Alert.alert("Error", "Failed to update status")
    });
  };

  const handleCreateReminder = (targetId: string, noteTitle: string) => {
    const timeStringHHMM = `${reminderHour}:${reminderMinute}`;

    const reminderPayload: UserReminderRequest = {
      title: t("notes.reminderTitle") + ": " + (noteTitle.length > 20 ? noteTitle.substring(0, 20) + "..." : noteTitle),
      message: t("notes.reminderBody") + ": " + noteTitle,
      time: timeStringHHMM,
      date: TimeHelper.formatDateForApi(new Date()),
      repeatType: reminderRepeat,
      targetType: Enums.TargetType.NOTE,
      targetId: targetId,
      enabled: true
    };

    createReminder(reminderPayload, {
      onSuccess: () => {
        Alert.alert(t("common.success"), t("notes.reminderSetSuccess"));
        finishAddProcess();
      },
      onError: (err: any) => {
        console.error("Reminder creation failed:", err);
        Alert.alert(t("common.warning"), t("notes.noteSavedReminderFailed"));
        finishAddProcess();
      }
    });
  };

  const finishAddProcess = () => {
    setNewNote("");
    setReminderHour("09");
    setReminderMinute("00");
    setIsReminderEnabled(false);
    setShowAddModal(false);
    refetchMemorizations();
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
            {item.contentType === Enums.ContentType.VOCABULARY ? "🔤 Vocabulary" :
              item.contentType === Enums.ContentType.FORMULA ? "📐 Grammar" : "📝 Note"}
          </Text>
        </View>
        <Text style={styles.noteDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.noteText}>{item.noteText}</Text>
      <View style={styles.noteFooter}>
        <TouchableOpacity
          onPress={() => handleToggleFavorite(item)}
          style={styles.iconBtn}
        >
          <Icon name={item.isFavorite ? "star" : "star-border"} size={22} color={item.isFavorite ? "#F59E0B" : "#9CA3AF"} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => handleDelete(item.memorizationId)} style={styles.iconBtn}>
          <Icon name="delete-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#37352F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notes.title") ?? "My Notes"}</Text>
        <TouchableOpacity onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}>
          <Icon name={showFavoritesOnly ? "star" : "star-outline"} size={24} color={showFavoritesOnly ? "#F59E0B" : "#37352F"} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("notes.searchPlaceholder") ?? "Search notes..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

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
                <Icon name="note-add" size={48} color="#E5E7EB" />
                <Text style={styles.emptyText}>{t("notes.empty") ?? "Create your first note"}</Text>
              </View>
            }
          />
        )}
      </Animated.View>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Icon name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Add Note Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("notes.newNote") ?? "New Note"}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color="#37352F" />
              </TouchableOpacity>
            </View>

            {/* Content Type Selector */}
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
              placeholder={t("notes.inputPlaceholder") ?? "Enter text..."}
              value={newNote}
              onChangeText={setNewNote}
              autoFocus
            />

            {/* Reminder Section */}
            <View style={styles.reminderSection}>
              <View style={styles.reminderHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="alarm" size={20} color="#37352F" style={{ marginRight: 8 }} />
                  <Text style={styles.reminderLabel}>{t("notes.enableReminder") ?? "Reminder"}</Text>
                </View>
                <Switch
                  value={isReminderEnabled}
                  onValueChange={setIsReminderEnabled}
                  trackColor={{ false: "#E5E7EB", true: "#37352F" }}
                />
              </View>

              {isReminderEnabled && (
                <View style={styles.reminderControls}>
                  <Text style={styles.labelSmall}>{t("notes.time") ?? "Set Time"}</Text>
                  <View style={styles.timePickerContainer}>
                    <TouchableOpacity
                      style={styles.timeBox}
                      onPress={() => {
                        const h = parseInt(reminderHour);
                        const next = h >= 23 ? 0 : h + 1;
                        setReminderHour(next.toString().padStart(2, '0'));
                      }}
                    >
                      <Text style={styles.timeText}>{reminderHour}</Text>
                      <Text style={styles.timeLabel}>Hr</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeSeparator}>:</Text>
                    <TouchableOpacity
                      style={styles.timeBox}
                      onPress={() => {
                        const m = parseInt(reminderMinute);
                        const next = m >= 55 ? 0 : m + 5;
                        setReminderMinute(next.toString().padStart(2, '0'));
                      }}
                    >
                      <Text style={styles.timeText}>{reminderMinute}</Text>
                      <Text style={styles.timeLabel}>Min</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.repeatContainer}>
                    <Text style={styles.labelSmall}>{t("notes.repeat") ?? "Frequency"}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={() => setReminderRepeat(Enums.RepeatType.DAILY)}
                        style={[styles.repeatChip, reminderRepeat === Enums.RepeatType.DAILY && styles.activeChip]}
                      >
                        <Text style={[styles.chipText, reminderRepeat === Enums.RepeatType.DAILY && styles.activeChipText]}>Daily</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setReminderRepeat(Enums.RepeatType.ONCE)}
                        style={[styles.repeatChip, reminderRepeat === Enums.RepeatType.ONCE && styles.activeChip]}
                      >
                        <Text style={[styles.chipText, reminderRepeat === Enums.RepeatType.ONCE && styles.activeChipText]}>Once</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (!newNote.trim() || isCreatingNote || isCreatingReminder) && styles.disabledBtn]}
              onPress={handleAddNote}
              disabled={!newNote.trim() || isCreatingNote || isCreatingReminder}
            >
              {(isCreatingNote || isCreatingReminder) ?
                <ActivityIndicator color="#FFF" /> :
                <Text style={styles.saveButtonText}>{t("common.save")}</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F1F1' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#37352F' },
  searchSection: { padding: 16, backgroundColor: '#FFFFFF' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F7F5', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#37352F' },
  contentContainer: { flex: 1, backgroundColor: '#FBFBFA' },
  listContent: { padding: 16, paddingBottom: 80 },
  noteCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E9E9E9', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  noteTypeTag: { backgroundColor: '#F0F0F0', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  noteTypeTagText: { fontSize: 12, fontWeight: '500', color: '#555' },
  noteDate: { fontSize: 12, color: '#9CA3AF' },
  noteText: { fontSize: 15, color: '#37352F', lineHeight: 22, marginBottom: 12 },
  noteFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F7F7F7', paddingTop: 8, gap: 16 },
  iconBtn: { padding: 4 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#37352F', justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9CA3AF', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#37352F' },
  typeSelector: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  typeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#F7F7F5' },
  activeTypeBtn: { backgroundColor: '#E6F3FF', borderWidth: 1, borderColor: '#0077D6' },
  typeBtnText: { fontSize: 13, color: '#37352F' },
  activeTypeBtnText: { color: '#0077D6', fontWeight: '600' },
  modalInput: { fontSize: 16, lineHeight: 24, color: '#37352F', minHeight: 80, textAlignVertical: 'top', marginBottom: 10 },

  // Reminder Styles
  reminderSection: { backgroundColor: '#F7F7F5', padding: 12, borderRadius: 8, marginBottom: 20 },
  reminderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderLabel: { fontSize: 15, fontWeight: '500', color: '#37352F' },
  reminderControls: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#E1E1E1', paddingTop: 12 },

  // Time Picker Custom UX
  timePickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  timeBox: { backgroundColor: '#FFF', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', width: 60 },
  timeText: { fontSize: 24, fontWeight: 'bold', color: '#37352F' },
  timeLabel: { fontSize: 10, color: '#6B7280' },
  timeSeparator: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 10, color: '#37352F' },

  labelSmall: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  repeatContainer: { marginTop: 10 },
  repeatChip: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFF' },
  activeChip: { backgroundColor: '#37352F', borderColor: '#37352F' },
  chipText: { fontSize: 12, color: '#37352F' },
  activeChipText: { color: '#FFF' },

  saveButton: { backgroundColor: '#37352F', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#A0A0A0' },
  saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 }
});

export default NotesScreen;