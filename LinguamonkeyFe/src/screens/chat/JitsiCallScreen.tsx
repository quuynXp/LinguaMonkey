import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, PermissionsAndroid, Platform, ActivityIndicator } from 'react-native';
import { RTCView, RTCIceCandidate, RTCSessionDescription, mediaDevices, RTCPeerConnection, MediaStream } from 'react-native-webrtc';
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
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

const WebRTCCallScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<WebRTCParams, 'WebRTCCall'>>();
  const navigation = useNavigation();
  const { roomId, videoCallId } = route.params;

  const { user } = useUserStore();
  const accessToken = useTokenStore.getState().accessToken;
  const defaultNativeLangCode = useAppStore.getState().nativeLanguage || 'vi';

  const { useUpdateVideoCall, useVideoCall } = useVideoCalls();
  const { mutate: updateCallStatus } = useUpdateVideoCall();
  const { data: videoCallData } = useVideoCall(videoCallId);

  const [nativeLang, setNativeLang] = useState(defaultNativeLangCode);
  const [spokenLang, setSpokenLang] = useState('auto');
  const [subtitleMode, setSubtitleMode] = useState<'dual' | 'native' | 'original' | 'off'>('dual');
  const [showSettings, setShowSettings] = useState(false);
  const [subtitle, setSubtitle] = useState<SubtitleData | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');

  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);

  const pendingSignalingQueue = useRef<any[]>([]);
  const isPCReady = useRef<boolean>(false);
  const isOfferCreated = useRef<boolean>(false);
  const partnerReady = useRef<boolean>(false);

  const audioOptions = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6,
    bufferSize: 4096,
    wavFile: 'temp_audio.wav'
  };

  useEffect(() => {
    let isMounted = true;

    const initializeCall = async () => {
      console.log("🚀 Starting initialization...");
      const stream = await getMediaStream();

      if (isMounted && stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;
        setupPeerConnection(stream);
        isPCReady.current = true;
        await processPendingSignals();
        tryStartPingWhenReady();
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

  useEffect(() => {
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
      setConnectionStatus("Looking for Partner...");
      initSubtitleAudioStream();
      tryStartPingWhenReady();
    };

    ws.current.onmessage = (e) => {
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

          if (payload?.type === 'PING') {
            console.log(`📡 PING received from ${senderId}`);
            partnerReady.current = true;
            setConnectionStatus("Partner Found. Negotiating...");
            sendSignalingMessage({ type: 'PONG' });
            decideAndMaybeCreateOffer(senderId);
            return;
          }

          if (payload?.type === 'PONG') {
            console.log(`📡 PONG received from ${senderId}`);
            partnerReady.current = true;
            setConnectionStatus("Partner Found. Negotiating...");
            decideAndMaybeCreateOffer(senderId);
            return;
          }

          handleSignaling(payload);
        }
      } catch (err) {
        console.error("WS Message Error", err);
      }
    };

    ws.current.onclose = () => {
      stopPing();
      setConnectionStatus("Disconnected");
    };

    return () => {
      LiveAudioStream.stop();
      try { ws.current?.close(); } catch (_) { }
    };
  }, [roomId, accessToken, nativeLang, spokenLang, user?.userId]);

  const tryStartPingWhenReady = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && isPCReady.current) {
      startPing();
    }
  };

  const decideAndMaybeCreateOffer = (partnerId: string) => {
    if (isOfferCreated.current) return;
    if (!pc.current || !isPCReady.current) return;

    const myId = String(user?.userId || "");
    const otherId = String(partnerId || "");

    console.log(`⚖️ Tie-Breaker: Me(${myId}) vs Partner(${otherId})`);

    // Deterministic Logic: String comparison
    // Whoever has the "smaller" ID string creates the offer
    if (myId < otherId) {
      console.log("👑 I am the Caller (based on ID)");
      createOffer();
    } else {
      console.log("👂 I am the Receiver (waiting for offer)");
      setConnectionStatus("Waiting for Offer...");
    }
  };

  const setupPeerConnection = (stream: MediaStream) => {
    if (pc.current) return;

    const configuration = { iceServers };
    pc.current = new RTCPeerConnection(configuration);

    stream.getTracks().forEach(track => {
      pc.current?.addTrack(track, stream);
    });

    const pcAny = pc.current as any;

    pcAny.onicecandidate = (event: any) => {
      if (event.candidate) {
        sendSignalingMessage({ type: 'ice_candidate', candidate: event.candidate });
      }
    };

    pcAny.ontrack = (event: any) => {
      console.log("🎥 Remote Stream Received via ontrack");
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setConnectionStatus("Connected");
        stopPing();
      }
    };

    pcAny.oniceconnectionstatechange = () => {
      const state = pc.current?.iceConnectionState;
      console.log(`❄️ ICE State: ${state}`);
      if (state === 'connected' || state === 'completed') {
        setConnectionStatus("Connected");
        stopPing();
      } else if (state === 'failed' || state === 'disconnected') {
        setConnectionStatus(`Connection ${state}`);
        restartHandshake();
      } else {
        setConnectionStatus(`Connecting (${state})...`);
      }
    };
  };

  const processPendingSignals = async () => {
    while (pendingSignalingQueue.current.length > 0) {
      const payload = pendingSignalingQueue.current.shift();
      await handleSignaling(payload);
    }
  };

  const handleSignaling = async (data: any) => {
    if (!pc.current || !isPCReady.current) {
      pendingSignalingQueue.current.push(data);
      return;
    }

    try {
      if (data.type === 'offer') {
        console.log("📩 Handling Offer");
        stopPing();
        await pc.current.setRemoteDescription(new RTCSessionDescription(data));

        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);

        sendSignalingMessage(pc.current.localDescription);
      } else if (data.type === 'answer') {
        console.log("📩 Handling Answer");
        await pc.current.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.type === 'ice_candidate') {
        await pc.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (err) {
      console.error("Signaling Error:", err);
    }
  };

  const createOffer = async () => {
    if (!pc.current) return;
    try {
      isOfferCreated.current = true;
      const offer = await pc.current.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.current.setLocalDescription(offer);
      sendSignalingMessage(pc.current.localDescription);
      console.log("📤 Offer Sent");
    } catch (err) {
      console.error("Create Offer Failed", err);
      isOfferCreated.current = false;
    }
  };

  const sendSignalingMessage = (msg: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'webrtc_signal',
        roomId: roomId,
        senderId: user?.userId,
        payload: msg
      };
      ws.current.send(JSON.stringify(payload));
    }
  };

  const startPing = () => {
    stopPing();
    pingInterval.current = setInterval(() => {
      if (pc.current?.iceConnectionState !== 'connected') {
        sendSignalingMessage({ type: 'PING' });
      }
    }, 2000);
  };

  const stopPing = () => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
  };

  const restartHandshake = () => {
    console.log("♻️ Restarting Handshake");
    isOfferCreated.current = false;
    startPing();
  };

  const cleanupCall = () => {
    stopPing();
    LiveAudioStream.stop();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (pc.current) pc.current.close();
    try { ws.current?.close(); } catch (_) { }
  };

  const getMediaStream = async () => {
    if (Platform.OS === 'android') {
      const perms = [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      const granted = await PermissionsAndroid.requestMultiple(perms);
      if (granted[PermissionsAndroid.PERMISSIONS.CAMERA] !== 'granted') return null;
    }
    try {
      return await mediaDevices.getUserMedia({
        audio: true,
        video: { width: 640, height: 480, frameRate: 24, facingMode: 'user' }
      });
    } catch (e) {
      console.error("getUserMedia Error", e);
      return null;
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
      LiveAudioStream.start();
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

  const handleCallEnd = () => {
    if (videoCallId && user?.userId) {
      updateCallStatus({ id: videoCallId, payload: { callerId: user.userId, status: VideoCallStatus.ENDED } });
    }
    navigation.goBack();
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {remoteStream ? (
          <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.statusText}>{connectionStatus}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={restartHandshake}>
              <Text style={styles.retryText}>Retry Signal</Text>
            </TouchableOpacity>
          </View>
        )}

        {localStream && (
          <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} />
        )}

        <TouchableOpacity style={styles.endCallButton} onPress={handleCallEnd}>
          <Icon name="call-end" size={30} color="white" />
        </TouchableOpacity>

        {subtitleMode !== 'off' && subtitle && (
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitleTextOriginal}>
              {String(subtitle.senderId) === String(user?.userId) ? `${t('you')}: ` : `${t('partner')}: `}{subtitle.original}
            </Text>
            <Text style={styles.subtitleTextTranslated}>{subtitle.translated}</Text>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettings(true)}>
            <Icon name="chat" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: isMicOn ? '#ef4444' : '#22c55e' }]} onPress={() => setIsMicOn(!isMicOn)}>
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
          </View>
        </Modal>
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: 'black' },
  remoteVideo: { flex: 1, width: '100%', height: '100%', backgroundColor: '#111827' },
  remoteVideoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827', gap: 20 },
  statusText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  retryButton: { padding: 10, backgroundColor: '#374151', borderRadius: 8, marginTop: 20 },
  retryText: { color: '#fbbf24', fontWeight: 'bold' },
  localVideo: { position: 'absolute', top: 60, right: 20, width: 100, height: 150, borderRadius: 8, backgroundColor: '#374151', borderWidth: 1, borderColor: '#4b5563' },
  endCallButton: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#ef4444', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  subtitleContainer: { position: 'absolute', bottom: 120, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 12 },
  subtitleTextOriginal: { color: '#e5e7eb', textAlign: 'center', marginBottom: 4 },
  subtitleTextTranslated: { color: '#fbbf24', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  controls: { position: 'absolute', top: 60, left: 20, gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { height: '30%', backgroundColor: '#1f2937', marginTop: 'auto', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sectionTitle: { color: '#9ca3af', fontWeight: 'bold', marginBottom: 10 },
  modeButton: { padding: 10, backgroundColor: '#374151', borderRadius: 8, minWidth: '45%', alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: '#4f46e5' }
});

export default WebRTCCallScreen;