import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { WebView } from 'react-native-webview';
import { WebSocketService } from '../../services/WebSocketService';
import { VoiceStreamService } from '../../services/VoiceStreamService';
import { useAppStore } from '../../stores/appStore';
import { useTokenStore } from '../../stores/tokenStore';
import Constants from 'expo-constants';
import { createScaledSheet } from '../../utils/scaledStyles';

const apiUrl = Constants.expoConfig.extra.apiUrl;
const LANGUAGES = ['English', 'Vietnamese', 'Japanese', 'Korean', 'Chinese'];

const WS_URL = `ws://${apiUrl}:8000/ws/voice`

const JitsiWebView = ({ route }: any) => {
  const { roomId = 'test-room' } = route.params || {};
  const [subtitle, setSubtitle] = useState('');
  const [detectedLang, setDetectedLang] = useState('');
  const [nativeLang, setNativeLang] = useState(useAppStore.getState().nativeLanguage);
  const [showSettings, setShowSettings] = useState(false);

  const ws = new WebSocketService(WS_URL, useTokenStore.getState().getAccessTokenSync());
  const voiceStream = new VoiceStreamService(ws, `sess_${Date.now()}`);

  useEffect(() => {
    ws.onMessage((msg) => {
      if (msg.type === 'subtitle_update') {
        setSubtitle(msg.data);
        setDetectedLang(msg.type);
      }
    });
    return () => ws.close();
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: `https://meet.jit.si/${roomId}` }}
        style={styles.webview}
        allowsFullscreenVideo
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
      />

      {/* Subtitle overlay */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitleText}>
          {subtitle
            ? `${subtitle}  (${detectedLang} → ${nativeLang})`
            : 'Listening...'}
        </Text>
      </View>

      {/* Settings */}
      <TouchableOpacity style={styles.menuButton} onPress={() => setShowSettings(true)}>
        <Text style={styles.menuText}>⚙️</Text>
      </TouchableOpacity>

      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.langItem}
                onPress={() => {
                  setNativeLang(item);
                  setShowSettings(false);
                }}
              >
                <Text style={styles.langText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

export default JitsiWebView;

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: 'black' },
  webview: { flex: 1 },
  subtitleContainer: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    alignItems: 'center',
  },
  subtitleText: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    fontSize: 16,
  },
  menuButton: { position: 'absolute', top: 50, right: 20 },
  menuText: { fontSize: 24, color: 'white' },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
  },
  langItem: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
  },
  langText: { fontSize: 18, textAlign: 'center' },
});
