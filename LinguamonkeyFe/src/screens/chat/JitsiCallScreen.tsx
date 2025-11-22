import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
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
    audioSource: 6,
    bufferSize: 4096,
    wavFile: 'temp_stream.wav'
  };

  const handleLanguageChange = (langCode: string) => {
    setNativeLang(langCode);
    setShowSettings(false);
  };

  const startAudioStreaming = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    LiveAudioStream.init(audioOptions);

    LiveAudioStream.on('data', (base64Data) => {
      if (ws.current?.readyState === WebSocket.OPEN && isMicOn) {
        ws.current.send(JSON.stringify({
          audio_chunk: base64Data,
          seq: Date.now()
        }));
      }
    });

    LiveAudioStream.start();
  };

  const stopAudioStreaming = () => {
    LiveAudioStream.stop();
  };

  const toggleMic = () => {
    setIsMicOn(prev => !prev);
    if (!isMicOn) LiveAudioStream.start();
    else LiveAudioStream.stop();
  };

  useEffect(() => {
    if (!roomId || !accessToken) return;

    const wsUrl = `ws://${API_BASE_URL}/ws/live-subtitles?token=${accessToken}&roomId=${roomId}&nativeLang=${nativeLang}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      startAudioStreaming();
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'subtitle') {
          setSubtitle({
            original: data.original,
            originalLang: data.originalLang,
            translated: data.translated,
            translatedLang: data.translatedLang,
            senderId: data.senderId
          });
          setTimeout(() => setSubtitle(null), 5000);
        }
      } catch (err) {
        // Log error
      }
    };

    ws.current.onclose = () => {
      stopAudioStreaming();
    };

    return () => {
      stopAudioStreaming();
      ws.current?.close();
    };
  }, [roomId, nativeLang, accessToken]);

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <WebView
          source={{ uri: `https://meet.jit.si/${roomId}#config.startWithVideoMuted=false` }}
          style={styles.webview}
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
          mediaCapturePermissionGrantType="grant"
          allowsInlineMediaPlayback
        />

        <View style={styles.subtitleContainer}>
          {subtitle ? (
            <>
              <Text style={styles.subtitleTextOriginal}>
                {subtitle.senderId === user?.userId ? t('you') + ': ' : t('partner') + ': '}
                {subtitle.original}
              </Text>
              <Text style={styles.subtitleTextTranslated}>
                {subtitle.translated}
              </Text>
            </>
          ) : (
            <Text style={styles.subtitlePlaceholder}>
              {isMicOn ? t('listening') : t('mic_off')}...
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
            <Text style={styles.modalTitle}>{t('selectTargetLanguage')}</Text>
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
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  subtitleTextOriginal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitleTextTranslated: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitlePlaceholder: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
  },
  controls: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'column',
    gap: 10,
    paddingTop: 20, // Tăng padding để tránh notch
  },
  iconButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    marginBottom: 8
  },
  iconText: { fontSize: 20, color: 'white' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    height: '40%',
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginTop: 'auto',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  langItem: {
    backgroundColor: '#374151',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  langItemActive: {
    backgroundColor: '#4f46e5',
  },
  langText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default JitsiWebView;