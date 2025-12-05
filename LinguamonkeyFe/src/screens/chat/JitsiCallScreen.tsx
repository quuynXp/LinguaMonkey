import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, PermissionsAndroid, Platform, ActivityIndicator } from 'react-native';
import { RTCView, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import { useTranslation } from 'react-i18next';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useTokenStore } from '../../stores/tokenStore';
import { API_BASE_URL } from '../../api/apiConfig';
import LiveAudioStream from 'react-native-live-audio-stream';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useVideoCalls } from '../../hooks/useVideos';
import { VideoCallStatus } from '../../types/enums';

// === TYPES ===
type WebRTCParams = {
  WebRTCCall: {
    roomId: string;
    videoCallId: string;
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
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'zh', name: 'Chinese' },
];

// Định nghĩa cấu hình ICE Server (Sử dụng STUN server công cộng)
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
];

const WebRTCCallScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<WebRTCParams, 'WebRTCCall'>>();
  const navigation = useNavigation();
  const { roomId, videoCallId } = route.params;

  const { user } = useUserStore();
  const accessToken = useTokenStore.getState().accessToken;
  const defaultNativeLangCode = useAppStore.getState().nativeLanguage || 'vi';

  // === API HOOKS ===
  const { useUpdateVideoCall } = useVideoCalls();
  const { mutate: updateCallStatus } = useUpdateVideoCall();

  // === STATE ===
  const [nativeLang, setNativeLang] = useState(defaultNativeLangCode);
  const [spokenLang, setSpokenLang] = useState('auto');
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('dual');
  const [showSettings, setShowSettings] = useState(false);
  const [subtitle, setSubtitle] = useState<SubtitleData | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callEnded, setCallEnded] = useState(false);
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);

  // === REF ===
  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<any>(null); // RTCPeerConnection ref

  // === SETUP CONSTANTS ===
  const subtitleModes: ModeOption[] = [
    { id: 'dual', label: t('dual_sub'), icon: '📝' },
    { id: 'native', label: t('native_sub'), icon: '🎯' },
    { id: 'original', label: t('original_sub'), icon: '🗣️' },
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

  // --- SIGNALING HANDLERS ---
  const sendSignalingMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'webrtc_signal',
        roomId,
        senderId: user?.userId,
        payload: message
      }));
    }
  }, [roomId, user?.userId]);

  const setupPeerConnection = useCallback((stream: any) => {
    // 1. Tạo PeerConnection
    pc.current = new (window as any).RTCPeerConnection({ iceServers });

    // 2. Đăng ký các sự kiện
    pc.current.onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log("Sending ICE Candidate:", event.candidate);
        sendSignalingMessage({ type: 'ice_candidate', candidate: event.candidate });
      }
    };

    pc.current.onaddstream = (event: any) => {
      console.log("Received Remote Stream!");
      setRemoteStream(event.stream);
    };

    // 3. Thêm Local Stream
    pc.current.addStream(stream);

    // 4. Thử tạo Offer (nếu là người gọi)
    // Cần logic bên ngoài để xác định ai là người gọi đầu tiên, 
    // nhưng ta giả định người tạo phòng/tham gia trước sẽ tạo offer
    // Nếu có người dùng thứ 2 tham gia, họ sẽ nhận Offer và tạo Answer.

  }, [sendSignalingMessage]);

  // --- DEVICE AND STREAM SETUP ---
  const getMediaStream = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
    }

    const constraints = {
      video: {
        mandatory: {
          minWidth: 500,
          minHeight: 300,
          minFrameRate: 30,
        },
      },
      audio: true,
    };

    try {
      const stream = await mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Media Device Error:", error);
      return null;
    }
  };

  // --- MAIN LIFECYCLE ---
  useEffect(() => {
    if (!videoCallId || !user?.userId) return;

    // Cập nhật trạng thái cuộc gọi
    updateCallStatus({
      id: videoCallId,
      payload: { callerId: user.userId, status: VideoCallStatus.ONGOING }
    });

    // Khởi tạo media và PeerConnection
    getMediaStream().then(stream => {
      if (stream) setupPeerConnection(stream);
    });

    // Dọn dẹp khi thoát màn hình
    return () => {
      if (!callEnded && user?.userId) {
        updateCallStatus({
          id: videoCallId,
          payload: { callerId: user.userId, status: VideoCallStatus.ENDED }
        });
      }
      pc.current?.close();
      localStream?.release();
      LiveAudioStream.stop();
    };
  }, [videoCallId, user?.userId]);

  // --- WEBSOCKET AND SIGNALING LOGIC ---
  useEffect(() => {
    if (!roomId || !accessToken) return;

    let cleanBase = API_BASE_URL.replace('http://', '').replace('https://', '');
    if (cleanBase.endsWith('/')) cleanBase = cleanBase.slice(0, -1);
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';

    // WebSocket dùng chung cho Signaling và Subtitles
    const wsUrl = `${protocol}${cleanBase}/ws/py/live-subtitles?token=${accessToken}&roomId=${roomId}&nativeLang=${nativeLang}&spokenLang=${spokenLang}`;

    if (ws.current) ws.current.close();
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("✅ WebSocket Connected (Signaling & Subtitle)");
      initSubtitleAudioStream();
      // Giả định: Người dùng đầu tiên tham gia sẽ gửi OFFER
      if (user?.userId === 'USER_ID_OF_CALLER') { // Thay bằng logic xác định người gọi thực tế
        createOffer();
      }
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'subtitle') {
          // Logic xử lý Subtitle (Giữ nguyên)
          setSubtitle({
            original: data.original, originalLang: data.originalLang || 'en',
            translated: data.translated, translatedLang: data.translatedLang || nativeLang,
            senderId: data.senderId
          });
          const timer = setTimeout(() => setSubtitle(prev => prev?.original === data.original ? null : prev), 5000);
          return () => clearTimeout(timer);

        } else if (data.type === 'webrtc_signal' && data.senderId !== user?.userId) {
          // Logic xử lý WebRTC Signaling
          handleSignaling(data.payload);
        }
      } catch (err) { console.error("WS Parse Error:", err); }
    };

    return () => {
      LiveAudioStream.stop();
      if (ws.current) ws.current.close();
    };
  }, [roomId, nativeLang, spokenLang, accessToken, user?.userId]);

  // --- WEBRTC SIGNALING LOGIC ---
  const handleSignaling = async (message: any) => {
    if (!pc.current) return;

    const { type, sdp, candidate } = message;

    try {
      if (type === 'offer') {
        await pc.current.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
        console.log("Received Offer, sending Answer...");
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        sendSignalingMessage(pc.current.localDescription); // Send answer back

      } else if (type === 'answer') {
        await pc.current.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
        console.log("Received Answer.");

      } else if (type === 'ice_candidate') {
        await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("Added ICE Candidate.");
      }
    } catch (error) {
      console.error("WebRTC Signaling Error:", error);
    }
  };

  const createOffer = async () => {
    if (!pc.current || !localStream) {
      // Nếu PeerConnection chưa sẵn sàng, thử lại sau.
      // Đây là lỗi thiết kế nếu setupPeerConnection chưa gọi xong
      return;
    }

    try {
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      sendSignalingMessage(pc.current.localDescription);
      console.log("Sent Offer.");
    } catch (error) {
      console.error("Create Offer Error:", error);
    }
  };

  // --- SUBTITLE AUDIO STREAM (Giữ nguyên logic của bạn) ---
  const initSubtitleAudioStream = async () => {
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
      console.error("Subtitle Audio Stream Init Error:", error);
    }
  };

  // --- HANDLERS (Giữ nguyên) ---
  const handleCallEnd = useCallback(() => {
    if (callEnded || !user?.userId) return;
    setCallEnded(true);

    pc.current?.close();
    localStream?.release();

    updateCallStatus({
      id: videoCallId,
      payload: { callerId: user.userId, status: VideoCallStatus.ENDED }
    }, {
      onSuccess: () => navigation.goBack(),
      onError: () => navigation.goBack()
    });
  }, [callEnded, videoCallId, updateCallStatus, navigation, user?.userId]);

  const handleModeChange = (mode: SubtitleMode) => {
    setSubtitleMode(mode);
    setShowSettings(false);
  };

  const toggleMic = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => (track.enabled = nextState));
    }
    if (nextState) {
      LiveAudioStream.start();
    } else {
      LiveAudioStream.stop();
    }
  };

  // === RENDER HELPERS (Giữ nguyên logic phụ đề) ===
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
          <Text style={[styles.subtitleTextTranslated, !showOriginal && { marginTop: 0 }]}>
            {subtitle.translated}
          </Text>
        )}
      </>
    );
  };

  // --- MAIN RENDER ---
  return (
    <ScreenLayout>
      <View style={styles.container}>
        {/* Remote Stream (Full Screen) */}
        {remoteStream && remoteStream.toURL() ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.remoteVideoText}>{t('waiting_for_partner')}</Text>
          </View>
        )}

        {/* Local Stream (Small Floating Window) */}
        {localStream && localStream.toURL() && (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            zOrder={1} // Đảm bảo nằm trên remote video
          />
        )}

        {/* Floating End Call Button */}
        <TouchableOpacity style={styles.endCallButton} onPress={handleCallEnd}>
          <Text style={styles.endCallText}>📞</Text>
        </TouchableOpacity>

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

        {/* Settings Modal - Giữ nguyên như cũ */}
        <Modal visible={showSettings} transparent animationType="slide">
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettings(false)} />
          <View style={styles.modalContainer}>
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

            <Text style={styles.sectionTitle}>{t('translate_to')}</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.langItem, item.code === spokenLang && styles.langItemActive]}
                  onPress={() => handleSpokenLangChange(item.code)}
                >
                  <Text style={styles.langText}>{item.name}</Text>
                  {item.code === spokenLang && <Text style={styles.checkMark}>🎤</Text>}
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
  // --- VIDEO STYLES ---
  remoteVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoText: {
    color: '#9ca3af',
    marginTop: 10,
    fontSize: 16
  },
  localVideo: {
    position: 'absolute',
    top: 60,
    right: 70, // Đặt gần nút controls
    width: 100,
    height: 150,
    aspectRatio: 0.75,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    elevation: 5,
  },
  // --- OVERLAY STYLES (Giữ nguyên) ---
  endCallButton: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: '#ef4444', width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
    elevation: 5, borderWidth: 2, borderColor: 'white'
  },
  endCallText: { fontSize: 28, color: 'white' },
  subtitleContainer: {
    position: 'absolute', bottom: 120, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 16, padding: 16,
    alignItems: 'center', minHeight: 60, justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  subtitleTextOriginal: { color: '#e5e7eb', fontSize: 14, fontWeight: '500', textAlign: 'center', marginBottom: 4, fontStyle: 'italic' },
  subtitleTextTranslated: { color: '#fbbf24', fontSize: 18, fontWeight: 'bold', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
  subtitlePlaceholder: { color: '#9ca3af', fontSize: 14, fontStyle: 'italic' },
  controls: { position: 'absolute', top: 60, right: 20, flexDirection: 'column', gap: 16, zIndex: 10 },
  iconButton: { backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: 10, borderRadius: 25, alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  iconText: { fontSize: 24, color: 'white' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContainer: { height: '60%', backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, marginTop: 'auto' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#9ca3af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: '#374151', marginVertical: 20 },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  modeButton: { width: '48%', backgroundColor: '#1f2937', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#374151', marginBottom: 8 },
  modeButtonActive: { backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: '#6366f1' },
  modeIcon: { fontSize: 24, marginBottom: 8 },
  modeLabel: { color: '#d1d5db', fontSize: 14, fontWeight: '600' },
  modeLabelActive: { color: '#818cf8' },
  langItem: { backgroundColor: '#1f2937', padding: 14, borderRadius: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  langItemActive: { backgroundColor: '#4f46e5', borderWidth: 1, borderColor: '#818cf8' },
  langText: { color: 'white', fontSize: 16, fontWeight: '500' },
  checkMark: { color: 'white', fontWeight: 'bold' }
});

export default WebRTCCallScreen;