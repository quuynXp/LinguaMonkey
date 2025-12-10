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
  status?: 'processing' | 'complete' | 'noise';
};

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const WebRTCCallScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<WebRTCParams, 'WebRTCCall'>>();
  const navigation = useNavigation();
  const { roomId, videoCallId } = route.params;

  const { user } = useUserStore();
  const accessToken = useTokenStore.getState().accessToken;
  const defaultNativeLangCode = useAppStore.getState().nativeLanguage || 'vi';

  // STORE: Get settings from AppStore
  const { callPreferences, setCallPreferences } = useAppStore();

  const signalReconnectTimeout = useRef<any>(null);
  const audioReconnectTimeout = useRef<any>(null);
  const isManuallyClosed = useRef(false);

  const { useUpdateVideoCall } = useVideoCalls();
  const { mutate: updateCallStatus } = useUpdateVideoCall();
  const subtitleTimeoutRef = useRef<any>(null);

  const [nativeLang] = useState(defaultNativeLangCode);
  const [spokenLang] = useState('auto');

  // UI State now backed by Store
  const [showSettings, setShowSettings] = useState(false);
  const [fullSubtitle, setFullSubtitle] = useState<SubtitleData | null>(null);

  // Local state initialized from store
  const [isMicOn, setIsMicOn] = useState(callPreferences.micEnabled);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');

  // WEBSOCKET REFS
  const wsSignal = useRef<WebSocket | null>(null);
  const wsAudio = useRef<WebSocket | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidatesQueue = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const processingRef = useRef<{ lastUpdate: number, data: SubtitleData | null }>({ lastUpdate: 0, data: null });
  const localStreamRef = useRef<MediaStream | null>(null);
  const pingInterval = useRef<any>(null);

  // --- AUDIO CONFIG ---
  // Change source to 0 (DEFAULT) to avoid conflict with WebRTC (VOICE_COMMUNICATION)
  const audioOptions = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 0, // 0=DEFAULT. Avoid 6 (VoiceRec) when in call
    bufferSize: 4096, // Increased buffer slightly
    wavFile: 'temp.wav'
  };

  // --- 1. DEFINITIONS ---

  const getMediaStream = useCallback(async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      ]);
    }
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 480,
          height: 640,
          frameRate: 24,
          facingMode: 'user'
        }
      });
      return stream;
    } catch (e) {
      console.error("Error getting media stream:", e);
      Alert.alert(t('error'), t('cannot_access_camera_mic') || 'Không thể truy cập Camera/Mic');
      return null;
    }
  }, [t]);

  const sendSignalingMessage = useCallback((meta: any, payloadData?: any) => {
    if (wsSignal.current?.readyState === WebSocket.OPEN) {
      wsSignal.current.send(JSON.stringify({
        type: meta.type === 'JOIN_ROOM' ? 'JOIN_ROOM' : 'webrtc_signal',
        roomId,
        senderId: user?.userId,
        payload: { ...meta, ...payloadData }
      }));
    }
  }, [roomId, user?.userId]);

  const startPing = useCallback(() => {
    if (pingInterval.current) clearInterval(pingInterval.current);
    pingInterval.current = setInterval(() => sendSignalingMessage({ type: 'PING' }), 5000);
  }, [sendSignalingMessage]);

  const stopPing = useCallback(() => {
    if (pingInterval.current) { clearInterval(pingInterval.current); pingInterval.current = null; }
  }, []);

  const cleanupCall = useCallback(() => {
    isManuallyClosed.current = true;
    stopPing();

    if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
    if (signalReconnectTimeout.current) clearTimeout(signalReconnectTimeout.current);
    if (audioReconnectTimeout.current) clearTimeout(audioReconnectTimeout.current);

    try { LiveAudioStream.stop(); } catch (e) { }

    localStreamRef.current?.getTracks().forEach(track => { track.stop(); track.enabled = false; });
    setLocalStream(null);

    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());

    if (wsSignal.current) { wsSignal.current.close(); wsSignal.current = null; }
    if (wsAudio.current) { wsAudio.current.close(); wsAudio.current = null; }
  }, [stopPing]);

  const handleCallEnd = useCallback(() => {
    cleanupCall();
    if (videoCallId && user?.userId) {
      updateCallStatus({ id: videoCallId, payload: { callerId: user.userId, status: VideoCallStatus.ENDED } });
    }
    navigation.goBack();
  }, [cleanupCall, videoCallId, user?.userId, updateCallStatus, navigation]);

  const handlePeerDisconnect = useCallback((partnerId: string) => {
    const pc = peerConnections.current.get(partnerId);
    if (pc) { pc.close(); peerConnections.current.delete(partnerId); }
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(partnerId);
      return newMap;
    });
  }, []);

  const processIceQueue = useCallback(async (partnerId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidatesQueue.current.get(partnerId);
    if (queue && queue.length > 0) {
      for (const candidate of queue) await pc.addIceCandidate(candidate);
      iceCandidatesQueue.current.delete(partnerId);
    }
  }, []);

  const createPeerConnection = useCallback(async (partnerId: string, shouldCreateOffer: boolean) => {
    if (peerConnections.current.has(partnerId)) return peerConnections.current.get(partnerId);

    console.log(`🛠 Creating PC for ${partnerId}`);
    const pc = new RTCPeerConnection({ iceServers });
    const pcAny = pc as any;
    peerConnections.current.set(partnerId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    pcAny.onicecandidate = (event: any) => {
      if (event.candidate) {
        sendSignalingMessage({ type: 'ice_candidate', targetId: partnerId }, { candidate: event.candidate });
      }
    };

    pcAny.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        console.log(`🎥 Stream received from ${partnerId}`);
        event.streams[0].getAudioTracks().forEach((track: any) => { track.enabled = true; });
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(partnerId, event.streams[0]);
          return newMap;
        });
        setConnectionStatus("Connected");
      }
    };

    pcAny.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        handlePeerDisconnect(partnerId);
      }
    };

    if (shouldCreateOffer) {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        sendSignalingMessage({ type: 'offer', targetId: partnerId }, offer);
      } catch (err) { console.error(err); }
    }
    return pc;
  }, [sendSignalingMessage, handlePeerDisconnect]);

  const handleSignalingData = useCallback(async (senderId: string, payload: any) => {
    const type = payload.type;
    // console.log(`📩 Signal [${type}] from ${senderId.substring(0, 5)}...`);

    if (type === 'JOIN_ROOM') {
      setConnectionStatus(`Partner Joined. Connecting...`);
      await createPeerConnection(senderId, true);
    } else if (type === 'offer') {
      const pc = await createPeerConnection(senderId, false);
      if (pc) {
        if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
          console.warn("⚠️ Received Offer but state is " + pc.signalingState);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        await processIceQueue(senderId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignalingMessage({ type: 'answer', targetId: senderId }, answer);
      }
    } else if (type === 'answer') {
      const pc = peerConnections.current.get(senderId);
      if (pc) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          await processIceQueue(senderId, pc);
        }
      }
    } else if (type === 'ice_candidate') {
      const pc = peerConnections.current.get(senderId);
      const candidate = new RTCIceCandidate(payload.candidate);
      if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
        await pc.addIceCandidate(candidate);
      } else {
        const queue = iceCandidatesQueue.current.get(senderId) || [];
        queue.push(candidate);
        iceCandidatesQueue.current.set(senderId, queue);
      }
    }
  }, [createPeerConnection, processIceQueue, sendSignalingMessage]);

  const initSubtitleAudioStream = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    // Increased delay to 2s to ensure WebRTC is fully established before we try to hook the mic
    setTimeout(() => {
      if (isManuallyClosed.current) return;
      try {
        console.log("🎤 Initializing LiveAudioStream...");
        LiveAudioStream.stop();
        LiveAudioStream.init(audioOptions);

        LiveAudioStream.on('data', (base64Data: string) => {
          // IMPORTANT: Check ref/state directly inside callback to ensure we respect mute
          if (!wsAudio.current || wsAudio.current.readyState !== WebSocket.OPEN) return;

          // Send audio only if Mic is enabled
          // (We use a ref check pattern implicitly via closure if we didn't add it to dependencies)
          // But since isMicOn is in deps, this callback resets on toggle. 
          // However, LiveAudioStream.start/stop is cleaner.
          try {
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
            wsAudio.current.send(bytes.buffer);
          } catch (err) { console.error("Audio send error", err) }
        });

        // Only start if mic is enabled
        if (isMicOn) {
          LiveAudioStream.start();
          console.log("🎤 LiveAudioStream START command sent");
        }
      } catch (e) { console.error("LiveAudioStream Init Error:", e); }
    }, 2000);

  }, [isMicOn]);

  const handleSubtitleMessage = useCallback((data: any) => {
    if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);

    const newData: SubtitleData = {
      originalFull: data.originalFull || '',
      originalLang: data.originalLang || 'en',
      translated: data.translated || '',
      translatedLang: data.translatedLang || nativeLang,
      senderId: data.senderId,
      status: data.status,
    };

    if (data.status === 'processing') {
      processingRef.current.data = newData;
      const now = Date.now();
      if (now - processingRef.current.lastUpdate > 300) {
        setFullSubtitle(newData);
        processingRef.current.lastUpdate = now;
      }
    } else {
      setFullSubtitle(newData);
    }

    if (data.status === 'complete' || data.status === 'noise') {
      subtitleTimeoutRef.current = setTimeout(() => setFullSubtitle(null), 4000);
    }
  }, [nativeLang]);

  // --- SOCKET CONNECTIONS ---

  const connectSignalingSocket = useCallback(() => {
    if (!roomId || !accessToken || isManuallyClosed.current) return;

    if (signalReconnectTimeout.current) clearTimeout(signalReconnectTimeout.current);
    if (wsSignal.current) { wsSignal.current.close(); wsSignal.current = null; }

    const normalizedRoomId = String(roomId).trim().toLowerCase();
    let cleanBase = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';
    const url = `${protocol}${cleanBase}/ws/py/signal?token=${accessToken}&roomId=${normalizedRoomId}`;

    // console.log(`🔌 Connecting SIGNAL: ${url}`);
    const ws = new WebSocket(url);
    wsSignal.current = ws;

    ws.onopen = () => {
      // console.log("✅ Signal Socket OPEN");
      setConnectionStatus("Connected. Waiting...");
      setTimeout(() => sendSignalingMessage({ type: 'JOIN_ROOM' }), 500);
      startPing();
    };

    ws.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'webrtc_signal' || data.type === 'JOIN_ROOM') {
          const senderId = String(data.senderId || 'unknown');
          if (senderId === String(user?.userId)) return;
          const payload = data.payload || data;
          await handleSignalingData(senderId, payload);
        }
      } catch (err) { }
    };

    ws.onerror = (e: any) => console.log("❌ Signal WS Error:", e.message);
    ws.onclose = (e) => {
      if (!isManuallyClosed.current) {
        signalReconnectTimeout.current = setTimeout(connectSignalingSocket, 3000);
      }
    };
  }, [roomId, accessToken, user?.userId, sendSignalingMessage, startPing, handleSignalingData]);

  const connectAudioSocket = useCallback(() => {
    if (!roomId || !accessToken || isManuallyClosed.current) return;
    if (audioReconnectTimeout.current) clearTimeout(audioReconnectTimeout.current);
    if (wsAudio.current) { wsAudio.current.close(); wsAudio.current = null; }

    const normalizedRoomId = String(roomId).trim().toLowerCase();
    let cleanBase = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';
    const url = `${protocol}${cleanBase}/ws/py/subtitles-audio?token=${accessToken}&roomId=${normalizedRoomId}&nativeLang=${nativeLang}&spokenLang=${spokenLang}`;

    console.log(`🎤 Connecting AUDIO: ${url}`);
    const ws = new WebSocket(url);
    wsAudio.current = ws;

    ws.onopen = () => {
      console.log("✅ Audio Socket OPEN");
      initSubtitleAudioStream();
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'subtitle') handleSubtitleMessage(data);
      } catch (_) { }
    };
    ws.onclose = () => {
      if (!isManuallyClosed.current) {
        audioReconnectTimeout.current = setTimeout(connectAudioSocket, 5000);
      }
    };
  }, [roomId, accessToken, nativeLang, spokenLang, initSubtitleAudioStream, handleSubtitleMessage]);

  const handleRetryConnection = () => {
    setConnectionStatus("Retrying...");
    connectSignalingSocket();
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
  };

  // --- EFFECT ---
  useEffect(() => {
    let isMounted = true;
    const initializeCall = async () => {
      console.log("🚀 Starting initialization...");
      const stream = await getMediaStream();
      if (isMounted && stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;

        // Apply Initial Mic State from Store
        stream.getAudioTracks().forEach(track => {
          track.enabled = callPreferences.micEnabled;
        });

        connectSignalingSocket();
        connectAudioSocket();
      } else {
        setConnectionStatus("Camera/Mic Error");
      }
    };
    initializeCall();
    return () => {
      isMounted = false;
      cleanupCall();
    };
  }, []);

  // --- TOGGLE FUNCTIONS ---

  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    setCallPreferences({ micEnabled: newState });

    // 1. Toggle WebRTC Audio (Peer)
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
    }

    // 2. Toggle AI Audio Stream (Subtitle)
    if (newState) {
      LiveAudioStream.start();
    } else {
      LiveAudioStream.stop();
    }
  };

  const changeSubtitleMode = (mode: 'dual' | 'native' | 'original' | 'off') => {
    setCallPreferences({ subtitleMode: mode });
    setShowSettings(false);
  };

  // --- RENDER ---
  const renderRemoteVideos = () => {
    const streams = Array.from(remoteStreams.values());
    if (streams.length === 0) {
      return (
        <View style={styles.remoteVideoPlaceholder}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.statusText}>{connectionStatus}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetryConnection}>
            <Text style={styles.retryText}>{t('retry') || 'Thử lại'}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.gridContainer}>
        {streams.map((stream) => (
          <View key={stream.id} style={{ width: '100%', height: '100%' }}>
            <RTCView streamURL={stream.toURL()} style={{ flex: 1 }} objectFit="cover" />
          </View>
        ))}
      </View>
    );
  };

  const renderSubtitleText = (data: SubtitleData) => {
    const mode = callPreferences.subtitleMode;
    if (mode === 'off') return null;
    if (!data.originalFull.trim()) return null;

    const isMe = data.senderId === user?.userId;
    const originalText = data.originalFull;
    const translatedText = data.translated;

    if (isMe) {
      return (
        <View style={styles.subtitleContainer}>
          <Text style={[styles.subtitleSender, { textAlign: 'center', color: '#4f46e5' }]}>{t('you') || 'Bạn'}</Text>
          <Text style={[styles.subtitleTextOriginal, { textAlign: 'center' }]}>{originalText}</Text>
        </View>
      )
    }

    let displayOriginal = mode === 'dual' || mode === 'original' || !translatedText;
    let displayTranslated = (mode === 'dual' || mode === 'native') && !!translatedText;

    if (mode === 'native' && !translatedText) displayOriginal = false;

    return (
      <View style={styles.subtitleContainer}>
        <Text style={[styles.subtitleSender, { textAlign: 'center' }]}>{t('partner') || 'Đối phương'}</Text>
        {displayOriginal && <Text style={[styles.subtitleTextOriginal, { textAlign: 'center' }]}>{originalText}</Text>}
        {displayTranslated && <Text style={[styles.subtitleTextTranslated, { textAlign: 'center' }]}>{translatedText}</Text>}
        {displayTranslated && !translatedText && originalText !== "hmm..." && (
          <Text style={[styles.subtitleTextTranslated, { textAlign: 'center', color: '#9ca3af' }]}>{t('translating') || '...'}</Text>
        )}
      </View>
    );
  };

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

        {callPreferences.subtitleMode !== 'off' && fullSubtitle && renderSubtitleText(fullSubtitle)}

        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettings(true)}>
            <Icon name="settings" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isMicOn ? '#22c55e' : '#ef4444' }]}
            onPress={toggleMic}>
            <Icon name={isMicOn ? "mic" : "mic-off"} size={24} color="white" />
          </TouchableOpacity>
        </View>

        <Modal visible={showSettings} transparent animationType="slide">
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettings(false)} />
          <View style={styles.modalContainer}>
            <Text style={styles.sectionTitle}>{t('subtitle_mode') || 'Chế độ phụ đề'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[{ id: 'dual', icon: '📝' }, { id: 'native', icon: '🎯' }, { id: 'original', icon: '🗣️' }, { id: 'off', icon: '🚫' }].map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => changeSubtitleMode(m.id as any)}
                  style={[styles.modeButton, callPreferences.subtitleMode === m.id && styles.modeButtonActive]}>
                  <Text style={{ color: 'white' }}>{m.icon} {m.id}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.closeSettings} onPress={() => setShowSettings(false)}>
              <Text style={{ color: 'white' }}>{t('close') || 'Đóng'}</Text>
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
  subtitleContainer: { position: 'absolute', bottom: 120, alignSelf: 'center', padding: 12, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.8)', maxWidth: windowWidth * 0.9, marginHorizontal: 10 },
  subtitleSender: { color: '#9ca3af', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  subtitleTextOriginal: { color: '#e5e7eb', marginBottom: 4, flexShrink: 1, fontSize: 18 },
  subtitleTextTranslated: { color: '#fbbf24', fontWeight: 'bold', fontSize: 18, flexShrink: 1 },
  controls: { position: 'absolute', top: 60, left: 20, gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { height: '30%', backgroundColor: '#1f2937', marginTop: 'auto', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sectionTitle: { color: '#9ca3af', fontWeight: 'bold', marginBottom: 10 },
  modeButton: { padding: 10, backgroundColor: '#374151', borderRadius: 8, minWidth: '45%', alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: {
    backgroundColor: '#4f46e5'
  },
  closeSettings: { marginTop: 20, alignSelf: 'center', padding: 10 },
});

export default WebRTCCallScreen;