import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, PermissionsAndroid, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAppStore } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useTokenStore } from '../../stores/tokenStore';
import { API_BASE_URL } from '../../api/apiConfig';
import LiveAudioStream from 'react-native-live-audio-stream';
import ScreenLayout from '../../components/layout/ScreenLayout';

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

type SubtitleData = {
  original: string;
  originalLang: string;
  translated: string;
  translatedLang: string;
  senderId: string;
};

const getWsUrl = (baseUrl: string) => {
  const cleanUrl = baseUrl.replace(/^https?:\/\//, '');
  const protocol = baseUrl.includes('https') ? 'wss://' : 'ws://';
  return `${protocol}${cleanUrl}`;
};

const JitsiWebView = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<JitsiParams, 'JitsiCall'>>();
  const { roomId } = route.params;

  const { user } = useUserStore();
  const accessToken = useTokenStore.getState().accessToken;
  const defaultNativeLangCode = useAppStore.getState().nativeLanguage || 'vi';

  const [nativeLang, setNativeLang] = useState(defaultNativeLangCode);
  const [showSettings, setShowSettings] = useState(false);
  const [subtitle, setSubtitle] = useState<SubtitleData | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);

  const ws = useRef<WebSocket | null>(null);

  const audioOptions = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6, // VOICE_RECOGNITION
    bufferSize: 4096,
    wavFile: 'temp_stream.wav'
  };

  const handleLanguageChange = (langCode: string) => {
    setNativeLang(langCode);
    setShowSettings(false);
    // Khi đổi ngôn ngữ, reconnect lại WS để cập nhật param nativeLang
    if (ws.current) {
      ws.current.close();
      // useEffect sẽ tự trigger lại để connect mới
    }
  };

  const initAudioStream = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    try {
      LiveAudioStream.stop(); // Reset trước khi init
      LiveAudioStream.init(audioOptions);

      LiveAudioStream.on('data', (base64Data) => {
        if (ws.current?.readyState === WebSocket.OPEN && isMicOn) {
          ws.current.send(JSON.stringify({
            audio_chunk: base64Data,
            seq: Date.now() // Gửi kèm timestamp để debug nếu cần
          }));
        }
      });

      LiveAudioStream.start();
    } catch (error) {
      console.error("Audio Stream Init Error:", error);
    }
  };

  const toggleMic = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    if (nextState) {
      LiveAudioStream.start();
    } else {
      LiveAudioStream.stop();
    }
  };

  useEffect(() => {
    if (!roomId || !accessToken) return;

    // Sử dụng logic URL chuẩn (tương tự PythonAiWsService)
    // Đường dẫn phải khớp với Kong Route: /ws/py/live-subtitles
    const wsBase = getWsUrl(API_BASE_URL);
    const wsUrl = `${wsBase}/ws/py/live-subtitles?token=${accessToken}&roomId=${roomId}&nativeLang=${nativeLang}`;

    console.log("Connecting Subtitle WS:", wsUrl);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("✅ Subtitle WS Connected");
      initAudioStream();
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'subtitle') {
          setSubtitle({
            original: data.original,
            originalLang: data.originalLang || 'en',
            translated: data.translated,
            translatedLang: data.translatedLang || nativeLang,
            senderId: data.senderId
          });

          // Tự động ẩn subtitle sau 5s nếu không có câu mới
          setTimeout(() => {
            setSubtitle(prev => {
              // Chỉ ẩn nếu subtitle hiện tại đúng là cái cũ (dựa trên nội dung/thời gian)
              // Ở đây làm đơn giản: nếu 5s trôi qua mà chưa có subtitle mới đè lên
              return prev?.original === data.original ? null : prev;
            });
          }, 5000);
        }
      } catch (err) {
        console.error("WS Parse Error:", err);
      }
    };

    ws.current.onerror = (e) => {
      console.log("WS Error:", e);
    };

    ws.current.onclose = () => {
      console.log("Subtitle WS Closed");
      LiveAudioStream.stop();
    };

    return () => {
      LiveAudioStream.stop();
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [roomId, nativeLang, accessToken]); // Re-run khi đổi ngôn ngữ đích

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <WebView
          source={{ uri: `https://meet.jit.si/${roomId}#config.startWithVideoMuted=false&config.prejoinPageEnabled=false` }}
          style={styles.webview}
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
          mediaCapturePermissionGrantType="grant"
          allowsInlineMediaPlayback
          userAgent="Mozilla/5.0 (Linux; Android 10; Android SDK built for x86) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        />

        <View style={styles.subtitleContainer}>
          {subtitle ? (
            <>
              <Text style={styles.subtitleTextOriginal}>
                {subtitle.senderId === user?.userId ? `${t('you')}: ` : `${t('partner')}: `}
                {subtitle.original}
              </Text>
              <Text style={styles.subtitleTextTranslated}>
                {subtitle.translated}
              </Text>
            </>
          ) : (
            <Text style={styles.subtitlePlaceholder}>
              {isMicOn ? t('listening_for_subtitles') : t('mic_off')}...
            </Text>
          )}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettings(true)}>
            <Text style={styles.iconText}>🌐</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isMicOn ? '#ef4444' : '#22c55e' }]}
            onPress={toggleMic}
          >
            <Text style={styles.iconText}>{isMicOn ? '🎙️' : '🔇'}</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showSettings} transparent animationType="slide">
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettings(false)} />
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('select_subtitle_language')}</Text>
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
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: 'black' },
  webview: { flex: 1 },
  subtitleContainer: {
    position: 'absolute',
    bottom: 120, // Nâng cao hơn chút để không bị che bởi controls Jitsi (nếu có)
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)', // Đậm hơn chút để dễ đọc
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center'
  },
  subtitleTextOriginal: {
    color: '#e5e7eb', // Màu xám nhạt cho text gốc
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 6,
    fontStyle: 'italic'
  },
  subtitleTextTranslated: {
    color: '#fbbf24', // Màu vàng nổi bật cho text dịch
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  subtitlePlaceholder: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  controls: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'column',
    gap: 12,
  },
  iconButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  iconText: { fontSize: 22, color: 'white' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    height: '45%',
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 'auto',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  langItem: {
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  langItemActive: {
    backgroundColor: '#4f46e5',
    borderWidth: 1,
    borderColor: '#818cf8'
  },
  langText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
});

export default JitsiWebView;