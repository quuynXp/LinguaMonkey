import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFlashcards } from "../../hooks/useFlashcard"; 

const { width } = Dimensions.get("window")

// API shape (mở rộng nếu cần)
interface Flashcard {
  id: string
  lessonId?: string
  word: string
  definition: string
  example?: string
  image?: string
  isPublic?: boolean
  likes?: number
  isFavorite?: boolean
  isLiked?: boolean
  author?: string
  difficulty?: "beginner" | "intermediate" | "advanced"
  category?: string
  nextReviewAt?: string
}

const VocabularyFlashcardsScreen = ({ navigation, route }: any) => {
  const lessonIdFromRoute: string | null = route?.params?.lessonId ?? null;
  const limit = 50;

  const { useGetDue, useCreateFlashcard, useReviewFlashcard } = useFlashcards();
  const dueQuery = useGetDue(lessonIdFromRoute, limit);
  const { reviewFlashcard, isReviewing } = useReviewFlashcard();
  const { createFlashcard } = useCreateFlashcard ? useCreateFlashcard() : { createFlashcard: undefined };

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [studyMode, setStudyMode] = useState<"definition" | "image">("definition")
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isStudying, setIsStudying] = useState(false)

  const [newCard, setNewCard] = useState({
    word: "",
    definition: "",
    example: "",
    image: "",
    isPublic: true,
    difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
    category: "General",
  })

  const apiFlashcards: Flashcard[] = dueQuery.data ?? [];

  const filteredFlashcards = useMemo(() => {
    return apiFlashcards.filter((card) => {
      const matchesSearch =
        card.word?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (card.definition ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "All" || (card.category ?? "General") === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [apiFlashcards, searchQuery, selectedCategory])

  useEffect(() => {
    if (currentCardIndex >= filteredFlashcards.length && filteredFlashcards.length > 0) {
      setCurrentCardIndex(0)
    }
  }, [filteredFlashcards.length])

  const startStudySession = (mode: "definition" | "image") => {
    if (filteredFlashcards.length === 0) {
      Alert.alert("No Cards", "No flashcards available for study")
      return
    }
    setStudyMode(mode)
    setCurrentCardIndex(0)
    setShowAnswer(false)
    setIsStudying(true)
  }

  const nextCard = () => {
    if (currentCardIndex < filteredFlashcards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1)
      setShowAnswer(false)
    } else {
      setIsStudying(false)
      Alert.alert("Study Complete", "You've reviewed all flashcards!")
    }
  }

  const handleCreateCardLocal = () => {
    if (!newCard.word || !newCard.definition) {
      Alert.alert("Error", "Please fill in word and definition")
      return
    }
    Alert.alert("Success", "Flashcard created locally. Implement server create if needed.")
    setShowCreateModal(false)
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setNewCard((prev) => ({ ...prev, image: result.assets[0].uri }));
    }
  };

  const onPressQuality = async (flashcard: Flashcard, q: number) => {
    try {
      await reviewFlashcard({ flashcardId: flashcard.id, quality: q });
      await dueQuery.refetch();
      if (isStudying) {
        if (currentCardIndex < filteredFlashcards.length - 1) {
          setCurrentCardIndex((prev) => prev + 1);
          setShowAnswer(false);
        } else {
          setIsStudying(false);
          Alert.alert("Done", "Finished reviewing available cards.");
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Review failed. Try again.");
    }
  }

  const renderFlashcard = ({ item }: { item: Flashcard }) => (
    <View style={styles.flashcardItem}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardWord}>{item.word}</Text>
          <Text style={styles.cardAuthor}>by {item.author ?? "Unknown"}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => Alert.alert("Favorite", "Implement favorite API if needed")}>
            <Icon
              name={item.isFavorite ? "favorite" : "favorite-border"}
              size={24}
              color={item.isFavorite ? "#FF6B6B" : "#666"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert("Like", "Implement like API if needed")} style={styles.likeButton}>
            <Icon
              name={item.isLiked ? "thumb-up" : "thumb-up-off-alt"}
              size={20}
              color={item.isLiked ? "#4ECDC4" : "#666"}
            />
            <Text style={styles.likeCount}>{item.likes ?? 0}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {item.image && <Image source={{ uri: item.image }} style={styles.cardImage} />}

      <Text style={styles.cardDefinition}>{item.definition}</Text>
      {item.example && <Text style={styles.cardExample}>Example: {item.example}</Text>}

      <View style={styles.cardFooter}>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty ?? "beginner") }]}>
          <Text style={styles.difficultyText}>{item.difficulty ?? "beginner"}</Text>
        </View>
        <Text style={styles.categoryText}>{item.category ?? "General"}</Text>
      </View>
    </View>
  )

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "#4CAF50"
      case "intermediate":
        return "#FF9800"
      case "advanced":
        return "#F44336"
      default:
        return "#9E9E9E"
    }
  }

  if (isStudying) {
    if (dueQuery.isLoading) {
      return (
        <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" />
        </SafeAreaView>
      );
    }

    const currentCard = filteredFlashcards[currentCardIndex];
    if (!currentCard) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.studyHeader}>
            <TouchableOpacity onPress={() => setIsStudying(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.studyProgress}>0 / 0</Text>
            <View />
          </View>
          <View style={styles.studyCard}>
            <Text>No cards available</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.studyHeader}>
          <TouchableOpacity onPress={() => setIsStudying(false)}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.studyProgress}>
            {currentCardIndex + 1} / {filteredFlashcards.length}
          </Text>
          <View />
        </View>

        <View style={styles.studyCard}>
          {studyMode === "image" && currentCard.image ? (
            <View>
              <Image source={{ uri: currentCard.image }} style={styles.studyImage} />
              <Text style={styles.studyPrompt}>What word does this image represent?</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.studyWord}>{currentCard.word}</Text>
              <Text style={styles.studyPrompt}>What does this word mean?</Text>
            </View>
          )}

          {showAnswer && (
            <View style={styles.answerSection}>
              <Text style={styles.answerLabel}>Answer:</Text>
              {studyMode === "image" ? (
                <Text style={styles.answerText}>{currentCard.word}</Text>
              ) : (
                <Text style={styles.answerText}>{currentCard.definition}</Text>
              )}
              {currentCard.example && <Text style={styles.exampleText}>Example: {currentCard.example}</Text>}
            </View>
          )}
        </View>

        <View style={styles.studyActions}>
          {!showAnswer ? (
            <TouchableOpacity style={styles.showAnswerButton} onPress={() => setShowAnswer(true)}>
              <Text style={styles.showAnswerText}>Show Answer</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.qualityButtonsRow}>
                {[0, 1, 2, 3, 4, 5].map(q => (
                  <TouchableOpacity
                    key={q}
                    style={styles.qualityButton}
                    disabled={isReviewing}
                    onPress={() => onPressQuality(currentCard, q)}
                  >
                    <Text style={styles.qualityText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.nextButton} onPress={nextCard}>
                <Text style={styles.nextButtonText}>Skip</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    )
  }

  // MAIN LIST VIEW
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Vocabulary Flashcards</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Icon name="add" size={24} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search flashcards..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {["All", "General", "Academic", "Business", "Travel", "Technology"].map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryChip, selectedCategory === category && styles.selectedCategoryChip]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[styles.categoryChipText, selectedCategory === category && styles.selectedCategoryChipText]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.studyModeSection}>
        <Text style={styles.sectionTitle}>Study Modes</Text>
        <View style={styles.studyModeButtons}>
          <TouchableOpacity style={styles.studyModeButton} onPress={() => startStudySession("definition")}>
            <Icon name="quiz" size={24} color="#4ECDC4" />
            <Text style={styles.studyModeText}>Definition Study</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.studyModeButton} onPress={() => startStudySession("image")}>
            <Icon name="image" size={24} color="#FF6B6B" />
            <Text style={styles.studyModeText}>Image Study</Text>
          </TouchableOpacity>
        </View>
      </View>

      {dueQuery.isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : dueQuery.isError ? (
        <View style={{ padding: 20 }}>
          <Text>Error loading flashcards</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFlashcards}
          renderItem={renderFlashcard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flashcardsList}
        />
      )}

      <Modal visible={showCreateModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Flashcard</Text>
            <TouchableOpacity onPress={handleCreateCardLocal}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* ... same inputs as before ... */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Word *</Text>
              <TextInput
                style={styles.textInput}
                value={newCard.word}
                onChangeText={(text) => setNewCard((prev) => ({ ...prev, word: text }))}
                placeholder="Enter word"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Definition *</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={newCard.definition}
                onChangeText={(text) => setNewCard((prev) => ({ ...prev, definition: text }))}
                placeholder="Enter definition"
                multiline
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Image (Optional)</Text>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Icon name="add-a-photo" size={24} color="#666" />
                <Text style={styles.imageButtonText}>Add Image</Text>
              </TouchableOpacity>
              {newCard.image && <Image source={{ uri: newCard.image }} style={styles.previewImage} />}
            </View>

            {/* rest of inputs omitted for brevity; keep from your original file */}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
    fontWeight: "600",
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
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  categoryScroll: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
  },
  categoryChip: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    marginLeft: 15,
  },
  selectedCategoryChip: {
    backgroundColor: "#4ECDC4",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedCategoryChipText: {
    color: "#FFFFFF",
  },
  studyModeSection: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  studyModeButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  studyModeButton: {
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 12,
    flex: 0.45,
  },
  studyModeText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  qualityButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  qualityButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  qualityText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  flashcardsList: {
    padding: 20,
  },
  flashcardItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardWord: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  cardAuthor: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 15,
  },
  likeCount: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  cardImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardDefinition: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 8,
  },
  cardExample: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  categoryText: {
    fontSize: 12,
    color: "#666",
  },
  studyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
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
    padding: 30,
  },
  studyImage: {
    width: width - 60,
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  studyWord: {
    fontSize: 32,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  studyPrompt: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  answerSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    width: "100%",
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4ECDC4",
    marginBottom: 8,
  },
  answerText: {
    fontSize: 18,
    color: "#333",
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  studyActions: {
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  showAnswerButton: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  showAnswerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "#45B7D1",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4ECDC4",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingVertical: 15,
    borderStyle: "dashed",
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  previewImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginTop: 10,
  },
  difficultyButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  difficultyButton: {
    flex: 0.3,
    backgroundColor: "#F0F0F0",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  selectedDifficultyButton: {
    backgroundColor: "#4ECDC4",
  },
  difficultyButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedDifficultyButtonText: {
    color: "#FFFFFF",
  },
  categoryButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryButton: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
    minWidth: "30%",
    alignItems: "center",
  },
  selectedCategoryButton: {
    backgroundColor: "#4ECDC4",
  },
  categoryButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  selectedCategoryButtonText: {
    color: "#FFFFFF",
  },
  switchGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  switch: {
    width: 50,
    height: 30,
    backgroundColor: "#E0E0E0",
    borderRadius: 15,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: "#4ECDC4",
  },
  switchThumb: {
    width: 26,
    height: 26,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
})

export default VocabularyFlashcardsScreen
