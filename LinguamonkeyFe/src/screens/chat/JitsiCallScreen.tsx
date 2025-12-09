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
  DimensionValue
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

  const { useUpdateVideoCall } = useVideoCalls();
  const { mutate: updateCallStatus } = useUpdateVideoCall();

  const subtitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef({ lastUpdate: 0 });

  const [nativeLang] = useState(defaultNativeLangCode);
  const [spokenLang] = useState('auto');
  const [subtitleMode, setSubtitleMode] = useState<'dual' | 'native' | 'original' | 'off'>('dual');
  const [showSettings, setShowSettings] = useState(false);
  const [fullSubtitle, setFullSubtitle] = useState<SubtitleData | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');

  const wsSignal = useRef<WebSocket | null>(null);
  const wsAudio = useRef<WebSocket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidatesQueue = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pingInterval = useRef<any>(null);

  const audioOptions = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: Platform.OS === 'android' ? 6 : 0,
    bufferSize: 2048,
    wavFile: 'temp.wav'
  };

  useEffect(() => {
    let isMounted = true;
    const initializeCall = async () => {
      const stream = await getMediaStream();
      if (isMounted && stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;
        connectWebSockets();
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

  const connectWebSockets = () => {
    if (!roomId || !accessToken) return;

    const cleanBase = API_BASE_URL.replace('http://', '').replace('https://', '').replace(/\/$/, '');
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';
    const normalizedRoomId = String(roomId).trim().toLowerCase();

    // 1. Signaling WebSocket
    const signalUrl = `${protocol}${cleanBase}/ws/py/signal?token=${accessToken}&roomId=${normalizedRoomId}`;
    wsSignal.current = new WebSocket(signalUrl);
    wsSignal.current.onopen = () => {
      setConnectionStatus("Connected. Waiting...");
      setTimeout(() => sendSignalingMessage({ type: 'JOIN_ROOM' }), 500);
      startPing();
    };
    wsSignal.current.onmessage = async (e) => handleSignalMessage(JSON.parse(e.data));
    wsSignal.current.onclose = () => setConnectionStatus("Signal Disconnected");

    // 2. Audio/Subtitle WebSocket
    const audioUrl = `${protocol}${cleanBase}/ws/py/subtitles-audio?token=${accessToken}&roomId=${normalizedRoomId}&nativeLang=${nativeLang}&spokenLang=${spokenLang}`;
    wsAudio.current = new WebSocket(audioUrl);
    wsAudio.current.onopen = () => {
      initSubtitleAudioStream();
    };
    wsAudio.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'subtitle') handleSubtitleMessage(data);
    };
  };

  const handleSignalMessage = async (data: any) => {
    const { senderId, payload } = data;
    const myId = user?.userId;
    if (!senderId || senderId === myId) return;

    if (payload.type === 'JOIN_ROOM') {
      await createPeerConnection(senderId, true);
    } else if (payload.type === 'offer') {
      const pc = await createPeerConnection(senderId, false);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        await processIceQueue(senderId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignalingMessage({ type: 'answer', targetId: senderId }, answer);
      }
    } else if (payload.type === 'answer') {
      const pc = peerConnections.current.get(senderId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload));
    } else if (payload.type === 'ice_candidate') {
      const pc = peerConnections.current.get(senderId);
      const candidate = new RTCIceCandidate(payload.candidate);
      if (pc && pc.remoteDescription) await pc.addIceCandidate(candidate);
      else {
        const queue = iceCandidatesQueue.current.get(senderId) || [];
        queue.push(candidate);
        iceCandidatesQueue.current.set(senderId, queue);
      }
    }
  };

  const processIceQueue = async (partnerId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidatesQueue.current.get(partnerId);
    if (queue) {
      for (const c of queue) await pc.addIceCandidate(c);
      iceCandidatesQueue.current.delete(partnerId);
    }
  };

  const createPeerConnection = async (partnerId: string, shouldCreateOffer: boolean) => {
    if (peerConnections.current.has(partnerId)) return peerConnections.current.get(partnerId);

    const pc = new RTCPeerConnection({ iceServers }) as any;
    peerConnections.current.set(partnerId, pc);

    localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));

    pc.onicecandidate = (event: any) => {
      if (event.candidate) sendSignalingMessage({ type: 'ice_candidate', targetId: partnerId }, { candidate: event.candidate });
    };

    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams(prev => new Map(prev).set(partnerId, event.streams[0]));
        setConnectionStatus("Connected");
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        peerConnections.current.delete(partnerId);
        setRemoteStreams(prev => {
          const n = new Map(prev);
          n.delete(partnerId);
          return n;
        });
      }
    };

    if (shouldCreateOffer) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      sendSignalingMessage({ type: 'offer', targetId: partnerId }, offer);
    }
    return pc;
  };

  const sendSignalingMessage = (meta: any, payloadData?: any) => {
    if (wsSignal.current?.readyState === WebSocket.OPEN) {
      wsSignal.current.send(JSON.stringify({
        type: meta.type === 'JOIN_ROOM' ? 'JOIN_ROOM' : 'webrtc_signal',
        roomId,
        senderId: user?.userId,
        payload: { ...meta, ...payloadData }
      }));
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
      LiveAudioStream.on('data', (base64Data: string) => {
        if (!wsAudio.current || wsAudio.current.readyState !== WebSocket.OPEN || !isMicOn) return;
        try {
          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
          wsAudio.current.send(bytes.buffer);
        } catch (e) { }
      });
      if (isMicOn) LiveAudioStream.start();
    } catch (e) {
      console.error("AudioStream Init Error", e);
    }
  };

  const handleSubtitleMessage = useCallback((data: any) => {
    if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);

    const update = {
      originalFull: data.originalFull || '',
      originalLang: data.originalLang || 'en',
      translated: data.translated || '',
      translatedLang: data.translatedLang || nativeLang,
      senderId: data.senderId,
      status: data.status,
    };

    if (data.status === 'processing') {
      const now = Date.now();
      if (now - processingRef.current.lastUpdate > 250) {
        setFullSubtitle(update as SubtitleData);
        processingRef.current.lastUpdate = now;
      }
    } else {
      setFullSubtitle(update as SubtitleData);
    }

    if (data.status === 'complete' || data.status === 'noise') {
      subtitleTimeoutRef.current = setTimeout(() => setFullSubtitle(null), 4000);
    }
  }, [nativeLang]);

  const startPing = () => {
    if (pingInterval.current) clearInterval(pingInterval.current);
    pingInterval.current = setInterval(() => {
      if (wsSignal.current?.readyState === WebSocket.OPEN) wsSignal.current.send(JSON.stringify({ type: 'PING' }));
    }, 10000);
  };

  const cleanupCall = useCallback(() => {
    if (pingInterval.current) clearInterval(pingInterval.current);
    if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
    try { LiveAudioStream.stop(); } catch (_) { }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
    wsSignal.current?.close();
    wsAudio.current?.close();
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
    } catch (e) { return null; }
  };

  const handleCallEnd = () => {
    cleanupCall();
    if (videoCallId && user?.userId) {
      updateCallStatus({ id: videoCallId, payload: { callerId: user.userId, status: VideoCallStatus.ENDED } });
    }
    navigation.goBack();
  };

  const renderSubtitleText = (data: SubtitleData) => {
    if (!data.originalFull.trim() || data.senderId === user?.userId) return null;

    const displayOriginal = subtitleMode === 'dual' || subtitleMode === 'original' || !data.translated;
    const displayTranslated = (subtitleMode === 'dual' || subtitleMode === 'native') && !!data.translated;

    return (
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitleSender}>{t('Partner')}</Text>
        {displayOriginal && <Text style={styles.subtitleTextOriginal}>{data.originalFull}</Text>}
        {displayTranslated && <Text style={styles.subtitleTextTranslated}>{data.translated}</Text>}
        {!data.translated && data.status !== 'complete' && <Text style={[styles.subtitleTextTranslated, { color: '#6b7280' }]}>...</Text>}
      </View>
    );
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View style={styles.gridContainer}>
          {Array.from(remoteStreams.values()).map(s => (
            <View key={s.id} style={{ width: '100%', height: remoteStreams.size > 1 ? '50%' : '100%' }}>
              <RTCView streamURL={s.toURL()} style={{ flex: 1 }} objectFit="cover" />
            </View>
          ))}
          {remoteStreams.size === 0 && <View style={styles.remoteVideoPlaceholder}><Text style={styles.statusText}>{connectionStatus}</Text></View>}
        </View>

        {localStream && (
          <View style={styles.localVideoContainer}>
            <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} />
          </View>
        )}

        <TouchableOpacity style={styles.endCallButton} onPress={handleCallEnd}>
          <Icon name="call-end" size={30} color="white" />
        </TouchableOpacity>

        {subtitleMode !== 'off' && fullSubtitle && renderSubtitleText(fullSubtitle)}

        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettings(true)}>
            <Icon name="settings" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: isMicOn ? '#22c55e' : '#ef4444' }]} onPress={() => setIsMicOn(!isMicOn)}>
            <Icon name={isMicOn ? "mic" : "mic-off"} size={24} color="white" />
          </TouchableOpacity>
        </View>

        <Modal visible={showSettings} transparent animationType="fade">
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettings(false)} />
          <View style={styles.modalContainer}>
            <Text style={styles.sectionTitle}>{t('subtitle_mode')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {['dual', 'native', 'original', 'off'].map((m) => (
                <TouchableOpacity key={m} onPress={() => { setSubtitleMode(m as any); setShowSettings(false) }}
                  style={[styles.modeButton, subtitleMode === m && styles.modeButtonActive]}>
                  <Text style={{ color: 'white' }}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
  remoteVideoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  statusText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  localVideoContainer: { position: 'absolute', top: 60, right: 20, width: 100, height: 150, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#4b5563', backgroundColor: '#374151' },
  localVideo: { flex: 1 },
  endCallButton: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#ef4444', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  subtitleContainer: { position: 'absolute', bottom: 120, alignSelf: 'center', padding: 12, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.8)', maxWidth: windowWidth * 0.9 },
  subtitleSender: { color: '#9ca3af', fontSize: 12, fontWeight: 'bold', marginBottom: 2, textAlign: 'center' },
  subtitleTextOriginal: { color: '#e5e7eb', marginBottom: 4, fontSize: 16, textAlign: 'center' },
  subtitleTextTranslated: { color: '#fbbf24', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  controls: { position: 'absolute', top: 60, left: 20, gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { height: '25%', backgroundColor: '#1f2937', marginTop: 'auto', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sectionTitle: { color: '#9ca3af', fontWeight: 'bold', marginBottom: 10 },
  modeButton: { padding: 10, backgroundColor: '#374151', borderRadius: 8, minWidth: '45%', alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: '#4f46e5' },
});

export default WebRTCCallScreen;