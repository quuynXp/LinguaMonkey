import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Dimensions,
  Alert
} from 'react-native';
import Video from 'react-native-video';
import { WebView } from 'react-native-webview';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBasicLessons } from '../../hooks/useBasicLessons';
import { BasicLessonResponse } from '../../types/dto';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useUserStore } from '../../stores/UserStore';
import RNFS from 'react-native-fs';

interface Props {
  navigation: any;
}

const { width } = Dimensions.get('window');

const IPAScreen: React.FC<Props> = ({ navigation }) => {
  const { languages } = useUserStore();
  const [selectedLang, setSelectedLang] = useState<string>(languages?.[0] || 'en');
  const [selectedType, setSelectedType] = useState<string>('IPA');

  const { useBasicLessonsList, useEnrichBasicLesson, useCheckPronunciation } = useBasicLessons();
  const { data: pageData, isLoading: loadingList, error, refetch } = useBasicLessonsList(selectedLang, selectedType, 0, 100);
  const enrichMutation = useEnrichBasicLesson();
  const checkPronunciationMutation = useCheckPronunciation();

  const items = (pageData?.content || []) as BasicLessonResponse[];

  const [selected, setSelected] = useState<BasicLessonResponse | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [tabAnim] = useState(new Animated.Value(0));
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const audioPlayerRef = useRef(AudioRecorderPlayer);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');
  const [feedback, setFeedback] = useState<{ score: number; text: string } | null>(null);
  const [processingAudio, setProcessingAudio] = useState(false);

  useEffect(() => {
    return () => {
      audioPlayerRef.current.stopPlayer();
      audioPlayerRef.current.removePlayBackListener();
    };
  }, []);

  useEffect(() => {
    refetch();
  }, [selectedLang, refetch]);

  const playSound = async (url?: string) => {
    if (!url) return;
    try {
      await audioPlayerRef.current.stopPlayer();
      await audioPlayerRef.current.startPlayer(url);
      audioPlayerRef.current.addPlayBackListener((e) => {
        if (e.currentPosition === e.duration) {
          audioPlayerRef.current.stopPlayer();
        }
      });
    } catch (err) {
      console.log('Audio play error', err);
    }
  };

  const handleItemPress = async (item: BasicLessonResponse) => {
    setSelected(item);
    setFeedback(null);
    fadeIn();

    if (!item.pronunciationAudioUrl || !item.videoUrl) {
      setEnriching(true);
      try {
        const enrichedData = await enrichMutation.mutateAsync(item.id);
        setSelected(enrichedData);
        if (enrichedData.pronunciationAudioUrl) {
          setTimeout(() => playSound(enrichedData.pronunciationAudioUrl), 500);
        }
      } catch (err) {
        console.error("Enrichment failed", err);
      } finally {
        setEnriching(false);
      }
    } else {
      setTimeout(() => playSound(item.pronunciationAudioUrl), 500);
    }
  };

  const handleCloseModal = async () => {
    try {
      await audioPlayerRef.current.stopPlayer();
    } catch (e) { }
    setSelected(null);
    setFeedback(null);
    setEnriching(false);
  };

  const fadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const onStartRecord = async () => {
    setFeedback(null);
    setIsRecording(true);
    try {
      await audioPlayerRef.current.startRecorder();
      audioPlayerRef.current.addRecordBackListener((e) => {
        setRecordTime(audioPlayerRef.current.mmssss(Math.floor(e.currentPosition)));
      });
    } catch (err) {
      console.error('Start record error', err);
      setIsRecording(false);
    }
  };

  const onStopRecord = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setProcessingAudio(true);
    try {
      const result = await audioPlayerRef.current.stopRecorder();
      audioPlayerRef.current.removeRecordBackListener();
      setRecordTime('00:00');

      const fileContent = await RNFS.readFile(result, 'base64');

      if (selected) {
        const response = await checkPronunciationMutation.mutateAsync({
          audioBase64: fileContent,
          referenceText: selected.symbol,
          language: selected.languageCode
        });

        setFeedback({
          score: response.score,
          text: response.feedback
        });
      }
    } catch (err) {
      console.error('Stop record error', err);
      Alert.alert('Error', 'Failed to process recording.');
    } finally {
      setProcessingAudio(false);
    }
  };

  const renderVideoContent = (item: BasicLessonResponse) => {
    if (item.videoUrl && item.videoUrl.endsWith('.mp4')) {
      return (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: item.videoUrl }}
            style={styles.video}
            resizeMode="cover"
            controls={true}
            paused={true}
          />
        </View>
      );
    }

    let webUrl = item.videoUrl;
    if (!webUrl) {
      webUrl = `https://www.youtube.com/embed?listType=search&list=pronounce ${item.symbol} in ${item.languageCode}`;
    } else if (webUrl.includes('youtube.com') || webUrl.includes('youtu.be')) {
      if (!webUrl.includes('embed')) {
        const videoId = webUrl.split('v=')[1];
        if (videoId) webUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    return (
      <View style={styles.videoContainer}>
        <WebView
          source={{ uri: webUrl }}
          style={styles.video}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsFullscreenVideo={true}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4ECDC4', '#2E8BC0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Basic Pronunciation</Text>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {languages.map((lang: any) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => setSelectedLang(lang.code)}
              style={[styles.tabItem, selectedLang === lang.code && styles.tabItemSelected]}
            >
              <Text style={[styles.tabText, selectedLang === lang.code && styles.tabTextSelected]}>
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loadingList ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color="#4ECDC4" /></View>
      ) : error ? (
        <View style={styles.centerContainer}><Text>Failed to load lessons.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.gridContainer}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id || index}
              style={styles.card}
              onPress={() => handleItemPress(item)}
            >
              <Text style={styles.cardSymbol}>{item.symbol}</Text>
              <Text style={styles.cardRomanization}>{item.romanization || '-'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!selected} transparent onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
            {enriching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4ECDC4" />
                <Text style={styles.loadingText}>AI is generating content...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.modalScrollContent}>

                <Text style={styles.modalSymbol}>{selected?.symbol}</Text>
                <Text style={styles.modalRomanization}>{selected?.romanization}</Text>
                {selected?.meaning && <Text style={styles.modalMeaning}>{selected.meaning}</Text>}

                {selected && renderVideoContent(selected)}

                <TouchableOpacity
                  onPress={() => playSound(selected?.pronunciationAudioUrl)}
                  style={styles.listenButton}
                  disabled={!selected?.pronunciationAudioUrl}
                >
                  <Icon name="volume-up" size={24} color="#fff" />
                  <Text style={styles.listenButtonText}>Listen to Native</Text>
                </TouchableOpacity>

                <View style={styles.divider} />
                <Text style={styles.practiceTitle}>Practice</Text>

                <TouchableOpacity
                  onPressIn={onStartRecord}
                  onPressOut={onStopRecord}
                  disabled={processingAudio}
                  style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                >
                  {processingAudio ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Icon name="mic" size={32} color="#fff" />
                  )}
                </TouchableOpacity>
                <Text style={styles.recordHint}>
                  {isRecording ? `Recording... ${recordTime}` : processingAudio ? "Analyzing..." : "Hold to Record"}
                </Text>

                {feedback && (
                  <View style={[styles.feedbackContainer, feedback.score > 80 ? styles.feedbackSuccess : styles.feedbackWarn]}>
                    <Text style={styles.feedbackScore}>{feedback.score.toFixed(0)}/100</Text>
                    <Text style={styles.feedbackText}>{feedback.text}</Text>
                  </View>
                )}

                {selected?.exampleSentence && (
                  <View style={styles.exampleContainer}>
                    <Text style={styles.exampleLabel}>Example</Text>
                    <Text style={styles.exampleSentence}>{selected.exampleSentence}</Text>
                    <Text style={styles.exampleTranslation}>{selected.exampleTranslation}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingTop: 50, paddingBottom: 15, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginLeft: 10 },
  tabContainer: { marginVertical: 10, height: 50 },
  tabItem: {
    paddingHorizontal: 20, justifyContent: 'center', marginHorizontal: 5,
    borderRadius: 20, backgroundColor: '#E5E7EB', height: 40, marginTop: 5
  },
  tabItemSelected: { backgroundColor: '#4ECDC4' },
  tabText: { color: '#6B7280', fontWeight: '600' },
  tabTextSelected: { color: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  card: {
    width: width / 3 - 16, margin: 8, backgroundColor: '#fff',
    borderRadius: 12, padding: 16, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4
  },
  cardSymbol: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  cardRomanization: { fontSize: 12, color: '#666', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    width: '90%', maxHeight: '85%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden'
  },
  modalScrollContent: { padding: 20, alignItems: 'center' },
  loadingContainer: { padding: 50, alignItems: 'center' },
  loadingText: { marginTop: 15, color: '#666' },
  modalSymbol: { fontSize: 60, fontWeight: 'bold', color: '#4ECDC4' },
  modalRomanization: { fontSize: 20, color: '#555', marginTop: -5 },
  modalMeaning: { fontSize: 16, color: '#777', fontStyle: 'italic', marginBottom: 15 },
  videoContainer: {
    width: '100%', height: 180, backgroundColor: '#000', borderRadius: 10,
    marginVertical: 15, overflow: 'hidden'
  },
  video: { width: '100%', height: '100%' },
  listenButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, elevation: 2
  },
  listenButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  divider: { width: '100%', height: 1, backgroundColor: '#EEE', marginVertical: 20 },
  practiceTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 15 },
  recordButton: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center', elevation: 4
  },
  recordButtonActive: { backgroundColor: '#DC2626', transform: [{ scale: 1.1 }] },
  recordHint: { marginTop: 8, color: '#666' },
  feedbackContainer: {
    marginTop: 15, padding: 15, borderRadius: 10, width: '100%', alignItems: 'center',
    backgroundColor: '#F3F4F6'
  },
  feedbackSuccess: { backgroundColor: '#D1FAE5' },
  feedbackWarn: { backgroundColor: '#FEF3C7' },
  feedbackScore: { fontSize: 24, fontWeight: '800', color: '#059669' },
  feedbackText: { textAlign: 'center', marginTop: 5, color: '#333' },
  exampleContainer: {
    marginTop: 20, padding: 15, backgroundColor: '#F8FAFC', borderRadius: 10, width: '100%'
  },
  exampleLabel: { fontSize: 12, fontWeight: 'bold', color: '#999', textTransform: 'uppercase' },
  exampleSentence: { fontSize: 16, color: '#333', fontWeight: '500', marginTop: 5 },
  exampleTranslation: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  closeButton: { marginTop: 20, padding: 10 },
  closeButtonText: { color: '#999', fontSize: 16 }
});

export default IPAScreen;