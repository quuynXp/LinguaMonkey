import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState, useRef } from "react";
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
  Animated,
  StyleSheet
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from 'react-i18next';
import { useFlashcards } from "../../hooks/useFlashcard";
import { useLessons } from "../../hooks/useLessons";
import { useUserStore } from "../../stores/UserStore";
import { createScaledSheet } from '../../utils/scaledStyles';
import { FlashcardResponse, CreateFlashcardRequest } from '../../types/dto';
import { getLessonImage } from '../../utils/imageUtil';
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
  const user = useUserStore((state) => state.user);

  const routeLessonId: string | null = route?.params?.lessonId ?? null;
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(routeLessonId);
  const [selectedLessonName, setSelectedLessonName] = useState<string>(route?.params?.lessonName || "");

  const { useGetFlashcards, useGetDue, useCreateFlashcard, useReviewFlashcard } = useFlashcards();
  const { useCreatorLessons } = useLessons();

  const userLessonsQuery = useCreatorLessons(user?.userId || null, 0, 100);
  const [page, setPage] = useState(0);

  // Pass userId to params to ensure backend (and frontend) contexts are aligned
  const flashcardsQuery = useGetFlashcards(selectedLessonId, {
    page,
    size: 100,
    userId: user?.userId
  });

  const dueQuery = useGetDue(selectedLessonId, 20);

  const { mutateAsync: createFlashcard, isPending: isCreating } = useCreateFlashcard();
  const { mutateAsync: reviewFlashcard, isPending: isReviewing } = useReviewFlashcard();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLessonSelector, setShowLessonSelector] = useState(false);

  // Study State
  const [isStudying, setIsStudying] = useState(false);
  const [studyList, setStudyList] = useState<FlashcardResponse[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Animation Refs
  const flipAnimation = useRef(new Animated.Value(0)).current;

  const [newCard, setNewCard] = useState<NewCardState>(initialNewCardState);

  useEffect(() => {
    if (route.params?.lessonId) {
      setSelectedLessonId(route.params.lessonId);
      setSelectedLessonName(route.params.lessonName);
      flashcardsQuery.refetch();
      dueQuery.refetch();
    }
  }, [route.params?.lessonId]);

  const allFlashcards = flashcardsQuery.data?.content || [];

  // Split Flashcards: My Cards vs Community Cards
  // This relies on FlashcardResponse having a userId field
  const { myCards, communityCards } = useMemo(() => {
    const mine: FlashcardResponse[] = [];
    const community: FlashcardResponse[] = [];

    if (!user?.userId) return { myCards: allFlashcards, communityCards: [] };

    allFlashcards.forEach(card => {
      // Logic: If I created it, it's mine. If not, it's community.
      // DTO now includes userId
      if (card.userId === user.userId) {
        mine.push(card);
      } else {
        community.push(card);
      }
    });
    return { myCards: mine, communityCards: community };
  }, [allFlashcards, user?.userId]);

  const filteredMyList = useMemo(() => {
    if (!searchQuery) return myCards;
    return myCards.filter(card =>
      card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [myCards, searchQuery]);

  const startStudySession = (list: FlashcardResponse[]) => {
    if (list.length === 0) {
      Alert.alert(t("flashcards.noCardsTitle") ?? "No Cards", t("flashcards.noCardsMessage") ?? "No cards available for study.");
      return;
    }
    setStudyList(list);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setIsStudying(true);
    flipAnimation.setValue(0);
  };

  const handlePressStudy = () => {
    if (!selectedLessonId) {
      Alert.alert("Select Lesson", "Please select a lesson first.");
      return;
    }
    // Prioritize Due cards, then All cards
    const listToStudy = (dueQuery.data && dueQuery.data.length > 0) ? dueQuery.data : allFlashcards;
    startStudySession(listToStudy);
  }

  const handlePressAddFlashcard = () => {
    const lessons = userLessonsQuery.data?.data || [];
    if (selectedLessonId) {
      setShowCreateModal(true);
      return;
    }
    if (userLessonsQuery.isLoading) return;

    if (lessons.length === 0) {
      Alert.alert(
        t("flashcards.noLessonTitle") ?? "No Lesson Found",
        t("flashcards.noLessonMessage") ?? "You need a lesson first.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Create Lesson",
            onPress: () => navigation.navigate("CreateLessonScreen")
          }
        ]
      );
    } else {
      setShowLessonSelector(true);
    }
  };

  const handleCreateCard = async () => {
    if (!selectedLessonId) return;
    if (!newCard.front || !newCard.back) {
      Alert.alert("Required", "Word and Definition are required.");
      return;
    }

    try {
      const payload: CreateFlashcardRequest = {
        lessonId: selectedLessonId,
        front: newCard.front,
        back: newCard.back,
        exampleSentence: newCard.exampleSentence,
        imageUrl: newCard.imageUrl,
        tags: newCard.tags,
        audioUrl: "",
        isPublic: newCard.isPublic,
      };

      await createFlashcard({ lessonId: selectedLessonId, payload });
      Alert.alert("Success", "Card created!");
      setNewCard(initialNewCardState);
      setShowCreateModal(false);
      flashcardsQuery.refetch();
    } catch (err) {
      Alert.alert("Error", "Failed to create card.");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setNewCard((prev) => ({ ...prev, imageUrl: result.assets[0].uri }));
    }
  };

  const flipCard = () => {
    if (showAnswer) return;
    Animated.spring(flipAnimation, {
      toValue: 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start(() => setShowAnswer(true));
  };

  const resetFlip = (callback: () => void) => {
    setShowAnswer(false);
    flipAnimation.setValue(0);
    callback();
  };

  const onPressQuality = async (q: number) => {
    if (!selectedLessonId) return;
    const currentCard = studyList[currentCardIndex];

    try {
      await reviewFlashcard({ lessonId: selectedLessonId, flashcardId: currentCard.flashcardId, quality: q });

      if (currentCardIndex < studyList.length - 1) {
        resetFlip(() => setCurrentCardIndex(prev => prev + 1));
      } else {
        setIsStudying(false);
        setStudyList([]);
        dueQuery.refetch();
        Alert.alert("Session Complete", "Great job!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Animation Interpolation
  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flipAnimation.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0]
  });
  const backOpacity = flipAnimation.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1]
  });

  const renderFlashcardItem = ({ item }: { item: FlashcardResponse }) => {
    const imageSource = getLessonImage(item.imageUrl);
    return (
      <View style={styles.flashcardItem}>
        <Image source={imageSource} style={styles.cardListImage} />
        <View style={styles.cardListContent}>
          <Text style={styles.cardWord}>{item.front}</Text>
          <Text style={styles.cardDefinition} numberOfLines={2}>{item.back}</Text>
        </View>
        <View style={styles.cardStatusStrip}>
          {item.nextReviewAt && new Date(item.nextReviewAt) < new Date() && (
            <View style={styles.dueDot} />
          )}
        </View>
      </View>
    );
  };

  if (isStudying) {
    const currentCard = studyList[currentCardIndex];
    if (!currentCard) { setIsStudying(false); return null; }

    const cardImage = getLessonImage(currentCard.imageUrl);

    return (
      <ScreenLayout style={styles.studyContainer}>
        <View style={styles.studyHeader}>
          <Text style={styles.progressText}>{currentCardIndex + 1} / {studyList.length}</Text>
          <TouchableOpacity onPress={() => setIsStudying(false)}>
            <Icon name="close" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity activeOpacity={1} style={styles.cardWrapper} onPress={flipCard}>
            {/* Front Side */}
            <Animated.View style={[styles.cardFace, styles.cardFront, { transform: [{ rotateY: frontInterpolate }], opacity: frontOpacity }]}>
              <Text style={styles.studyLabel}>QUESTION</Text>
              {currentCard.imageUrl && <Image source={cardImage} style={styles.studyImage} />}
              <Text style={styles.studyFrontText}>{currentCard.front}</Text>
              <Text style={styles.tapHint}>Tap to flip</Text>
            </Animated.View>

            {/* Back Side */}
            <Animated.View style={[styles.cardFace, styles.cardBack, { transform: [{ rotateY: backInterpolate }], opacity: backOpacity }]}>
              <Text style={styles.studyLabel}>ANSWER</Text>
              <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
                <Text style={styles.studyBackText}>{currentCard.back}</Text>
                {currentCard.exampleSentence && (
                  <View style={styles.exampleBox}>
                    <Text style={styles.studyExample}>{currentCard.exampleSentence}</Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {!showAnswer ? (
            <TouchableOpacity style={styles.showAnswerBtn} onPress={flipCard}>
              <Text style={styles.showAnswerText}>SHOW ANSWER</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.ankiButtons}>
              <TouchableOpacity style={[styles.ankiBtn, { backgroundColor: '#FF6B6B' }]} onPress={() => onPressQuality(1)}>
                <Text style={styles.ankiBtnLabel}>Again</Text>
                <Text style={styles.ankiBtnSub}>&lt; 1m</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ankiBtn, { backgroundColor: '#FF9800' }]} onPress={() => onPressQuality(3)}>
                <Text style={styles.ankiBtnLabel}>Hard</Text>
                <Text style={styles.ankiBtnSub}>2d</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ankiBtn, { backgroundColor: '#4ECDC4' }]} onPress={() => onPressQuality(4)}>
                <Text style={styles.ankiBtnLabel}>Good</Text>
                <Text style={styles.ankiBtnSub}>4d</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ankiBtn, { backgroundColor: '#4CAF50' }]} onPress={() => onPressQuality(5)}>
                <Text style={styles.ankiBtnLabel}>Easy</Text>
                <Text style={styles.ankiBtnSub}>7d</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>Flashcards</Text>
          <TouchableOpacity onPress={() => setShowLessonSelector(true)}>
            <Text style={styles.lessonNameText}>{selectedLessonName || "Select Lesson ▾"}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handlePressAddFlashcard}>
          <Icon name="add" size={28} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stats & Study Action */}
        <View style={styles.statsCard}>
          <View>
            <Text style={styles.statsLabel}>Due for Review</Text>
            <Text style={styles.statsValue}>{dueQuery.data?.length || 0}</Text>
          </View>
          <TouchableOpacity style={styles.studyBtn} onPress={handlePressStudy}>
            <Text style={styles.studyBtnText}>Study Now</Text>
            <Icon name="play-arrow" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* My Flashcards Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Flashcards ({myCards.length})</Text>
        </View>

        {flashcardsQuery.isLoading ? (
          <ActivityIndicator color="#4ECDC4" style={{ marginTop: 20 }} />
        ) : filteredMyList.length > 0 ? (
          filteredMyList.map(item => (
            <View key={item.flashcardId} style={{ marginBottom: 10 }}>
              {renderFlashcardItem({ item })}
            </View>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>You have no cards. Create one!</Text>
          </View>
        )}

        {/* Community Flashcards Section */}
        {communityCards.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Community Flashcards</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>Public</Text></View>
            </View>
            <Text style={styles.subHint}>Learn from others in this lesson</Text>

            {communityCards.map(item => (
              <View key={item.flashcardId} style={{ marginBottom: 10 }}>
                {renderFlashcardItem({ item })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modals remain mostly same but ensured cleanliness */}
      <Modal visible={showLessonSelector} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.selectorContainer}>
            <Text style={styles.modalTitle}>Select Lesson</Text>
            <FlatList
              data={userLessonsQuery.data?.data || []}
              keyExtractor={item => item.lessonId}
              style={{ maxHeight: 300, width: '100%' }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.lessonOption} onPress={() => {
                  setSelectedLessonId(item.lessonId);
                  setSelectedLessonName(item.lessonName);
                  setShowLessonSelector(false);
                  setTimeout(() => flashcardsQuery.refetch(), 100);
                }}>
                  <Text style={styles.lessonOptionText}>{item.lessonName}</Text>
                  {selectedLessonId === item.lessonId && <Icon name="check" size={20} color="#4ECDC4" />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.createNewOption} onPress={() => {
              setShowLessonSelector(false);
              navigation.navigate("CreateLessonScreen");
            }}>
              <Icon name="add" size={20} color="#4ECDC4" />
              <Text style={[styles.lessonOptionText, { color: '#4ECDC4', marginLeft: 8 }]}>Create New Lesson</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLessonSelector(false)} style={{ marginTop: 15 }}>
              <Text style={{ color: '#999' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Card</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}><Icon name="close" size={24} color="#333" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <TextInput style={styles.input} placeholder="Word (Front)" value={newCard.front} onChangeText={t => setNewCard({ ...newCard, front: t })} />
              <TextInput style={[styles.input, { height: 80 }]} placeholder="Definition (Back)" multiline value={newCard.back} onChangeText={t => setNewCard({ ...newCard, back: t })} />
              <TextInput style={styles.input} placeholder="Example Sentence" value={newCard.exampleSentence} onChangeText={t => setNewCard({ ...newCard, exampleSentence: t })} />
              <View style={styles.switchRow}>
                <Text>Public Card?</Text>
                <Switch value={newCard.isPublic} onValueChange={v => setNewCard({ ...newCard, isPublic: v })} trackColor={{ true: '#4ECDC4', false: '#eee' }} />
              </View>
              <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
                {newCard.imageUrl ? <Image source={{ uri: newCard.imageUrl }} style={{ width: '100%', height: 150, borderRadius: 8 }} /> : <Text>+ Add Image</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtnFull} onPress={handleCreateCard}>
                {isCreating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Create Card</Text>}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  studyContainer: { flex: 1, backgroundColor: "#2C3E50" },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
  title: { fontSize: 18, fontWeight: '700' },
  lessonNameText: { color: '#4ECDC4', fontWeight: '600', fontSize: 13 },
  scrollContent: { padding: 16 },

  statsCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statsLabel: { color: '#95A5A6', fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
  statsValue: { fontSize: 32, fontWeight: '700', color: '#333' },
  studyBtn: { backgroundColor: '#4ECDC4', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, flexDirection: 'row', alignItems: 'center' },
  studyBtnText: { color: '#FFF', fontWeight: '700', marginRight: 5 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2C3E50', marginRight: 10 },
  subHint: { fontSize: 13, color: '#7F8C8D', marginBottom: 10 },
  badge: { backgroundColor: '#D1F2EB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#16A085', fontSize: 10, fontWeight: '700' },

  flashcardItem: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  cardListImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#F0F3F4', marginRight: 12 },
  cardListContent: { flex: 1 },
  cardWord: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardDefinition: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  cardStatusStrip: { width: 10, alignItems: 'center' },
  dueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C' },
  emptyBox: { padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#BDC3C7', borderRadius: 12 },
  emptyText: { color: '#95A5A6' },

  // Study Mode Styles
  studyHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
  progressText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' },
  cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', perspective: 1000 },
  cardWrapper: { width: width - 40, height: 400 },
  cardFace: { position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', borderRadius: 20, padding: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  cardFront: { backgroundColor: '#FFF' },
  cardBack: { backgroundColor: '#ECF0F1' },
  studyLabel: { position: 'absolute', top: 20, fontSize: 12, fontWeight: '700', color: '#BDC3C7', letterSpacing: 1 },
  studyImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 20, backgroundColor: '#F5F5F5' },
  studyFrontText: { fontSize: 32, fontWeight: '700', color: '#2C3E50', textAlign: 'center' },
  studyBackText: { fontSize: 24, color: '#34495E', textAlign: 'center', lineHeight: 32 },
  studyExample: { fontSize: 16, color: '#7F8C8D', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  exampleBox: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#BDC3C7', paddingTop: 20, width: '100%' },
  tapHint: { position: 'absolute', bottom: 20, color: '#BDC3C7', fontSize: 12 },

  controlsContainer: { padding: 20, paddingBottom: 40 },
  showAnswerBtn: { backgroundColor: '#34495E', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  showAnswerText: { color: '#FFF', fontWeight: '700', letterSpacing: 1 },
  ankiButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  ankiBtn: { flex: 1, marginHorizontal: 4, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  ankiBtnLabel: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  ankiBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  selectorContainer: { width: '85%', backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
  lessonOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', flexDirection: 'row', justifyContent: 'space-between' },
  lessonOptionText: { fontSize: 16, color: '#333' },
  createNewOption: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingVertical: 10 },

  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  imageBtn: { height: 150, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  saveBtnFull: { backgroundColor: '#4ECDC4', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});

export default VocabularyFlashcardsScreen;