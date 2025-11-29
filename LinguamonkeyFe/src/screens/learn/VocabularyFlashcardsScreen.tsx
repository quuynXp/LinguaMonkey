import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from 'react-i18next';
import { useFlashcards } from "../../hooks/useFlashcard";
import { createScaledSheet } from '../../utils/scaledStyles';
import { FlashcardResponse, CreateFlashcardRequest } from '../../types/dto';
import ScreenLayout from '../../components/layout/ScreenLayout';

const { width } = Dimensions.get("window");

interface NewCardState {
  front: string;
  back: string;
  exampleSentence: string;
  imageUrl: string;
  tags: string;
  isPublic: boolean;
}

const initialNewCardState: NewCardState = {
  front: "",
  back: "",
  exampleSentence: "",
  imageUrl: "",
  tags: "",
  isPublic: false,
};

const VocabularyFlashcardsScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const lessonIdFromRoute: string | null = route?.params?.lessonId ?? null;

  // Hooks
  const { useGetFlashcards, useGetDue, useCreateFlashcard, useReviewFlashcard } = useFlashcards();

  // Queries
  // 1. Get ALL flashcards for this lesson (Public + Private) for the list view
  const [page, setPage] = useState(0);
  const flashcardsQuery = useGetFlashcards(lessonIdFromRoute, { page, size: 50 });

  // 2. Get DUE flashcards specifically for study session
  const dueQuery = useGetDue(lessonIdFromRoute, 20);

  // Mutations
  const { mutateAsync: createFlashcard, isPending: isCreating } = useCreateFlashcard();
  const { mutateAsync: reviewFlashcard, isPending: isReviewing } = useReviewFlashcard();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Study State
  const [studyMode, setStudyMode] = useState<"definition" | "image">("definition");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isStudying, setIsStudying] = useState(false);
  const [studyList, setStudyList] = useState<FlashcardResponse[]>([]);

  // Form State
  const [newCard, setNewCard] = useState<NewCardState>(initialNewCardState);

  // Filter logic for the List View (Client side filtering for search)
  const allFlashcards = flashcardsQuery.data?.content || [];

  const filteredList = useMemo(() => {
    if (!searchQuery) return allFlashcards;
    return allFlashcards.filter(card =>
      card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allFlashcards, searchQuery]);

  const startStudySession = (mode: "definition" | "image") => {
    // Prefer Due cards, but if empty, fall back to all cards
    const sourceList = (dueQuery.data && dueQuery.data.length > 0) ? dueQuery.data : allFlashcards;

    if (sourceList.length === 0) {
      Alert.alert(t("flashcards.noCardsTitle") ?? "No Cards", t("flashcards.noCardsMessage") ?? "No cards available for study.");
      return;
    }

    setStudyList(sourceList);
    setStudyMode(mode);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setIsStudying(true);
  };

  const handleCreateCard = async () => {
    if (!createFlashcard) return Alert.alert(t("common.error"), "Create API not available.");
    if (!lessonIdFromRoute) return Alert.alert(t("common.error"), t("flashcards.lessonIdMissing") ?? "Lesson ID is missing.");

    if (!newCard.front || !newCard.back) {
      Alert.alert(t("common.error"), t("flashcards.fillWordAndDefinition") ?? "Please fill in the word and definition.");
      return;
    }

    try {
      const payload: CreateFlashcardRequest = {
        lessonId: lessonIdFromRoute,
        front: newCard.front,
        back: newCard.back,
        exampleSentence: newCard.exampleSentence,
        imageUrl: newCard.imageUrl,
        tags: newCard.tags,
        audioUrl: "", // Handled by Backend/TTS usually
        isPublic: newCard.isPublic,
      };

      await createFlashcard({ lessonId: lessonIdFromRoute, payload });
      Alert.alert(t("common.success"), t("flashcards.createSuccess") ?? "Flashcard created successfully!");
      setNewCard(initialNewCardState);
      setShowCreateModal(false);
      flashcardsQuery.refetch();
    } catch (err) {
      Alert.alert(t("common.error"), t("flashcards.createFailed") ?? "Failed to create flashcard.");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t("flashcards.permissionDenied") ?? "Permission denied.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewCard((prev) => ({ ...prev, imageUrl: result.assets[0].uri }));
    }
  };

  const onPressQuality = async (flashcard: FlashcardResponse, q: number) => {
    if (!lessonIdFromRoute) return;

    try {
      await reviewFlashcard({ lessonId: lessonIdFromRoute, flashcardId: flashcard.flashcardId, quality: q });

      if (currentCardIndex < studyList.length - 1) {
        setCurrentCardIndex((prev) => prev + 1);
        setShowAnswer(false);
      } else {
        setIsStudying(false);
        setStudyList([]);
        dueQuery.refetch(); // Refresh due list
        Alert.alert(t("flashcards.reviewDoneTitle") ?? "Review Done", t("flashcards.reviewDoneMessage") ?? "Session complete!");
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t("common.error"), t("flashcards.reviewFailed") ?? "Review failed.");
    }
  };

  const renderFlashcardItem = ({ item }: { item: FlashcardResponse }) => {
    return (
      <View style={styles.flashcardItem}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardWord}>{item.front}</Text>
            <View style={styles.badgesRow}>
              {item.tags ? (
                <View style={styles.tagContainer}>
                  <Text style={styles.tagText}>{item.tags}</Text>
                </View>
              ) : null}
              {/* Public/Private Badge */}
              <View style={[styles.tagContainer, item.isPublic ? styles.publicBadge : styles.privateBadge]}>
                <Text style={[styles.tagText, item.isPublic ? styles.publicText : styles.privateText]}>
                  {item.isPublic ? "Public" : "Private"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.cardImage} /> : null}

        <Text style={styles.cardDefinition}>{item.back}</Text>
        {item.exampleSentence ? (
          <Text style={styles.cardExample}>{"{item.exampleSentence}"}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.lastReviewText}>
            {t("flashcards.nextReview")}: {new Date(item.nextReviewAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  // --- STUDY MODE RENDER ---
  if (isStudying) {
    const currentCard = studyList[currentCardIndex];

    if (!currentCard) {
      setIsStudying(false);
      return null;
    }

    return (
      <ScreenLayout style={styles.container}>
        <View style={styles.studyHeader}>
          <TouchableOpacity onPress={() => setIsStudying(false)}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.studyProgress}>
            {currentCardIndex + 1} / {studyList.length}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.studyCard}>
          {studyMode === "image" && currentCard.imageUrl ? (
            <View style={styles.studyContentWrap}>
              <Image source={{ uri: currentCard.imageUrl }} style={styles.studyImage} />
              <Text style={styles.studyPrompt}>{t("flashcards.imagePrompt") ?? "What is this word?"}</Text>
            </View>
          ) : (
            <View style={styles.studyContentWrap}>
              <Text style={styles.studyWord}>{currentCard.front}</Text>
              <Text style={styles.studyPrompt}>{t("flashcards.definitionPrompt") ?? "What is the definition?"}</Text>
            </View>
          )}

          {showAnswer && (
            <View style={styles.answerSection}>
              <Text style={styles.answerLabel}>{t("flashcards.answerLabel") ?? "Answer:"}</Text>
              {studyMode === "image" ? (
                <Text style={styles.answerText}>{currentCard.front}</Text>
              ) : (
                <Text style={styles.answerText}>{currentCard.back}</Text>
              )}
              {currentCard.exampleSentence && (
                <Text style={styles.exampleText}>{currentCard.exampleSentence}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.studyActions}>
          {!showAnswer ? (
            <TouchableOpacity style={styles.showAnswerButton} onPress={() => setShowAnswer(true)}>
              <Text style={styles.showAnswerText}>{t("flashcards.showAnswer") ?? "Show Answer"}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.qualityContainer}>
              <Text style={styles.rateText}>{t("flashcards.howWell") ?? "How well did you know this?"}</Text>
              <View style={styles.qualityButtonsRow}>
                {[1, 2, 3, 4, 5].map(q => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.qualityButton, isReviewing && styles.qualityButtonDisabled, { backgroundColor: getQualityColor(q) }]}
                    disabled={isReviewing}
                    onPress={() => onPressQuality(currentCard, q)}
                  >
                    <Text style={styles.qualityText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScreenLayout>
    );
  }

  // --- LIST VIEW RENDER ---
  return (
    <ScreenLayout style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("flashcards.title") ?? "Flashcards"}</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Icon name="add" size={28} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("flashcards.searchPlaceholder") ?? "Search..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Study Modes Section */}
      <View style={styles.studyModeSection}>
        <Text style={styles.sectionTitle}>
          {t("flashcards.study") ?? "Start Study Session"}
          <Text style={styles.dueCount}> ({dueQuery.data?.length ?? 0} due)</Text>
        </Text>
        <View style={styles.studyModeButtons}>
          <TouchableOpacity style={styles.studyModeButton} onPress={() => startStudySession("definition")}>
            <View style={[styles.iconCircle, { backgroundColor: '#E3FDFD' }]}>
              <Icon name="school" size={24} color="#4ECDC4" />
            </View>
            <Text style={styles.studyModeText}>{t("flashcards.review") ?? "Review"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.studyModeButton} onPress={() => startStudySession("image")}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFEAEA' }]}>
              <Icon name="image" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.studyModeText}>{t("flashcards.visual") ?? "Visual"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listHeaderContainer}>
        <Text style={styles.sectionTitle}>{t("flashcards.allCards") ?? "Lesson Vocabulary"}</Text>
      </View>

      {/* Main List */}
      {flashcardsQuery.isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
        </View>
      ) : (
        <FlatList
          data={filteredList}
          renderItem={renderFlashcardItem}
          keyExtractor={(item) => item.flashcardId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t("flashcards.empty") ?? "No flashcards found in this lesson."}</Text>
            </View>
          }
        />
      )}

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelButton}>{t("common.cancel") ?? "Cancel"}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t("flashcards.createTitle") ?? "New Flashcard"}</Text>
              <TouchableOpacity onPress={handleCreateCard} disabled={isCreating}>
                {isCreating ? (
                  <ActivityIndicator size="small" color="#4ECDC4" />
                ) : (
                  <Text style={styles.saveButton}>{t("common.save") ?? "Save"}</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("flashcards.form.word") ?? "Word / Term"} *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCard.front}
                  onChangeText={(text) => setNewCard((prev) => ({ ...prev, front: text }))}
                  placeholder="e.g. Hello"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("flashcards.form.definition") ?? "Definition / Meaning"} *</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={newCard.back}
                  onChangeText={(text) => setNewCard((prev) => ({ ...prev, back: text }))}
                  placeholder="e.g. Used as a greeting"
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("flashcards.form.example") ?? "Example Sentence"}</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={newCard.exampleSentence}
                  onChangeText={(text) => setNewCard((prev) => ({ ...prev, exampleSentence: text }))}
                  placeholder="e.g. Hello, how are you?"
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("flashcards.form.tags") ?? "Tags"}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCard.tags}
                  onChangeText={(text) => setNewCard((prev) => ({ ...prev, tags: text }))}
                  placeholder="e.g. greeting, basic, noun (comma separated)"
                />
              </View>

              {/* Public Toggle Switch */}
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>{t("flashcards.form.isPublic") ?? "Make Public?"}</Text>
                <Switch
                  value={newCard.isPublic}
                  onValueChange={(val) => setNewCard((prev) => ({ ...prev, isPublic: val }))}
                  trackColor={{ false: "#767577", true: "#4ECDC4" }}
                  thumbColor={newCard.isPublic ? "#FFFFFF" : "#f4f3f4"}
                />
              </View>
              <Text style={styles.switchHint}>
                {newCard.isPublic
                  ? t("flashcards.publicHint") ?? "Everyone in this lesson can see this card."
                  : t("flashcards.privateHint") ?? "Only you can see this card."}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("flashcards.form.image") ?? "Image"}</Text>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  {newCard.imageUrl ? (
                    <Image source={{ uri: newCard.imageUrl }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Icon name="add-a-photo" size={24} color="#666" />
                      <Text style={styles.imageButtonText}>{t("flashcards.form.addImage") ?? "Select Image"}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenLayout>
  );
};

const getQualityColor = (q: number) => {
  switch (q) {
    case 1: return "#FF6B6B"; // Hard
    case 2: return "#FF9800";
    case 3: return "#FFC107";
    case 4: return "#8BC34A";
    case 5: return "#4CAF50"; // Easy
    default: return "#E0E0E0";
  }
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  studyModeSection: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  listHeaderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  dueCount: {
    fontWeight: '400',
    color: '#FF6B6B',
    fontSize: 14
  },
  studyModeButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  studyModeButton: {
    flexDirection: 'row',
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 12,
    flex: 0.48,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  studyModeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  flashcardItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardWord: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4
  },
  tagContainer: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '500'
  },
  publicBadge: { backgroundColor: '#E3FDFD' },
  publicText: { color: '#0097A7' },
  privateBadge: { backgroundColor: '#FFEBEE' },
  privateText: { color: '#C62828' },

  cardImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F5F5F5'
  },
  cardDefinition: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
    marginBottom: 8,
  },
  cardExample: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#4ECDC4',
    paddingLeft: 8
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  lastReviewText: {
    fontSize: 12,
    color: "#999",
  },
  // Study Screen Styles
  studyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
  },
  studyProgress: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  studyCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  studyContentWrap: {
    alignItems: 'center',
    width: '100%',
  },
  studyImage: {
    width: width - 60,
    height: 220,
    borderRadius: 16,
    marginBottom: 20,
    resizeMode: 'contain'
  },
  studyWord: {
    fontSize: 34,
    fontWeight: "800",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
  },
  studyPrompt: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
  answerSection: {
    marginTop: 40,
    padding: 24,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  answerLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4ECDC4",
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  answerText: {
    fontSize: 20,
    color: "#333",
    marginBottom: 12,
    fontWeight: '500'
  },
  exampleText: {
    fontSize: 15,
    color: "#666",
    fontStyle: "italic",
    lineHeight: 22
  },
  studyActions: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  showAnswerButton: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  showAnswerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  qualityContainer: {
    alignItems: 'center',
    width: '100%'
  },
  rateText: {
    marginBottom: 12,
    color: '#666',
    fontSize: 14
  },
  qualityButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: '100%'
  },
  qualityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: "center",
  },
  qualityButtonDisabled: {
    opacity: 0.5,
  },
  qualityText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },
  cancelButton: {
    fontSize: 16,
    color: "#666"
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4ECDC4",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  switchHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 24,
    paddingHorizontal: 4
  },
  imageButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    paddingVertical: 30,
    borderRadius: 10
  },
  imageButtonText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#666",
    fontWeight: '500'
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    resizeMode: 'cover'
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyStateText: {
    color: '#999',
    textAlign: 'center',
    fontSize: 15
  }
});

export default VocabularyFlashcardsScreen;