import React, { useState, useMemo, useCallback } from "react"; // Thêm useCallback
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ScrollView,
  Image,
  Dimensions
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMemorizations } from "../../hooks/useMemorizations";
import { MemorizationResponse, MemorizationRequest, LessonQuestionResponse } from "../../types/dto";
import * as Enums from "../../types/enums";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { VocabularyFlashcardView } from "../../components/learn/VocabularyFlashcardView";
import FileUploader from "../../components/common/FileUploader";
import { getDirectMediaUrl } from "../../utils/mediaUtils";

const { width } = Dimensions.get("window");

const NotesScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useUserStore();

  const [activeTab, setActiveTab] = useState<"vocab" | "grammar">("vocab");
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderTitle, setReminderTitle] = useState("");

  const {
    useUserMemorizations,
    useCreateMemorization,
    useDeleteMemorization,
    useUpdateMemorization,
  } = useMemorizations();

  const searchParams = useMemo(() => {
    return {
      userId: user?.userId,
      page: 0,
      size: 50,
      content_type: activeTab === "vocab" ? Enums.ContentType.VOCABULARY : Enums.ContentType.FORMULA,
      keyword: searchQuery.length > 2 ? searchQuery : undefined
    };
  }, [activeTab, searchQuery, user?.userId]);

  const { data: notesData, isLoading, refetch } = useUserMemorizations(searchParams);
  const { mutate: createNote, isPending: isCreating } = useCreateMemorization();
  const { mutate: updateNote, isPending: isUpdating } = useUpdateMemorization();
  const { mutate: deleteNote } = useDeleteMemorization();

  const resetForm = () => {
    setEditingId(null);
    setNoteText("");
    setDefinition("");
    setExample("");
    setImageUrl("");
    setAudioUrl("");
    setIsReminderEnabled(false);
    setReminderTime("09:00");
    setReminderTitle("");
  };

  const openEdit = (item: MemorizationResponse) => {
    setEditingId(item.memorizationId);
    setNoteText(item.noteText);
    setDefinition(item.definition || "");
    setExample(item.example || "");
    setImageUrl(item.imageUrl || "");
    setAudioUrl(item.audioUrl || "");
    setIsReminderEnabled(item.reminderEnabled || false);
    setReminderTime(item.reminderTime || "09:00");
    setReminderTitle(item.reminderTitle || "");
    setShowAddModal(true);
  };

  const handleSave = () => {
    if (!noteText.trim() || !user?.userId) return;

    const payload: MemorizationRequest = {
      userId: user.userId,
      contentType: activeTab === "vocab" ? Enums.ContentType.VOCABULARY : Enums.ContentType.FORMULA,
      noteText: noteText.trim(),
      definition: definition.trim(),
      example: example.trim(),
      imageUrl: imageUrl.trim(),
      audioUrl: audioUrl.trim(),
      favorite: false,
      reminderEnabled: isReminderEnabled,
      reminderTime: isReminderEnabled ? reminderTime : undefined,
      reminderTitle: isReminderEnabled ? reminderTitle : undefined,
      repeatType: isReminderEnabled ? Enums.RepeatType.DAILY : undefined
    };

    if (editingId) {
      updateNote({ id: editingId, req: payload }, {
        onSuccess: () => { setShowAddModal(false); refetch(); }
      });
    } else {
      createNote(payload, {
        onSuccess: () => { setShowAddModal(false); resetForm(); refetch(); }
      });
    }
  };

  const mapNoteToQuestion = (note: MemorizationResponse): LessonQuestionResponse => ({
    lessonQuestionId: note.memorizationId,
    lessonId: "",
    question: note.noteText,
    questionType: Enums.QuestionType.MULTIPLE_CHOICE,
    skillType: Enums.SkillType.VOCABULARY,
    languageCode: "en",
    transcript: note.definition || undefined,
    correctOption: note.example || "",
    mediaUrl: note.imageUrl || undefined,
    weight: 1,
    orderIndex: 0,
    isDeleted: false,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    correctAnswer: "",
  });

  const renderVocabItem = useCallback(({ item }: { item: MemorizationResponse }) => (
    <View style={styles.flashcardWrapper}>
      <View style={styles.flashcardHeader}>
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => openEdit(item)}><Icon name="edit" size={20} color="#6B7280" /></TouchableOpacity>
          <TouchableOpacity onPress={() => deleteNote({ id: item.memorizationId, userId: user?.userId! })} style={{ marginLeft: 10 }}><Icon name="delete" size={20} color="#EF4444" /></TouchableOpacity>
        </View>
      </View>

      <VocabularyFlashcardView question={mapNoteToQuestion(item)} />

      {item.reminderEnabled && (
        <View style={styles.reminderTag}>
          <Icon name="alarm" size={14} color="#FFF" />
          <Text style={styles.reminderTagText}>{item.reminderTime} (Daily)</Text>
        </View>
      )}
    </View>
  ), [deleteNote]);

  const renderGrammarItem = useCallback(({ item }: { item: MemorizationResponse }) => (
    <View style={styles.grammarCard}>
      <View style={styles.grammarHeader}>
        <Text style={styles.grammarTitle}>{item.noteText}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => openEdit(item)}><Icon name="edit" size={18} color="#6B7280" /></TouchableOpacity>
          <TouchableOpacity onPress={() => deleteNote({ id: item.memorizationId, userId: user?.userId! })} style={{ marginLeft: 8 }}><Icon name="delete" size={18} color="#EF4444" /></TouchableOpacity>
        </View>
      </View>

      <View style={styles.grammarSection}>
        <Text style={styles.sectionLabel}>Usage/Rule:</Text>
        <Text style={styles.sectionContent}>{item.definition || "No rule defined"}</Text>
      </View>

      {item.example && (
        <View style={[styles.grammarSection, { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 }]}>
          <Text style={styles.sectionLabel}>Example:</Text>
          <Text style={[styles.sectionContent, { fontStyle: 'italic', color: '#4B5563' }]}>{item.example}</Text>
        </View>
      )}
    </View>
  ), [deleteNote]);

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notes.title") ?? "My Notebook"}</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowAddModal(true); }}><Icon name="add" size={28} color="#1F2937" /></TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === "vocab" && styles.activeTab]} onPress={() => setActiveTab("vocab")}>
          <Text style={[styles.tabText, activeTab === "vocab" && styles.activeTabText]}>Vocabulary (Flashcards)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "grammar" && styles.activeTab]} onPress={() => setActiveTab("grammar")}>
          <Text style={[styles.tabText, activeTab === "grammar" && styles.activeTabText]}>Grammar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#37352F" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={notesData?.content || []}
          renderItem={activeTab === "vocab" ? renderVocabItem : renderGrammarItem}
          keyExtractor={(item) => item.memorizationId}
          contentContainerStyle={styles.listContent}
          // Thêm các props tối ưu
          removeClippedSubviews={true}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No notes found in this category.</Text>
            </View>
          }
        />
      )}

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        {/* FIX QUAN TRỌNG:
            Thay đổi behavior: Chỉ dùng 'padding' cho iOS.
            Trên Android, để undefined vì Modal native của Android tự xử lý resize khi bàn phím hiện lên.
            Việc set behavior="height" trên Android + Modal + flex-end gây ra vòng lặp tính toán layout.
        */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? "Edit Note" : `Add ${activeTab === "vocab" ? "Vocabulary" : "Grammar"}`}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}><Icon name="close" size={24} color="#37352F" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{activeTab === "vocab" ? "Word / Phrase" : "Grammar Point"}</Text>
              <TextInput style={styles.input} value={noteText} onChangeText={setNoteText} placeholder="e.g. Hello / Present Simple" />

              <Text style={styles.label}>{activeTab === "vocab" ? "Meaning / Definition" : "Usage / Rule"}</Text>
              <TextInput style={[styles.input, { height: 60 }]} multiline value={definition} onChangeText={setDefinition} placeholder="Explain it here..." />

              <Text style={styles.label}>Example</Text>
              <TextInput style={styles.input} value={example} onChangeText={setExample} placeholder="Give an example sentence" />

              {activeTab === "vocab" && (
                <>
                  <Text style={styles.label}>Image (Optional)</Text>
                  {imageUrl ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: getDirectMediaUrl(imageUrl, 'IMAGE') }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setImageUrl("")}
                      >
                        <Icon name="close" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploaderContainer}>
                      <FileUploader onUploadSuccess={(url: string) => setImageUrl(url)}>
                        <View style={styles.uploadPlaceholder}>
                          <Icon name="add-photo-alternate" size={32} color="#9CA3AF" />
                          <Text style={styles.uploadPlaceholderText}>Tap to Upload Image</Text>
                        </View>
                      </FileUploader>
                    </View>
                  )}
                </>
              )}

              <View style={styles.reminderBox}>
                <View style={styles.reminderRow}>
                  <Text style={styles.reminderLabel}>Set Reminder</Text>
                  <Switch value={isReminderEnabled} onValueChange={setIsReminderEnabled} trackColor={{ true: "#37352F" }} />
                </View>
                {isReminderEnabled && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.smallLabel}>Time (24h format HH:mm)</Text>
                    <TextInput style={styles.smallInput} value={reminderTime} onChangeText={setReminderTime} placeholder="09:00" keyboardType="numbers-and-punctuation" />
                    <Text style={styles.smallLabel}>Reminder Message</Text>
                    <TextInput style={styles.smallInput} value={reminderTitle} onChangeText={setReminderTitle} placeholder="Review this note!" />
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Note</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  // ... Giữ nguyên styles cũ của bạn
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  tabContainer: { flexDirection: 'row', padding: 8, backgroundColor: '#FFF' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#37352F' },
  tabText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  activeTabText: { color: '#37352F' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', margin: 16, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 80 },
  flashcardWrapper: { marginBottom: 24 },
  flashcardHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  actionRow: { flexDirection: 'row' },
  reminderTag: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  reminderTagText: { color: '#FFF', fontSize: 10, marginLeft: 4, fontWeight: 'bold' },
  grammarCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  grammarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  grammarTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  grammarSection: { marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 },
  sectionContent: { fontSize: 15, color: '#374151', lineHeight: 22 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#F9FAFB' },
  reminderBox: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, marginTop: 20 },
  reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  smallLabel: { fontSize: 12, color: '#6B7280', marginTop: 8, marginBottom: 4 },
  smallInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, padding: 8 },
  saveBtn: { backgroundColor: '#37352F', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  imagePreviewContainer: { position: 'relative', marginBottom: 12, borderRadius: 8, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#E5E7EB' },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 12 },
  uploaderContainer: { marginBottom: 12 },
  uploadPlaceholder: { height: 120, borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  uploadPlaceholderText: { marginTop: 8, color: '#6B7280', fontSize: 14, fontWeight: '500' }
});

export default NotesScreen;