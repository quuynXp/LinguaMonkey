import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useRoute, RouteProp } from '@react-navigation/native';

import { useChatStore } from '../../stores/ChatStore';
import { useAppStore } from '../../stores/appStore';
import { createScaledSheet } from '../../utils/scaledStyles';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

type JitsiParams = {
  JitsiCall: {
    roomId: string;
  };
};

const JitsiWebView = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<JitsiParams, 'JitsiCall'>>();
  const { roomId = 'test-room' } = route.params || {};

  const defaultNativeLangCode = useAppStore.getState().nativeLanguage || 'vi';
  
  // --- STATE CỤC BỘ CHO UI ---
  const [nativeLang, setNativeLang] = useState(defaultNativeLangCode);
  const [showSettings, setShowSettings] = useState(false);

  // --- STATE TỪ ZUSTAND STORE ---
  const subtitles = useChatStore(s => s.currentVideoSubtitles);
  
  // --- ACTIONS TỪ ZUSTAND STORE ---
  const connectVideoSubtitles = useChatStore(s => s.connectVideoSubtitles);
  const disconnectVideoSubtitles = useChatStore(s => s.disconnectVideoSubtitles);
  const updateSubtitleLanguage = useChatStore(s => s.updateSubtitleLanguage);
  
  // Xóa bỏ hoàn toàn logic WebSocket và VoiceStream cũ
  // const ws = useRef<WebSocketService | null>(null);
  // const voiceStream = useRef<VoiceStreamService | null>(null);

  useEffect(() => {
    // Kết nối service phụ đề khi vào màn hình
    connectVideoSubtitles(roomId, nativeLang);
    
    // Cleanup khi component unmount
    return () => {
      disconnectVideoSubtitles();
    };
  }, [roomId, nativeLang, connectVideoSubtitles, disconnectVideoSubtitles]);

  // Xử lý khi đổi ngôn ngữ
  const handleLanguageChange = (langCode: string) => {
    setNativeLang(langCode);
    setShowSettings(false);
    
    // Gửi yêu cầu đổi ngôn ngữ qua store
    updateSubtitleLanguage(langCode);
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: `https://meet.jit.si/${roomId}` }}
        style={styles.webview}
        allowsFullscreenVideo
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        // Quyền media cho React Native WebView
        mediaCapturePermissionGrantType="grant" 
        allowsInlineMediaPlayback
      />

      {/* Vùng hiển thị phụ đề kép */}
      <View style={styles.subtitleContainer}>
        {subtitles ? ( // Dùng state 'subtitles' từ store
          <>
            {/* Phụ đề gốc */}
            <Text style={styles.subtitleTextOriginal}>
              {`[${subtitles.originalLang}] ${subtitles.original}`}
            </Text>
            {/* Phụ đề dịch */}
            <Text style={styles.subtitleTextTranslated}>
              {`[${subtitles.translatedLang}] ${subtitles.translated}`}
            </Text>
          </>
        ) : (
          <Text style={styles.subtitleTextOriginal}>{t('listening')}</Text>
        )}
      </View>

      {/* Nút cài đặt (Giữ nguyên) */}
      <TouchableOpacity style={styles.menuButton} onPress={() => setShowSettings(true)}>
        <Text style={styles.menuText}>⚙️</Text>
      </TouchableOpacity>

      {/* Modal chọn ngôn ngữ (Giữ nguyên) */}
      <Modal visible={showSettings} transparent animationType="slide">
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettings(false)} />
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{t('selectLanguage')}</Text>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.langItem,
                  item.code === nativeLang && styles.langItemActive
                ]}
                onPress={() => handleLanguageChange(item.code)}
              >
                <Text style={styles.langText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};


const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: 'black' },
  webview: { flex: 1 },
  subtitleContainer: {
    position: 'absolute',
    bottom: 80,
    width: '90%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  subtitleTextOriginal: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitleTextTranslated: {
    color: '#a5b4fc', // Màu khác để phân biệt
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
  },
  menuButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
  },
  menuText: { fontSize: 24, color: 'white' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    height: '50%',
    backgroundColor: '#333',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  langItem: {
    backgroundColor: '#555',
    marginVertical: 5,
    padding: 15,
    borderRadius: 8,
  },
  langItemActive: {
    backgroundColor: '#4f46e5',
  },
  langText: { fontSize: 16, textAlign: 'center', color: 'white' },
});

export default JitsiWebView;