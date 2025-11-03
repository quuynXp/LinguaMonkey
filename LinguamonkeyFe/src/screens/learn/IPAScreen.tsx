import React, { useState, useRef } from 'react';
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
} from 'react-native';

// ----- SỬA LỖI IMPORT -----
// [XÓA] import Audio from 'expo-audio';
// [XÓA] import Video from 'expo-video';
// [THÊM] Import các thư viện mới
import Video from 'react-native-video';
import * as AudioRecorderPlayer from 'react-native-audio-recorder-player';// -----------------------------

import { useLearningItems } from '../../hooks/useLearningItems';
import { BasicLessonResponse } from '../../types/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient'; // Bạn đã import cái này, hãy đảm bảo đã cài đặt

interface Props {
  navigation: any;
  languageCode: 'en' | 'zh' | 'vi';
  lessonType: string;
}

const LearningScreen: React.FC<Props> = ({ navigation, languageCode, lessonType }) => {
  const { items, loading, error } = useLearningItems(languageCode, lessonType);
  const [selected, setSelected] = useState<BasicLessonResponse | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // [THÊM] Khởi tạo trình phát âm thanh (chỉ 1 lần)
  const audioPlayer = useRef(new AudioRecorderPlayer.default()).current;

  // ----- SỬA HÀM playSound -----
  const playSound = async (url?: string) => {
    if (!url) return;

    try {
      // Dừng bất kỳ âm thanh nào đang phát trước đó
      await audioPlayer.stopPlayer();
      // Xóa listener cũ
      audioPlayer.removePlayBackListener();

      // Bắt đầu phát âm thanh từ URL
      await audioPlayer.startPlayer(url);

      // Thêm listener để biết khi nào phát xong
      audioPlayer.addPlayBackListener((e) => {
        // e.currentPosition === e.duration có nghĩa là đã phát xong
        if (e.currentPosition >= e.duration) {
          audioPlayer.stopPlayer(); // Dừng lại
          audioPlayer.removePlayBackListener(); // Xóa listener
        }
      });
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };
  // -----------------------------

  // [THÊM] Hàm đóng Modal an toàn
  const handleCloseModal = () => {
    try {
      // Dừng âm thanh đang phát khi đóng modal
      audioPlayer.stopPlayer();
      audioPlayer.removePlayBackListener();
    } catch (e) {
      console.log('Error stopping audio player on close:', e);
    }
    // Đóng modal
    setSelected(null);
  };
  // -----------------------------

  const fadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header (Giữ nguyên) */}
      <LinearGradient
        colors={['#4ECDC4', '#2E8BC0']}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 48,
          paddingHorizontal: 16,
          paddingBottom: 20,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          elevation: 5,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginLeft: 12 }}>
          {languageCode === 'en'
            ? 'English Pronunciation'
            : languageCode === 'zh'
              ? 'Chinese Characters'
              : 'Vietnamese Alphabet'}
        </Text>
      </LinearGradient>

      {/* Loading/Error (Giữ nguyên) */}
      {loading && <ActivityIndicator size="large" color="#4ECDC4" style={{ marginTop: 30 }} />}
      {error && <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>}

      {/* Grid (Giữ nguyên) */}
      <ScrollView
        contentContainerStyle={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          padding: 12,
        }}
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id || index}
            activeOpacity={0.85}
            style={{
              width: '22%',
              margin: '1.5%',
              backgroundColor: '#fff',
              borderRadius: 14,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 3,
              alignItems: 'center',
              paddingVertical: 14,
              transform: [{ scale: 1 }],
            }}
            onPress={() => {
              setSelected(item);
              fadeIn();
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#4ECDC4' }}>
              {item.symbol}
            </Text>
            {item.romanization && (
              <Text style={{ fontSize: 13, color: '#777', marginTop: 4 }}>
                {item.romanization}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal chi tiết (Giữ nguyên) */}
      <Modal visible={!!selected} animationType="fade" transparent onShow={fadeIn}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: fadeAnim,
          }}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 24,
              padding: 24,
              width: '88%',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 8,
            }}
          >
            {/* Các Text và Image (Giữ nguyên) */}
            <Text style={{ fontSize: 50, color: '#4ECDC4', fontWeight: 'bold' }}>
              {selected?.symbol}
            </Text>
            {selected?.romanization && (
              <Text style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>
                {selected.romanization}
              </Text>
            )}
            {selected?.meaning && (
              <Text style={{ fontSize: 16, color: '#333', marginBottom: 12 }}>
                {selected.meaning}
              </Text>
            )}
            {selected?.imageUrl && (
              <Image
                source={{ uri: selected.imageUrl }}
                style={{ width: 140, height: 140, borderRadius: 14, marginBottom: 12 }}
              />
            )}

            {/* ----- SỬA COMPONENT VIDEO ----- */}
            {selected?.videoUrl && (
              <Video
                source={{ uri: selected.videoUrl }}
                style={{
                  width: 240,
                  height: 140,
                  borderRadius: 14,
                  marginBottom: 12,
                }}
                // Sửa: Dùng 'resizeMode'
                resizeMode="cover"
                // Sửa: Dùng 'controls={true}'
                controls={true}
              />
            )}
            {/* ----------------------------- */}

            {/* Nút Listen (Giữ nguyên) */}
            <TouchableOpacity
              onPress={() => playSound(selected?.pronunciationAudioUrl)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#4ECDC4',
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 24,
                marginTop: 12,
              }}
            >
              <Icon name="volume-up" size={24} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '500' }}>Listen</Text>
            </TouchableOpacity>

            {/* Ví dụ (Giữ nguyên) */}
            {selected?.exampleSentence && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: 'bold', color: '#333' }}>
                  {selected.exampleSentence}
                </Text>
                <Text style={{ color: '#777' }}>
                  {selected.exampleTranslation}
                </Text>
              </View>
            )}

            {/* ----- SỬA NÚT ĐÓNG ----- */}
            <TouchableOpacity
              style={{ marginTop: 22 }}
              // Dùng hàm handler mới để dừng âm thanh
              onPress={handleCloseModal}
            >
              <Text style={{ color: '#888' }}>Close</Text>
            </TouchableOpacity>
            {/* ------------------------- */}

          </View>
        </Animated.View>
      </Modal>
    </View>
  );
};

export default LearningScreen;