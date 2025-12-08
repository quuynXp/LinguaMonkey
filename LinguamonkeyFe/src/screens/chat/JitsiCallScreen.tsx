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
  DimensionValue // Fix type style error
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

// Fix Error: RTCPeerConnection types missing legacy handlers
// We define a helper type or just cast to any in the code
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
  original: string;
  originalLang: string;
  translated: string;
  translatedLang: string;
  senderId: string;
};

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const WebRTCCallScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<WebRTCParams, 'WebRTCCall'>>();
  const navigation = useNavigation();
  const { roomId, videoCallId, isCaller, mode = 'RANDOM' } = route.params;

  const { user } = useUserStore();
  const accessToken = useTokenStore.getState().accessToken;
  const defaultNativeLangCode = useAppStore.getState().nativeLanguage || 'vi';

  const { useUpdateVideoCall } = useVideoCalls();
  const { mutate: updateCallStatus } = useUpdateVideoCall();

  // State
  const [nativeLang] = useState(defaultNativeLangCode);
  const [spokenLang] = useState('auto');
  const [subtitleMode, setSubtitleMode] = useState<'dual' | 'native' | 'original' | 'off'>('dual');
  const [showSettings, setShowSettings] = useState(false);
  const [subtitle, setSubtitle] = useState<SubtitleData | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Map lưu trữ Streams của nhiều người
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');

  // Refs
  const ws = useRef<WebSocket | null>(null);
  // Map lưu trữ PeerConnections
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Fix Error: Type 'number' is not assignable to type 'Timeout'.
  // Use 'any' for RN timers or ReturnType<typeof setInterval>
  const pingInterval = useRef<any>(null);

  // Fix Error: Property 'wavFile' is missing
  const audioOptions = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: Platform.OS === 'android' ? 7 : 0,
    bufferSize: 4096,
    wavFile: 'temp.wav' // Added required property
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectWebSocket = () => {
    if (!roomId || !accessToken) return;

    const normalizedRoomId = String(roomId).trim().toLowerCase();
    let cleanBase = API_BASE_URL.replace('http://', '').replace('https://', '').replace(/\/$/, '');
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';
    const wsUrl = `${protocol}${cleanBase}/ws/py/live-subtitles?token=${accessToken}&roomId=${normalizedRoomId}&nativeLang=${nativeLang}&spokenLang=${spokenLang}`;

    if (ws.current) {
      try { ws.current.close(); } catch (_) { }
    }

    console.log("🔌 Connecting WS:", wsUrl);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("✅ Socket Open");
      initSubtitleAudioStream();
      setConnectionStatus("Connected. Waiting for peers...");

      // Gửi tín hiệu báo mình đã vào phòng
      sendSignalingMessage({ type: 'JOIN_ROOM' });
      startPing();
    };

    ws.current.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);

        // 1. Xử lý Subtitle
        if (data.type === 'subtitle') {
          handleSubtitleMessage(data);
          return;
        }

        // 2. Xử lý Signaling WebRTC
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

    ws.current.onclose = () => {
      stopPing();
      setConnectionStatus("Disconnected");
    };
  };

  const handleSignalingData = async (senderId: string, payload: any) => {
    const type = payload.type;

    if (type === 'JOIN_ROOM') {
      console.log(`👋 New peer joined: ${senderId}. Creating Offer.`);
      await createPeerConnection(senderId, true);
      return;
    }

    if (type === 'offer') {
      console.log(`📩 Received Offer from ${senderId}`);
      const pc = await createPeerConnection(senderId, false);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignalingMessage({ type: 'answer', targetId: senderId }, answer);
      }
      return;
    }

    if (type === 'answer') {
      console.log(`📩 Received Answer from ${senderId}`);
      const pc = peerConnections.current.get(senderId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
      }
      return;
    }

    if (type === 'ice_candidate') {
      const pc = peerConnections.current.get(senderId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
      return;
    }

    if (type === 'PING') {
      sendSignalingMessage({ type: 'PONG' });
    }
  };

  const createPeerConnection = async (partnerId: string, shouldCreateOffer: boolean) => {
    if (peerConnections.current.has(partnerId)) {
      return peerConnections.current.get(partnerId);
    }

    console.log(`🛠 Creating PC for ${partnerId}`);
    const pc = new RTCPeerConnection({ iceServers });

    // Fix Error: Property 'onicecandidate' does not exist...
    // Cast to any to access legacy event handlers
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
      if (event.streams && event.streams[0]) {
        console.log(`🎥 Received Stream from ${partnerId}`);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(partnerId, event.streams[0]);
          return newMap;
        });
      }
    };

    pcAny.oniceconnectionstatechange = () => {
      console.log(`❄️ ICE State with ${partnerId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        handlePeerDisconnect(partnerId);
      }
    };

    if (shouldCreateOffer) {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        sendSignalingMessage({ type: 'offer', targetId: partnerId }, offer);
      } catch (err) {
        console.error(`Error creating offer for ${partnerId}`, err);
      }
    }

    return pc;
  };

  const handlePeerDisconnect = (partnerId: string) => {
    console.log(`❌ Peer ${partnerId} disconnected`);
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
        type: 'webrtc_signal',
        roomId: roomId,
        senderId: user?.userId,
        payload: {
          ...meta,
          ...payloadData
        }
      };
      ws.current.send(JSON.stringify(message));
    }
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
        if (ws.current?.readyState === WebSocket.OPEN && isMicOn) {
          ws.current.send(JSON.stringify({ audio_chunk: base64Data }));
        }
      });
      if (isMicOn) LiveAudioStream.start();
    } catch (e) {
      console.error("AudioStream Init Error", e);
    }
  };

  const handleSubtitleMessage = useCallback((data: any) => {
    setSubtitle({
      original: data.original,
      originalLang: data.originalLang || 'en',
      translated: data.translated,
      translatedLang: data.translatedLang || nativeLang,
      senderId: data.senderId
    });
    setTimeout(() => setSubtitle(null), 5000);
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

  const cleanupCall = () => {
    stopPing();
    LiveAudioStream.stop();
    localStreamRef.current?.getTracks().forEach(track => track.stop());

    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    try { ws.current?.close(); } catch (_) { }
  };

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
    if (videoCallId && user?.userId) {
      updateCallStatus({ id: videoCallId, payload: { callerId: user.userId, status: VideoCallStatus.ENDED } });
    }
    navigation.goBack();
  };

  // --- RENDER UI (GRID) ---
  const renderRemoteVideos = () => {
    const streams = Array.from(remoteStreams.values());
    const count = streams.length;

    if (count === 0) {
      return (
        <View style={styles.remoteVideoPlaceholder}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.statusText}>{connectionStatus}</Text>
          {mode === 'RANDOM' && <Text style={{ color: '#9ca3af', marginTop: 10 }}>Finding someone to practice with...</Text>}
        </View>
      );
    }

    // Fix Error: Type 'string' is not assignable to type 'DimensionValue'.
    // Explicitly type these variables
    let width: DimensionValue = '100%';
    let height: DimensionValue = '100%';

    if (count === 1) {
      // 1-1: Full screen
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

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {renderRemoteVideos()}

        {/* Local Video (PiP) */}
        {localStream && (
          <View style={styles.localVideoContainer}>
            <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} />
          </View>
        )}

        <TouchableOpacity style={styles.endCallButton} onPress={handleCallEnd}>
          <Icon name="call-end" size={30} color="white" />
        </TouchableOpacity>

        {subtitleMode !== 'off' && subtitle && (
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitleSender}>{subtitle.senderId === user?.userId ? 'You' : 'Partner'}</Text>
            <Text style={styles.subtitleTextOriginal}>{subtitle.original}</Text>
            <Text style={styles.subtitleTextTranslated}>{subtitle.translated}</Text>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettings(true)}>
            <Icon name="chat" size={24} color="white" />
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

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: 'black' },
  gridContainer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  remoteVideoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827', gap: 20 },
  statusText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  localVideoContainer: { position: 'absolute', top: 60, right: 20, width: 100, height: 150, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#4b5563', backgroundColor: '#374151' },
  localVideo: { flex: 1 },
  endCallButton: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#ef4444', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  subtitleContainer: { position: 'absolute', bottom: 120, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 12 },
  subtitleSender: { color: '#9ca3af', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  subtitleTextOriginal: { color: '#e5e7eb', textAlign: 'center', marginBottom: 4 },
  subtitleTextTranslated: { color: '#fbbf24', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
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