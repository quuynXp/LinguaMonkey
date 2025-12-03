import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  Animated,
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
import { formatDistanceToNow } from 'date-fns';

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
  isPublic: true,
};

interface RouteParams {
  lessonId?: string;
  lessonName?: string;
}

const VocabularyFlashcardsScreen = ({ navigation, route }: { navigation: any, route: { params?: RouteParams } }) => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);

  // Params are now typed correctly via the component prop
  const params = route.params;
  const routeLessonId: string | null = params?.lessonId ?? null;
  const routeLessonName: string = params?.lessonName || "";

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(routeLessonId);
  const [selectedLessonName, setSelectedLessonName] = useState<string>(routeLessonName);

  // Tab State
  const [activeTab, setActiveTab] = useState<'my' | 'community'>('my');

  const {
    useGetMyFlashcards,
    useGetCommunityFlashcards,
    useGetDue,
    useCreateFlashcard,
    useReviewFlashcard,
    useClaimFlashcard
  } = useFlashcards();

  const { useCreatorLessons } = useLessons();
  const userLessonsQuery = useCreatorLessons(user?.userId || null, 0, 100);

  // Queries
  const myCardsQuery = useGetMyFlashcards(selectedLessonId, { page: 0, size: 100 });
  const communityCardsQuery = useGetCommunityFlashcards(selectedLessonId, { page: 0, size: 50, sort: 'popular' });
  const dueQuery = useGetDue(selectedLessonId, 20);

  const { mutateAsync: createFlashcard, isPending: isCreating } = useCreateFlashcard();
  const { mutateAsync: reviewFlashcard } = useReviewFlashcard();
  const { mutateAsync: claimFlashcard, isPending: isClaiming } = useClaimFlashcard();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLessonSelector, setShowLessonSelector] = useState(false);

  // Study State
  const [isStudying, setIsStudying] = useState(false);
  const [studyList, setStudyList] = useState<FlashcardResponse[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  const [newCard, setNewCard] = useState<NewCardState>(initialNewCardState);

  useEffect(() => {
    if (params?.lessonId) {
      setSelectedLessonId(params.lessonId);
      setSelectedLessonName(params.lessonName || "");
    }
  }, [params?.lessonId, params?.lessonName]);

  const startStudySession = (list: FlashcardResponse[]) => {
    if (list.length === 0) {
      Alert.alert(t("flashcards.noCardsTitle") ?? "No Cards", "No cards available for study.");
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
    const listToStudy = (dueQuery.data && dueQuery.data.length > 0) ? dueQuery.data : (myCardsQuery.data?.content || []);
    startStudySession(listToStudy);
  }

  const handleClaim = async (card: FlashcardResponse) => {
    if (!selectedLessonId) return;
    try {
      await claimFlashcard({ lessonId: selectedLessonId, flashcardId: card.flashcardId });
      Alert.alert("Success", "Card added to your collection!");
    } catch (e) {
      Alert.alert("Error", "Failed to claim card.");
    }
  }

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

  // --- Study Logic ---
  const flipCard = () => {
    if (showAnswer) return;
    Animated.spring(flipAnimation, {
      toValue: 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start(() => setShowAnswer(true));
  };

  const onPressQuality = async (q: number) => {
    if (!selectedLessonId) return;
    const currentCard = studyList[currentCardIndex];
    try {
      await reviewFlashcard({ lessonId: selectedLessonId, flashcardId: currentCard.flashcardId, quality: q });
      if (currentCardIndex < studyList.length - 1) {
        setShowAnswer(false);
        flipAnimation.setValue(0);
        setCurrentCardIndex(prev => prev + 1);
      } else {
        setIsStudying(false);
        setStudyList([]);
        Alert.alert("Session Complete", "Great job!");
      }
    } catch (err) { console.error(err); }
  };

  // --- Renderers ---
  const renderMyCard = ({ item }: { item: FlashcardResponse }) => {
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

  const renderCommunityCard = ({ item }: { item: FlashcardResponse }) => {
    const imageSource = getLessonImage(item.imageUrl);
    const avatarSource = item.authorProfile?.avatarUrl ? { uri: item.authorProfile.avatarUrl } : require('../../assets/images/default-avatar.png');

    return (
      <View style={styles.communityCardItem}>
        <View style={styles.communityHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={avatarSource} style={styles.authorAvatar} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.authorName}>{item.authorProfile?.fullname || "Unknown"}</Text>
              <Text style={styles.authorTime}>{formatDistanceToNow(new Date(item.createdAt))} ago</Text>
            </View>
          </View>
          <View style={styles.claimsBadge}>
            <Icon name="file-download" size={14} color="#16A085" />
            <Text style={styles.claimsText}>{item.claimCount || 0}</Text>
          </View>
        </View>

        <View style={styles.communityBody}>
          <Image source={imageSource} style={styles.communityImage} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.communityWord}>{item.front}</Text>
            <Text style={styles.communityDef}>{item.back}</Text>
            <Text style={styles.communityLessonName} numberOfLines={1}>Lesson: {selectedLessonName}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.claimButton}
          onPress={() => handleClaim(item)}
          disabled={isClaiming || item.userId === user?.userId}
        >
          {item.userId === user?.userId ? (
            <Text style={styles.claimButtonTextOwner}>Owner</Text>
          ) : (
            <>
              <Icon name="add-circle-outline" size={18} color="#FFF" />
              <Text style={styles.claimButtonText}>Claim Card</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // --- Animation Interpolation ---
  const frontInterpolate = flipAnimation.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnimation.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnimation.interpolate({ inputRange: [89, 90], outputRange: [1, 0] });
  const backOpacity = flipAnimation.interpolate({ inputRange: [89, 90], outputRange: [0, 1] });

  // --- Study Mode View ---
  if (isStudying) {
    const currentCard = studyList[currentCardIndex];
    if (!currentCard) { setIsStudying(false); return null; }
    return (
      <ScreenLayout style={styles.studyContainer}>
        <View style={styles.studyHeader}>
          <Text style={styles.progressText}>{currentCardIndex + 1} / {studyList.length}</Text>
          <TouchableOpacity onPress={() => setIsStudying(false)}>
            <Icon name="close" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity activeOpacity={1} style={styles.cardWrapper} onPress={flipCard}>
          <Animated.View style={[styles.cardFace, styles.cardFront, { transform: [{ rotateY: frontInterpolate }], opacity: frontOpacity }]}>
            <Text style={styles.studyLabel}>QUESTION</Text>
            <Text style={styles.studyFrontText}>{currentCard.front}</Text>
          </Animated.View>
          <Animated.View style={[styles.cardFace, styles.cardBack, { transform: [{ rotateY: backInterpolate }], opacity: backOpacity }]}>
            <Text style={styles.studyLabel}>ANSWER</Text>
            <Text style={styles.studyBackText}>{currentCard.back}</Text>
          </Animated.View>
        </TouchableOpacity>
        <View style={styles.controlsContainer}>
          {!showAnswer ? (
            <TouchableOpacity style={styles.showAnswerBtn} onPress={flipCard}><Text style={styles.showAnswerText}>SHOW ANSWER</Text></TouchableOpacity>
          ) : (
            <View style={styles.ankiButtons}>
              <TouchableOpacity style={[styles.ankiBtn, { backgroundColor: '#FF6B6B' }]} onPress={() => onPressQuality(1)}><Text style={styles.ankiBtnLabel}>Again</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.ankiBtn, { backgroundColor: '#4CAF50' }]} onPress={() => onPressQuality(5)}><Text style={styles.ankiBtnLabel}>Easy</Text></TouchableOpacity>
            </View>
          )}
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>Flashcards</Text>
          <TouchableOpacity onPress={() => setShowLessonSelector(true)}>
            <Text style={styles.lessonNameText}>{selectedLessonName || "Select Lesson ▾"}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}><Icon name="add" size={28} color="#4ECDC4" /></TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'my' && styles.activeTab]} onPress={() => setActiveTab('my')}>
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>My Deck</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'community' && styles.activeTab]} onPress={() => setActiveTab('community')}>
          <Text style={[styles.tabText, activeTab === 'community' && styles.activeTabText]}>Community</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'my' ? (
          <>
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
            {myCardsQuery.isLoading ? <ActivityIndicator color="#4ECDC4" /> : (
              <FlatList
                data={myCardsQuery.data?.content || []}
                renderItem={renderMyCard}
                keyExtractor={item => item.flashcardId}
                ListEmptyComponent={<Text style={styles.emptyText}>No cards yet. Create one or claim from community!</Text>}
              />
            )}
          </>
        ) : (
          <>
            {communityCardsQuery.isLoading ? <ActivityIndicator color="#4ECDC4" /> : (
              <FlatList
                data={communityCardsQuery.data?.content || []}
                renderItem={renderCommunityCard}
                keyExtractor={item => item.flashcardId}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No community cards found.</Text>}
              />
            )}
          </>
        )}
      </View>

      {/* Modals: Lesson Selector & Create Card */}
      <Modal visible={showLessonSelector} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.selectorContainer}>
            <FlatList data={userLessonsQuery.data?.data || []} keyExtractor={i => i.lessonId} renderItem={({ item }) => (
              <TouchableOpacity style={styles.lessonOption} onPress={() => { setSelectedLessonId(item.lessonId); setSelectedLessonName(item.lessonName); setShowLessonSelector(false); }}>
                <Text>{item.lessonName}</Text>
              </TouchableOpacity>
            )} />
            <TouchableOpacity onPress={() => setShowLessonSelector(false)} style={{ padding: 15, alignItems: 'center' }}><Text>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Card</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}><Icon name="close" size={24} color="#333" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <TextInput style={styles.input} placeholder="Front" value={newCard.front} onChangeText={t => setNewCard({ ...newCard, front: t })} />
            <TextInput style={styles.input} placeholder="Back" value={newCard.back} onChangeText={t => setNewCard({ ...newCard, back: t })} />
            <View style={styles.switchRow}>
              <Text>Public (Community)?</Text>
              <Switch value={newCard.isPublic} onValueChange={v => setNewCard({ ...newCard, isPublic: v })} />
            </View>
            <TouchableOpacity style={styles.saveBtnFull} onPress={handleCreateCard}>
              {isCreating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Create</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
  title: { fontSize: 18, fontWeight: '700' },
  lessonNameText: { color: '#4ECDC4', fontWeight: '600', fontSize: 13 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 16, paddingBottom: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#4ECDC4' },
  tabText: { color: '#95A5A6', fontWeight: '600' },
  activeTabText: { color: '#4ECDC4' },

  content: { flex: 1, padding: 16 },

  // My Card Styles
  statsCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 16 },
  statsLabel: { color: '#95A5A6', fontSize: 12, fontWeight: '700' },
  statsValue: { fontSize: 32, fontWeight: '700', color: '#333' },
  studyBtn: { backgroundColor: '#4ECDC4', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, flexDirection: 'row', alignItems: 'center' },
  studyBtnText: { color: '#FFF', fontWeight: '700', marginRight: 5 },
  flashcardItem: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8 },
  cardListImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#F0F3F4', marginRight: 12 },
  cardListContent: { flex: 1 },
  cardWord: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardDefinition: { fontSize: 13, color: '#7F8C8D' },
  cardStatusStrip: { width: 10, alignItems: 'center' },
  dueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C' },

  // Community Card Styles
  communityCardItem: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  communityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  authorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee' },
  authorName: { fontSize: 14, fontWeight: '600', color: '#333' },
  authorTime: { fontSize: 11, color: '#95A5A6' },
  claimsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F8F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  claimsText: { fontSize: 12, fontWeight: '700', color: '#16A085', marginLeft: 4 },
  communityBody: { flexDirection: 'row', marginBottom: 12 },
  communityImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F0F3F4' },
  communityWord: { fontSize: 16, fontWeight: '700', color: '#2C3E50' },
  communityDef: { fontSize: 14, color: '#7F8C8D', marginBottom: 4 },
  communityLessonName: { fontSize: 11, color: '#95A5A6', fontStyle: 'italic' },
  claimButton: { backgroundColor: '#4ECDC4', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  claimButtonText: { color: '#FFF', fontWeight: '700', marginLeft: 6 },
  claimButtonTextOwner: { color: '#FFF', fontWeight: '700', opacity: 0.7 },

  emptyText: { textAlign: 'center', marginTop: 20, color: '#95A5A6' },

  // Study Mode
  studyContainer: { flex: 1, backgroundColor: "#2C3E50" },
  studyHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
  progressText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  cardWrapper: { alignItems: 'center', marginTop: 50 },
  cardFace: { width: width - 40, height: 400, backgroundColor: '#FFF', borderRadius: 20, padding: 24, justifyContent: 'center', alignItems: 'center', position: 'absolute', backfaceVisibility: 'hidden' },
  cardFront: {},
  cardBack: { backgroundColor: '#ECF0F1' },
  studyLabel: { position: 'absolute', top: 20, fontSize: 12, fontWeight: '700', color: '#BDC3C7' },
  studyFrontText: { fontSize: 32, fontWeight: '700', color: '#2C3E50', textAlign: 'center' },
  studyBackText: { fontSize: 24, color: '#34495E', textAlign: 'center' },
  controlsContainer: { position: 'absolute', bottom: 40, left: 20, right: 20 },
  showAnswerBtn: { backgroundColor: '#34495E', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  showAnswerText: { color: '#FFF', fontWeight: '700' },
  ankiButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  ankiBtn: { flex: 1, marginHorizontal: 4, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  ankiBtnLabel: { color: '#FFF', fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  selectorContainer: { width: '80%', maxHeight: '50%', backgroundColor: '#FFF', borderRadius: 12 },
  lessonOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saveBtnFull: { backgroundColor: '#4ECDC4', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700' }
});

export default VocabularyFlashcardsScreen;