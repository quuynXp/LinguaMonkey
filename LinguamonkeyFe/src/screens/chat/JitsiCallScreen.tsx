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

// === TYPES ===
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

type SubtitleMode = 'dual' | 'native' | 'original' | 'off';

type ModeOption = {
  id: SubtitleMode;
  label: string;
  icon: string;
};

// === CONSTANTS ===
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

const getWsUrl = (baseUrl: string) => {
  const cleanUrl = baseUrl.replace(/^https?:\/\//, '');
  const protocol = baseUrl.includes('https') ? 'wss://' : 'ws://';
  return `${protocol}${cleanUrl}`;
};

const JitsiCallScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<JitsiParams, 'JitsiCall'>>();
  const { roomId } = route.params;

  const { user } = useUserStore();
  const accessToken = useTokenStore.getState().accessToken;
  const defaultNativeLangCode = useAppStore.getState().nativeLanguage || 'vi';

  // === STATE ===
  const [nativeLang, setNativeLang] = useState(defaultNativeLangCode);
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('dual');
  const [showSettings, setShowSettings] = useState(false);
  const [subtitle, setSubtitle] = useState<SubtitleData | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);

  const ws = useRef<WebSocket | null>(null);

  const subtitleModes: ModeOption[] = [
    { id: 'dual', label: t('dual_sub'), icon: '📝' },
    { id: 'native', label: t('native_sub'), icon: '🎯' }, // Translated
    { id: 'original', label: t('original_sub'), icon: '🗣️' }, // Speaker's lang
    { id: 'off', label: t('off'), icon: '🚫' },
  ];

  const audioOptions = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6,
    bufferSize: 4096,
    wavFile: 'temp_stream.wav'
  };

  // === HANDLERS ===
  const handleLanguageChange = (langCode: string) => {
    setNativeLang(langCode);
    // Note: We don't close the modal here to allow user to see the change or change mode
    if (ws.current) {
      ws.current.close();
    }
  };

  const handleModeChange = (mode: SubtitleMode) => {
    setSubtitleMode(mode);
    setShowSettings(false);
  };

  const initAudioStream = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    try {
      LiveAudioStream.stop();
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

  const getfullname = () => user?.nickname || user?.fullname || 'Guest';

  // === EFFECTS ===
  useEffect(() => {
    if (!roomId || !accessToken) return;

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

          const timer = setTimeout(() => {
            setSubtitle(prev => {
              return prev?.original === data.original ? null : prev;
            });
          }, 5000);
          return () => clearTimeout(timer);
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
  }, [roomId, nativeLang, accessToken]);

  const jitsiUrl = `https://meet.jit.si/${roomId}#config.startWithVideoMuted=false&config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(getfullname())}`;

  // === RENDER HELPERS ===
  const renderSubtitleContent = () => {
    if (subtitleMode === 'off' || !subtitle) {
      if (subtitleMode !== 'off' && !subtitle) {
        return (
          <Text style={styles.subtitlePlaceholder}>
            {isMicOn ? t('listening_for_subtitles') : t('mic_off')}...
          </Text>
        );
      }
      return null;
    }

    const showOriginal = subtitleMode === 'dual' || subtitleMode === 'original';
    const showTranslated = subtitleMode === 'dual' || subtitleMode === 'native';

    return (
      <>
        {showOriginal && (
          <Text style={styles.subtitleTextOriginal}>
            {subtitle.senderId === user?.userId ? `${t('you')}: ` : `${t('partner')}: `}
            {subtitle.original}
          </Text>
        )}
        {showTranslated && (
          <Text style={[
            styles.subtitleTextTranslated,
            !showOriginal && { marginTop: 0 } // Remove margin if it's the only text
          ]}>
            {subtitle.translated}
          </Text>
        )}
      </>
    );
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <WebView
          source={{ uri: jitsiUrl }}
          style={styles.webview}
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
          mediaCapturePermissionGrantType="grant"
          allowsInlineMediaPlayback
          userAgent="Mozilla/5.0 (Linux; Android 10; Android SDK built for x86) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        />

        {/* Subtitle Display Area */}
        {subtitleMode !== 'off' && (
          <View style={styles.subtitleContainer}>
            {renderSubtitleContent()}
          </View>
        )}

        {/* Floating Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettings(true)}>
            <Text style={styles.iconText}>💬</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isMicOn ? '#ef4444' : '#22c55e' }]}
            onPress={toggleMic}
          >
            <Text style={styles.iconText}>{isMicOn ? '🎙️' : '🔇'}</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Modal */}
        <Modal visible={showSettings} transparent animationType="slide">
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettings(false)} />
          <View style={styles.modalContainer}>

            {/* Section 1: Display Mode (Grid) */}
            <Text style={styles.sectionTitle}>{t('subtitle_mode')}</Text>
            <View style={styles.modeGrid}>
              {subtitleModes.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.modeButton,
                    subtitleMode === mode.id && styles.modeButtonActive
                  ]}
                  onPress={() => handleModeChange(mode.id)}
                >
                  <Text style={styles.modeIcon}>{mode.icon}</Text>
                  <Text style={[
                    styles.modeLabel,
                    subtitleMode === mode.id && styles.modeLabelActive
                  ]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.divider} />

            {/* Section 2: Target Language (List) */}
            <Text style={styles.sectionTitle}>{t('translate_to')}</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: 200 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langItem,
                    item.code === nativeLang && styles.langItemActive
                  ]}
                  onPress={() => handleLanguageChange(item.code)}
                >
                  <Text style={styles.langText}>{item.name}</Text>
                  {item.code === nativeLang && <Text style={styles.checkMark}>✓</Text>}
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
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  subtitleTextOriginal: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
    fontStyle: 'italic'
  },
  subtitleTextTranslated: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  subtitlePlaceholder: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
  },
  controls: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'column',
    gap: 16,
  },
  iconButton: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    padding: 10,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  iconText: { fontSize: 24, color: 'white' },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContainer: {
    height: '60%',
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 'auto',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 20,
  },
  // Grid Styles for Modes
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  modeButton: {
    width: '48%',
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 8,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderColor: '#6366f1',
  },
  modeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  modeLabel: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '600',
  },
  modeLabelActive: {
    color: '#818cf8',
  },
  // List Styles for Language
  langItem: {
    backgroundColor: '#1f2937',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langItemActive: {
    backgroundColor: '#4f46e5',
    borderWidth: 1,
    borderColor: '#818cf8'
  },
  langText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500'
  },
  checkMark: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default JitsiCallScreen;