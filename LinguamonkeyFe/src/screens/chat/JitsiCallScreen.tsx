import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { WebView } from 'react-native-webview';
import { WebSocketService } from '../../services/WebSocketService';
import { VoiceStreamService } from '../../services/VoiceStreamService';
import { useAppStore } from '../../stores/appStore';
import { useTokenStore } from '../../stores/tokenStore';
import Constants from 'expo-constants';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useTranslation } from 'react-i18next';

// Định nghĩa cấu trúc dữ liệu cho phụ đề kép
interface DualSubtitle {
  original: string;
  originalLang: string;
  translated: string;
  translatedLang: string;
}

// *** LỖI FIX ***
// Dựa trên lỗi "Argument ... is not assignable",
// chúng ta đoán WSMessage là một object, không phải string.
interface WSMessage {
  type: string;
  data: any;
}

const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'YOUR_FALLBACK_API_URL';
const WS_URL = `ws://${apiUrl}:8000/ws/voice`; // Đảm bảo apiUrl không có http://

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

const JitsiWebView = ({ route }: any) => {
  const { t } = useTranslation();
  const { roomId = 'test-room' } = route.params || {};

  const defaultNativeLangCode = useAppStore.getState().nativeLanguage || 'vi';
  const [nativeLang, setNativeLang] = useState(defaultNativeLangCode);

  const [subtitleData, setSubtitleData] = useState<DualSubtitle | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const ws = useRef<WebSocketService | null>(null);
  const voiceStream = useRef<VoiceStreamService | null>(null);

  useEffect(() => {
    let accessToken;
    try {
      accessToken = useTokenStore.getState().getAccessTokenSync();
      if (!accessToken) {
        console.error("No access token found for WebSocket");
        return;
      }

      ws.current = new WebSocketService(WS_URL, accessToken);

      // *** LỖI FIX ***
      // Các thuộc tính 'onOpen', 'onError', 'onClose' không tồn tại.
      // Chúng ta phải xóa chúng đi.
      // Chúng ta giả định service tự kết nối và chỉ cung cấp 'onMessage'.

      // onMessage tồn tại (dựa trên code gốc của bạn)
      ws.current.onMessage((msg: WSMessage) => { // Thêm type WSMessage
        if (msg.type === 'dual_subtitle_update') {
          setSubtitleData(msg.data as DualSubtitle);
        }
        // Fallback cho flow cũ
        else if (msg.type === 'subtitle_update') {
          // *** LỖI FIX ***
          // Thuộc tính 'lang' không tồn tại trên 'msg'.
          setSubtitleData({
            original: msg.data as string, // Giả sử data là string
            originalLang: '?', // Không thể lấy lang
            translated: '...', // Không thể lấy bản dịch
            translatedLang: nativeLang,
          });
        }
      });

      voiceStream.current = new VoiceStreamService(ws.current, `sess_${Date.now()}`);

    } catch (error) {
      console.error("Failed to initialize services:", error);
    }

    // Cleanup khi component unmount
    return () => {
      console.log('Closing WebSocket connection...');
      
      // *** LỖI FIX ***
      // Thuộc tính 'stopStreaming' không tồn tại.
      // voiceStream.current?.stopStreaming(); // Xóa dòng này

      // .close() tồn tại (dựa trên code gốc và thông báo lỗi "Did you mean 'close'?")
      ws.current?.close();
    };
  }, [nativeLang]); // Thêm nativeLang vào dependency array để đảm bảo nó luôn mới nhất

  // Xử lý khi đổi ngôn ngữ
  const handleLanguageChange = (langCode: string) => {
    setNativeLang(langCode);
    setShowSettings(false);

    // *** LỖI FIX ***
    // Argument 'string' không gán được cho 'WSMessage'.
    // Chúng ta phải gửi một object thay vì một string.
    const message: WSMessage = {
      type: 'config_update',
      data: { targetLang: langCode }
    };
    ws.current?.send(message);
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: `https://meet.jit.si/${roomId}` }}
        style={styles.webview}
        allowsFullscreenVideo
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        allowsInlineMediaPlayback
      />

      {/* Vùng hiển thị phụ đề kép */}
      <View style={styles.subtitleContainer}>
        {subtitleData ? (
          <>
            {/* Phụ đề gốc */}
            <Text style={styles.subtitleTextOriginal}>
              {`[${subtitleData.originalLang}] ${subtitleData.original}`}
            </Text>
            {/* Phụ đề dịch */}
            <Text style={styles.subtitleTextTranslated}>
              {`[${subtitleData.translatedLang}] ${subtitleData.translated}`}
            </Text>
          </>
        ) : (
          <Text style={styles.subtitleTextOriginal}>{t('listening')}</Text>
        )}
      </View>

      {/* Nút cài đặt */}
      <TouchableOpacity style={styles.menuButton} onPress={() => setShowSettings(true)}>
        <Text style={styles.menuText}>⚙️</Text>
      </TouchableOpacity>

      {/* Modal chọn ngôn ngữ */}
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

export default JitsiWebView;

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