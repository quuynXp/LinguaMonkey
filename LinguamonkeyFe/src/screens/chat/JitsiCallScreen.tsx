import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Dimensions,
  DimensionValue,
  Alert
} from 'react-native';
import {
  RTCView,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  RTCPeerConnection,
  MediaStream
} from 'react-native-webrtc';
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
import Icon from 'react-native-vector-icons/MaterialIcons';

type RTCPeerConnectionWithHandlers = RTCPeerConnection & {
  onicecandidate: ((event: any) => void) | null;
  ontrack: ((event: any) => void) | null;
  oniceconnectionstatechange: ((event: any) => void) | null;
};

type WebRTCParams = {
  WebRTCCall: {
    roomId: string;
    videoCallId: string;
    isCaller?: boolean;
    mode?: 'RANDOM' | 'GROUP';
  };
};

type SubtitleData = {
  originalFull: string;
  originalLang: string;
  translated: string;
  translatedLang: string;
  senderId: string;
  status?: 'complete' | 'noise';
};

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

const WebRTCCallScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<WebRTCParams, 'WebRTCCall'>>();
  const navigation = useNavigation();
  const { roomId, videoCallId, isCaller, mode = 'RANDOM' } = route.params;

  const { user } = useUserStore();
  const accessToken = useTokenStore.getState().accessToken;
  const defaultNativeLangCode = useAppStore.getState().nativeLanguage || 'vi';
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isManuallyClosed = useRef(false);
  const { useUpdateVideoCall } = useVideoCalls();
  const { mutate: updateCallStatus } = useUpdateVideoCall();
  const subtitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [nativeLang] = useState(defaultNativeLangCode);
  const [spokenLang] = useState('auto');
  const [subtitleMode, setSubtitleMode] = useState<'dual' | 'native' | 'original' | 'off'>('dual');
  const [showSettings, setShowSettings] = useState(false);
  const [fullSubtitle, setFullSubtitle] = useState<SubtitleData | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');

  // --- REFS ---
  const ws = useRef<WebSocket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidatesQueue = useRef<Map<string, RTCIceCandidate[]>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const pingInterval = useRef<any>(null);

  const audioOptions = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: Platform.OS === 'android' ? 7 : 0,
    bufferSize: 4096,
    wavFile: 'temp.wav'
  };

  useEffect(() => {
    let isMounted = true;

    const initializeCall = async () => {
      console.log("🚀 Starting initialization...");
      const stream = await getMediaStream();

      if (isMounted && stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;
        connectWebSocket();
      } else {
        setConnectionStatus("Camera Error");
      }
    };

    initializeCall();

    return () => {
      isMounted = false;
      cleanupCall();
    };
  }, []);

  const connectWebSocket = () => {
    if (!roomId || !accessToken || isManuallyClosed.current) return;

    if (ws.current) {
      try { ws.current.close(); } catch (_) { }
      ws.current = null;
    }

    const normalizedRoomId = String(roomId).trim().toLowerCase();
    let cleanBase = API_BASE_URL.replace('http://', '').replace('https://', '').replace(/\/$/, '');
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';
    const wsUrl = `${protocol}${cleanBase}/ws/py/live-subtitles?token=${accessToken}&roomId=${normalizedRoomId}&nativeLang=${nativeLang}&spokenLang=${spokenLang}`;

    console.log(`🔌 Connecting WS (Attempt ${reconnectAttempts.current + 1})...`);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("✅ Socket Open");
      isManuallyClosed.current = false;
      reconnectAttempts.current = 0;
      setConnectionStatus("Connected. Waiting for others...");
      initSubtitleAudioStream();

      setTimeout(() => {
        sendSignalingMessage({ type: 'JOIN_ROOM' });
      }, 500);

      startPing();
    };

    ws.current.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === 'subtitle') {
          handleSubtitleMessage(data);
          return;
        }

        if (data.type === 'webrtc_signal') {
          const senderId = String(data.senderId || 'unknown');
          const myId = String(user?.userId || 'me');

          if (senderId === myId) return;

          const payload = data.payload;
          await handleSignalingData(senderId, payload);
        }
      } catch (err) {
        console.error("WS Message Error", err);
      }
    };

    ws.current.onerror = (e) => {
      console.log("❌ WS Error:", e);
    };

    ws.current.onclose = (e) => {
      if (isManuallyClosed.current) return;

      console.log(`⚠️ WS Closed (Code: ${e.code}). Attempting reconnect...`);
      stopPing();

      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        setConnectionStatus(`Reconnecting (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
        setTimeout(connectWebSocket, 2000);
      } else {
        setConnectionStatus("Connection Lost. Please restart.");
      }
    };
  };

  const handleSignalingData = async (senderId: string, payload: any) => {
    const type = payload.type;
    console.log(`📩 Signal [${type}] from ${senderId.substring(0, 5)}...`);

    if (type === 'JOIN_ROOM') {
      console.log(`👋 Partner ${senderId} joined via JOIN_ROOM`);
      setConnectionStatus(`Partner Joined. Connecting...`);
      await createPeerConnection(senderId, true);
      return;
    }

    if (type === 'offer') {
      const pc = await createPeerConnection(senderId, false);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        await processIceQueue(senderId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignalingMessage({ type: 'answer', targetId: senderId }, answer);
      }
      return;
    }

    if (type === 'answer') {
      const pc = peerConnections.current.get(senderId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        await processIceQueue(senderId, pc);
      }
      return;
    }

    if (type === 'ice_candidate') {
      const pc = peerConnections.current.get(senderId);
      const candidate = new RTCIceCandidate(payload.candidate);

      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(candidate);
      } else {
        console.log(`⚠️ Queuing ICE for ${senderId} (No RemoteDesc)`);
        const queue = iceCandidatesQueue.current.get(senderId) || [];
        queue.push(candidate);
        iceCandidatesQueue.current.set(senderId, queue);
      }
      return;
    }
  };

  const processIceQueue = async (partnerId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidatesQueue.current.get(partnerId);
    if (queue && queue.length > 0) {
      console.log(`🔄 Processing ${queue.length} queued ICE candidates for ${partnerId}`);
      for (const candidate of queue) {
        await pc.addIceCandidate(candidate);
      }
      iceCandidatesQueue.current.delete(partnerId);
    }
  };

  const createPeerConnection = async (partnerId: string, shouldCreateOffer: boolean) => {
    if (peerConnections.current.has(partnerId)) {
      return peerConnections.current.get(partnerId);
    }

    console.log(`🛠 Creating PC for ${partnerId}`);
    const pc = new RTCPeerConnection({ iceServers });
    const pcAny = pc as any;

    peerConnections.current.set(partnerId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pcAny.onicecandidate = (event: any) => {
      if (event.candidate) {
        sendSignalingMessage({ type: 'ice_candidate', targetId: partnerId }, { candidate: event.candidate });
      }
    };

    pcAny.ontrack = (event: any) => {
      console.log(`🎥 ontrack triggered from ${partnerId}`);
      if (event.streams && event.streams[0]) {
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(partnerId, event.streams[0]);
          return newMap;
        });
        setConnectionStatus("Connected");
      }
    };

    pcAny.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`❄️ ICE State (${partnerId}): ${state}`);
      if (state === 'connected') {
        setConnectionStatus("Connected");
      } else if (state === 'failed' || state === 'disconnected') {
        handlePeerDisconnect(partnerId);
        setConnectionStatus("Reconnecting...");
      }
    };

    if (shouldCreateOffer) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          iceRestart: true
        });
        await pc.setLocalDescription(offer);
        console.log(`📤 Sending Offer to ${partnerId}`);
        sendSignalingMessage({ type: 'offer', targetId: partnerId }, offer);
      } catch (err) {
        console.error(`Error creating offer for ${partnerId}`, err);
      }
    }

    return pc;
  };

  const handlePeerDisconnect = (partnerId: string) => {
    console.log(`❌ Peer ${partnerId} disconnected cleanup`);
    const pc = peerConnections.current.get(partnerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(partnerId);
    }
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(partnerId);
      return newMap;
    });
  };

  const sendSignalingMessage = (meta: any, payloadData?: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: meta.type === 'JOIN_ROOM' ? 'JOIN_ROOM' : 'webrtc_signal',
        roomId: roomId,
        senderId: user?.userId,
        payload: { ...meta, ...payloadData }
      };
      if (meta.type === 'JOIN_ROOM') {
        ws.current.send(JSON.stringify({
          type: "JOIN_ROOM",
          roomId: roomId,
          senderId: user?.userId
        }));
      } else {
        ws.current.send(JSON.stringify({
          type: "webrtc_signal",
          roomId: roomId,
          senderId: user?.userId,
          payload: { ...meta, ...payloadData }
        }));
      }
    } else {
      console.log("⚠️ Socket not ready, cannot send:", meta.type);
    }
  };

  const handleRetryConnection = () => {
    console.log("♻️ Retrying Handshake...");
    setConnectionStatus("Retrying...");

    sendSignalingMessage({ type: 'JOIN_ROOM' });

    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
  };

  const initSubtitleAudioStream = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    try {
      LiveAudioStream.stop();
      LiveAudioStream.init(audioOptions);
      LiveAudioStream.on('data', (base64Data) => {
        if (ws.current?.readyState === WebSocket.OPEN && isMicOn && !isManuallyClosed.current) {
          ws.current.send(JSON.stringify({ audio_chunk: base64Data }));
        }
      });
      if (isMicOn) LiveAudioStream.start();
    } catch (e) {
      console.error("AudioStream Init Error", e);
    }
  };

  // 🔥 Cập nhật logic xử lý phụ đề theo cơ chế reset VAD và hiển thị
  const handleSubtitleMessage = useCallback((data: any) => {
    if (subtitleTimeoutRef.current) {
      clearTimeout(subtitleTimeoutRef.current);
      subtitleTimeoutRef.current = null;
    }

    const newSubtitleData: SubtitleData = {
      originalFull: data.originalFull || '',
      originalLang: data.originalLang || 'en',
      translated: data.translated || '',
      translatedLang: data.translatedLang || nativeLang,
      senderId: data.senderId,
      status: data.status,
    };

    if (newSubtitleData.status === 'noise' || !newSubtitleData.originalFull.trim()) {
      // Trường hợp nhiễu hoặc tin nhắn trống (server reset chuỗi)
      setFullSubtitle({
        ...newSubtitleData,
        originalFull: newSubtitleData.originalFull || "hmm...",
      });
    } else {
      setFullSubtitle(newSubtitleData);
    }

    // Ngắt câu (reset) sau 3 giây không có hoạt động nói
    if (newSubtitleData.status === 'complete' || newSubtitleData.status === 'noise') {
      subtitleTimeoutRef.current = setTimeout(() => {
        setFullSubtitle(null);
      }, 3000);
    }

  }, [nativeLang]);

  const startPing = () => {
    stopPing();
    pingInterval.current = setInterval(() => {
      sendSignalingMessage({ type: 'PING' });
    }, 5000);
  };

  const stopPing = () => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
  };

  const cleanupCall = useCallback(() => {
    console.log("🧹 Cleaning up call...");
    isManuallyClosed.current = true;

    stopPing();
    if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);

    try {
      LiveAudioStream.stop();
      LiveAudioStream.on('data', () => { });
    } catch (e) { console.warn("Stop stream error", e); }

    localStreamRef.current?.getTracks().forEach(track => {
      track.stop();
      track.enabled = false;
    });
    setLocalStream(null);

    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());

    if (ws.current) {
      ws.current.close(1000, "User ended call");
      ws.current = null;
    }
  }, []);

  const getMediaStream = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      ]);
    }
    try {
      return await mediaDevices.getUserMedia({
        audio: true,
        video: { width: 480, height: 640, frameRate: 24, facingMode: 'user' }
      });
    } catch (e) {
      console.error("getUserMedia Error", e);
      return null;
    }
  };

  const handleCallEnd = () => {
    cleanupCall();

    if (videoCallId && user?.userId) {
      updateCallStatus({ id: videoCallId, payload: { callerId: user.userId, status: VideoCallStatus.ENDED } });
    }
    navigation.goBack();
  };

  useEffect(() => {
    return () => {
      cleanupCall();
    }
  }, [cleanupCall]);

  const renderRemoteVideos = () => {
    const streams = Array.from(remoteStreams.values());
    const count = streams.length;

    if (count === 0) {
      return (
        <View style={styles.remoteVideoPlaceholder}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.statusText}>{connectionStatus}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetryConnection}>
            <Text style={styles.retryText}>Thử lại / Kết nối lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    let width: DimensionValue = '100%';
    let height: DimensionValue = '100%';

    if (count === 1) {
    } else if (count === 2) {
      height = '50%';
    } else if (count <= 4) {
      width = '50%';
      height = '50%';
    }

    return (
      <View style={styles.gridContainer}>
        {streams.map((stream, index) => (
          <View key={stream.id} style={{ width, height, borderWidth: 1, borderColor: '#111' }}>
            <RTCView streamURL={stream.toURL()} style={{ flex: 1 }} objectFit="cover" />
          </View>
        ))}
      </View>
    );
  };

  const renderSubtitleText = (data: SubtitleData) => {
    if (!data.originalFull.trim()) return null;

    const senderIsMe = data.senderId === user?.userId;
    const senderLabel = senderIsMe ? t('You') : t('Partner');

    const originalText = data.originalFull;
    const translatedText = data.translated;

    let displayOriginal = false;
    let displayTranslated = false;

    if (subtitleMode === 'dual') {
      displayOriginal = true;
      displayTranslated = true;
    } else if (subtitleMode === 'native' && translatedText) {
      displayTranslated = true;
    } else if (subtitleMode === 'original' || !translatedText) {
      displayOriginal = true;
    }

    // Căn giữa phụ đề
    const alignment = 'center';

    return (
      <View style={styles.subtitleContainer}>
        <Text style={[styles.subtitleSender, { textAlign: alignment }]}>{senderLabel}</Text>
        {displayOriginal && (
          <Text style={[styles.subtitleTextOriginal, { textAlign: alignment }]}>
            {originalText}
          </Text>
        )}
        {displayTranslated && translatedText && (
          <Text style={[styles.subtitleTextTranslated, { textAlign: alignment }]}>
            {translatedText}
          </Text>
        )}
        {displayTranslated && !translatedText && originalText !== "hmm..." && (
          <Text style={[styles.subtitleTextTranslated, { textAlign: alignment, color: '#9ca3af' }]}>
            {t('translating')}...
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {renderRemoteVideos()}

        {localStream && (
          <View style={styles.localVideoContainer}>
            <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} />
          </View>
        )}

        <TouchableOpacity style={styles.endCallButton} onPress={handleCallEnd}>
          <Icon name="call-end" size={30} color="white" />
        </TouchableOpacity>

        {/* Hiển thị phụ đề ở giữa màn hình */}
        {subtitleMode !== 'off' && fullSubtitle && renderSubtitleText(fullSubtitle)}

        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettings(true)}>
            <Icon name="settings" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isMicOn ? '#22c55e' : '#ef4444' }]}
            onPress={() => setIsMicOn(!isMicOn)}>
            <Icon name={isMicOn ? "mic" : "mic-off"} size={24} color="white" />
          </TouchableOpacity>
        </View>

        <Modal visible={showSettings} transparent animationType="slide">
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettings(false)} />
          <View style={styles.modalContainer}>
            <Text style={styles.sectionTitle}>{t('subtitle_mode')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[{ id: 'dual', icon: '📝' }, { id: 'native', icon: '🎯' }, { id: 'original', icon: '🗣️' }, { id: 'off', icon: '🚫' }].map(m => (
                <TouchableOpacity key={m.id} onPress={() => { setSubtitleMode(m.id as any); setShowSettings(false) }}
                  style={[styles.modeButton, subtitleMode === m.id && styles.modeButtonActive]}>
                  <Text style={{ color: 'white' }}>{m.icon} {m.id}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.closeSettings} onPress={() => setShowSettings(false)}>
              <Text style={{ color: 'white' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </ScreenLayout>
  );
};

const windowWidth = Dimensions.get('window').width;

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: 'black' },
  gridContainer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  remoteVideoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827', gap: 20 },
  statusText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  retryButton: { padding: 12, backgroundColor: '#374151', borderRadius: 8, marginTop: 20 },
  retryText: { color: '#fbbf24', fontWeight: 'bold', fontSize: 16 },
  localVideoContainer: { position: 'absolute', top: 60, right: 20, width: 100, height: 150, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#4b5563', backgroundColor: '#374151' },
  localVideo: { flex: 1 },
  endCallButton: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#ef4444', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // 🔥 Cập nhật Subtitle Container: Căn giữa, rộng tùy nội dung, và dùng maxWidth 90%
  subtitleContainer: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center', // Căn giữa màn hình
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    maxWidth: windowWidth * 0.9, // Cho phép nó rộng hơn khi câu dài
    marginHorizontal: 10,
  },
  subtitleSender: { color: '#9ca3af', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  subtitleTextOriginal: { color: '#e5e7eb', marginBottom: 4, flexShrink: 1, fontSize: 18 },
  subtitleTextTranslated: { color: '#fbbf24', fontWeight: 'bold', fontSize: 18, flexShrink: 1 },

  controls: { position: 'absolute', top: 60, left: 20, gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { height: '30%', backgroundColor: '#1f2937', marginTop: 'auto', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sectionTitle: { color: '#9ca3af', fontWeight: 'bold', marginBottom: 10 },
  modeButton: { padding: 10, backgroundColor: '#374151', borderRadius: 8, minWidth: '45%', alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: '#4f46e5' },
  closeSettings: { marginTop: 20, alignSelf: 'center', padding: 10 },
});

export default WebRTCCallScreen;