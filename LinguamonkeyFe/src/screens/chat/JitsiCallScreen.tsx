import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, PermissionsAndroid, Platform, ActivityIndicator } from 'react-native';
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

type SubtitleMode = 'dual' | 'native' | 'original' | 'off';

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'zh', name: 'Chinese' },
];

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
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
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('dual');
  const [showSettings, setShowSettings] = useState(false);
  const [subtitle, setSubtitle] = useState<SubtitleData | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');

  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidate[]>([]);
  const isOfferCreated = useRef<boolean>(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const partnerReady = useRef<boolean>(false); // Bridge memory: Remember if partner signaled

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
    const startStream = async () => {
      const stream = await getMediaStream();
      if (isMounted && stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;
        setupPeerConnection(stream);
      }
    };
    startStream();
    return () => {
      isMounted = false;
      stopPing();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current.release();
      }
      if (pc.current) pc.current.close();
    };
  }, []);

  // Attempt handshake immediately when videoCallData is loaded IF partner already signaled
  useEffect(() => {
    if (videoCallData && partnerReady.current) {
      checkAndCreateOffer();
    }
  }, [videoCallData]);

  const stopPing = () => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
  };

  const startPing = () => {
    stopPing();
    console.log("📡 Starting Ping-Pong mechanism...");
    pingInterval.current = setInterval(() => {
      const state = pc.current?.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        stopPing();
        return;
      }
      // Keep sending PING until connected
      sendSignalingMessage({ type: 'PING' });
    }, 2000);
  };

  useEffect(() => {
    if (!roomId || !accessToken) return;

    // Strict normalization for bridging consistency
    const normalizedRoomId = String(roomId).trim().toLowerCase();

    let cleanBase = API_BASE_URL.replace('http://', '').replace('https://', '');
    if (cleanBase.endsWith('/')) cleanBase = cleanBase.slice(0, -1);
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';

    const wsUrl = `${protocol}${cleanBase}/ws/py/live-subtitles?token=${accessToken}&roomId=${normalizedRoomId}&nativeLang=${nativeLang}&spokenLang=${spokenLang}`;

    if (ws.current) ws.current.close();
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("✅ Socket Open - Ready for handshake");
      setConnectionStatus("Waiting for Partner...");
      initSubtitleAudioStream();
      startPing();
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === 'subtitle') {
          handleSubtitleMessage(data);
          return;
        }

        if (data.type === 'webrtc_signal') {
          // Ignore own messages
          if (String(data.senderId) === String(user?.userId)) return;

          const payload = data.payload;

          if (payload.type === 'PING') {
            partnerReady.current = true;
            sendSignalingMessage({ type: 'PONG' });
            checkAndCreateOffer();
          }
          else if (payload.type === 'PONG') {
            console.log("📡 Received PONG from Partner");
            partnerReady.current = true;
            checkAndCreateOffer();
          }
          else {
            handleSignaling(payload);
          }
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
      if (ws.current) ws.current.close();
    };
  }, [roomId, accessToken, nativeLang, spokenLang]);

  const checkAndCreateOffer = () => {
    // Critical: Only proceed if we know who the caller is
    if (!videoCallData || !user?.userId) {
      console.log("⏳ Handshake deferred: Waiting for videoCallData or UserID");
      return;
    }

    const myId = String(user.userId);
    const callerId = String(videoCallData.callerId);

    // Determines Role: Only the original Caller initiates the Offer
    if (myId === callerId) {
      if (!isOfferCreated.current) {
        console.log("🚀 I am Caller & Partner is Ready -> Creating Offer");
        createOffer();
      }
    }
  };

  const setupPeerConnection = (stream: MediaStream) => {
    if (pc.current) return;
    const configuration = { iceServers };
    pc.current = new RTCPeerConnection(configuration);

    stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

    const pcAny = pc.current as any;

    pcAny.onicecandidate = (event: any) => {
      if (event.candidate) {
        sendSignalingMessage({ type: 'ice_candidate', candidate: event.candidate });
      }
    };

    pcAny.ontrack = (event: any) => {
      console.log("🎥 Received Remote Stream!");
      setConnectionStatus("Connected");
      stopPing();
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pcAny.oniceconnectionstatechange = () => {
      const state = pc.current?.iceConnectionState;
      setConnectionStatus(`State: ${state}`);
      console.log(`❄️ ICE State Change: ${state}`);
      if (state === 'connected' || state === 'completed') {
        stopPing();
      } else if (state === 'disconnected' || state === 'failed') {
        startPing(); // Restart handshake if connection drops
      }
    };
  };

  const createOffer = async () => {
    if (!pc.current) return;
    try {
      isOfferCreated.current = true;
      const offer = await pc.current.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.current.setLocalDescription(offer);
      sendSignalingMessage(pc.current.localDescription);
    } catch (err) {
      console.error("Create Offer Error", err);
      isOfferCreated.current = false; // Reset on error to allow retry
    }
  };

  const handleSignaling = async (data: any) => {
    if (!pc.current) return;
    try {
      if (data.type === 'offer') {
        stopPing();
        console.log("📩 Received Offer - Creating Answer");
        await pc.current.setRemoteDescription(new RTCSessionDescription(data));

        // Process queued candidates
        while (iceCandidateQueue.current.length) {
          const c = iceCandidateQueue.current.shift();
          if (c) await pc.current.addIceCandidate(c);
        }

        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        sendSignalingMessage(pc.current.localDescription);
      }
      else if (data.type === 'answer') {
        console.log("📩 Received Answer - Connection Establishing");
        await pc.current.setRemoteDescription(new RTCSessionDescription(data));
      }
      else if (data.type === 'ice_candidate') {
        if (pc.current.remoteDescription) {
          await pc.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          iceCandidateQueue.current.push(new RTCIceCandidate(data.candidate));
        }
      }
    } catch (err) {
      console.error("Signaling Error", err);
    }
  };

  const sendSignalingMessage = (msg: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({
        type: 'webrtc_signal',
        roomId: roomId, // Raw roomId, server will normalize
        senderId: user?.userId,
        payload: msg
      });
      ws.current.send(payload);
    }
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
        video: { width: 640, height: 480, frameRate: 30, facingMode: 'user' }
      });
    } catch (e) {
      console.error("User Media Error", e);
      return null;
    }
  };

  const handleSubtitleMessage = (data: any) => {
    setSubtitle({
      original: data.original,
      originalLang: data.originalLang || 'en',
      translated: data.translated,
      translatedLang: data.translatedLang || nativeLang,
      senderId: data.senderId
    });
    setTimeout(() => setSubtitle(null), 5000);
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
      console.error("Audio Stream Error", e);
    }
  };

  const handleCallEnd = () => {
    if (videoCallId && user?.userId) {
      updateCallStatus({ id: videoCallId, payload: { callerId: user.userId, status: VideoCallStatus.ENDED } });
    }
    navigation.goBack();
  };

  const renderSubtitleContent = () => {
    if (subtitleMode === 'off' || !subtitle) return null;
    const showOriginal = subtitleMode === 'dual' || subtitleMode === 'original';
    const showTranslated = subtitleMode === 'dual' || subtitleMode === 'native';
    return (
      <>
        {showOriginal && (
          <Text style={styles.subtitleTextOriginal}>
            {String(subtitle.senderId) === String(user?.userId) ? `${t('you')}: ` : `${t('partner')}: `}{subtitle.original}
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

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {remoteStream ? (
          <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.statusText}>{connectionStatus}</Text>
            <Text style={styles.hintText}>Looking for partner...</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => { isOfferCreated.current = false; startPing(); }}>
              <Text style={styles.retryText}>Retry Handshake 📡</Text>
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
          <View style={styles.subtitleContainer}>{renderSubtitleContent()}</View>
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

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Spoken Language</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.langItem, item.code === spokenLang && styles.langItemActive]} onPress={() => { setSpokenLang(item.code); setShowSettings(false) }}>
                  <Text style={{ color: 'white' }}>{item.name}</Text>
                  {item.code === spokenLang && <Icon name="check" size={20} color="white" />}
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
  remoteVideo: { flex: 1, width: '100%', height: '100%', backgroundColor: '#111827' },
  remoteVideoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827', gap: 20 },
  statusText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  hintText: { color: '#9ca3af', fontSize: 14 },
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
  modalContainer: { height: '50%', backgroundColor: '#1f2937', marginTop: 'auto', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sectionTitle: { color: '#9ca3af', fontWeight: 'bold', marginBottom: 10 },
  modeButton: { padding: 10, backgroundColor: '#374151', borderRadius: 8, minWidth: '45%', alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: '#4f46e5' },
  divider: { height: 1, backgroundColor: '#374151', marginVertical: 20 },
  langItem: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#374151' },
  langItemActive: { backgroundColor: '#374151' }
});

export default WebRTCCallScreen;