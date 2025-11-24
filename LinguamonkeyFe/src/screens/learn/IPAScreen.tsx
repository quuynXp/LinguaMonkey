import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBasicLessons } from '../../hooks/useBasicLessons';
import { BasicLessonResponse } from '../../types/dto';
import { createScaledSheet } from '../../utils/scaledStyles';

interface Props {
  navigation: any;
  route?: {
    params: {
      languageCode: string;
      lessonType: string;
    }
  };
  languageCode?: string;
  lessonType?: string;
}

const IPAScreen: React.FC<Props> = ({ navigation, route, languageCode: propLang, lessonType: propType }) => {
  // Resolve props from direct pass or navigation params
  const languageCode = propLang || route?.params?.languageCode || 'en';
  const lessonType = propType || route?.params?.lessonType || 'IPA';

  const { useBasicLessonsList } = useBasicLessons();
  const { data: pageData, isLoading: loading, error } = useBasicLessonsList(languageCode, lessonType, 0, 100);

  const items = (pageData?.data || []) as BasicLessonResponse[];

  const [selected, setSelected] = useState<BasicLessonResponse | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // FIX: Xử lý lỗi TypeError: constructor is not callable bằng cách kiểm tra thuộc tính .default
  const PlayerConstructor = (AudioRecorderPlayer as any)?.default || AudioRecorderPlayer;
  const audioPlayer = useRef(new PlayerConstructor()).current;

  useEffect(() => {
    return () => {
      try {
        audioPlayer.stopPlayer();
        audioPlayer.removePlayBackListener();
      } catch (e) {
      }
    };
  }, [audioPlayer]);

  const playSound = async (url?: string) => {
    if (!url) return;
    try {
      await audioPlayer.stopPlayer();
      audioPlayer.removePlayBackListener();
      await audioPlayer.startPlayer(url);
      audioPlayer.addPlayBackListener((e: any) => {
        if (e.currentPosition === e.duration && e.duration > 0) {
          audioPlayer.stopPlayer();
          audioPlayer.removePlayBackListener();
        }
      });
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };

  const handleCloseModal = async () => {
    try {
      await audioPlayer.stopPlayer();
      audioPlayer.removePlayBackListener();
    } catch (e) {
      console.log('Error stopping audio player on close:', e);
    }
    setSelected(null);
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

  const getHeaderTitle = () => {
    switch (languageCode) {
      case 'zh': return 'Chinese Characters';
      case 'vi': return 'Vietnamese Alphabet';
      default: return 'English Pronunciation';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4ECDC4', '#2E8BC0']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {getHeaderTitle()}
        </Text>
      </LinearGradient>

      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
        </View>
      )}

      {error && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Unable to load lessons.</Text>
        </View>
      )}

      {!loading && !error && (
        <ScrollView contentContainerStyle={styles.gridContainer}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id || index}
              activeOpacity={0.85}
              style={styles.card}
              onPress={() => {
                setSelected(item);
                fadeIn();
              }}
            >
              <Text style={styles.cardSymbol}>{item.symbol}</Text>
              {item.romanization && (
                <Text style={styles.cardRomanization}>{item.romanization}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!selected} animationType="none" transparent onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              { opacity: fadeAnim }
            ]}
          >
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalSymbol}>{selected?.symbol}</Text>

              {selected?.romanization && (
                <Text style={styles.modalRomanization}>{selected.romanization}</Text>
              )}

              {selected?.meaning && (
                <Text style={styles.modalMeaning}>{selected.meaning}</Text>
              )}

              {selected?.imageUrl && (
                <Image
                  source={{ uri: selected.imageUrl }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}

              {selected?.videoUrl && (
                <View style={styles.videoContainer}>
                  <Video
                    source={{ uri: selected.videoUrl }}
                    style={styles.video}
                    resizeMode="cover"
                    controls={true}
                    paused={false}
                  />
                </View>
              )}

              <TouchableOpacity
                onPress={() => playSound(selected?.pronunciationAudioUrl)}
                style={styles.listenButton}
              >
                <Icon name="volume-up" size={24} color="#fff" />
                <Text style={styles.listenButtonText}>Listen</Text>
              </TouchableOpacity>

              {selected?.exampleSentence && (
                <View style={styles.exampleContainer}>
                  <Text style={styles.exampleSentence}>{selected.exampleSentence}</Text>
                  <Text style={styles.exampleTranslation}>{selected.exampleTranslation}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    padding: 12,
  },
  card: {
    width: '22%',
    margin: '1.5%',
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  cardSymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4ECDC4',
  },
  cardRomanization: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '88%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  modalScrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalSymbol: {
    fontSize: 50,
    color: '#4ECDC4',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalRomanization: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  modalMeaning: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalImage: {
    width: 140,
    height: 140,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  videoContainer: {
    width: 240,
    height: 140,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 12,
    elevation: 2,
  },
  listenButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  exampleContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  exampleSentence: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  exampleTranslation: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  closeButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default IPAScreen;