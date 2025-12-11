import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  Pressable
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
import Icon from 'react-native-vector-icons/MaterialIcons';
import LiveAudioStream from 'react-native-live-audio-stream';

// Store & Hooks
import { useAppStore } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useTokenStore } from '../../stores/tokenStore';
import { API_BASE_URL } from '../../api/apiConfig';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useVideoCalls } from '../../hooks/useVideos';
import { VideoCallStatus, FriendshipStatus } from '../../types/enums';
import { useUsers } from '../../hooks/useUsers';
import { useFriendships } from '../../hooks/useFriendships';
import { getAvatarSource } from '../../utils/avatarUtils'; // Đảm bảo bạn có util này hoặc thay bằng uri ảnh

// --- COMPONENT: MINI USER PROFILE (Popup xem nhanh thông tin) ---
const MiniUserProfile = ({ userId, currentUserId, onClose }: { userId: string, currentUserId: string, onClose: () => void }) => {
  const { t } = useTranslation();
  const { useUserProfile, useAdmireUser } = useUsers();
  const { useCreateFriendship } = useFriendships();

  const { data: profile, isLoading } = useUserProfile(userId);
  const admireMutation = useAdmireUser();
  const createFriendshipMutation = useCreateFriendship();

  if (isLoading || !profile) {
    return (
      <View style={styles.miniProfileContainer}>
        <ActivityIndicator color="#4f46e5" />
      </View>
    );
  }

  const isFriend = profile.isFriend;
  const hasSentRequest = profile.friendRequestStatus?.hasSentRequest;

  const handleAddFriend = () => {
    if (isFriend || hasSentRequest) return;
    createFriendshipMutation.mutate({
      requesterId: currentUserId,
      receiverId: userId,
      status: FriendshipStatus.PENDING
    });
  };

  const handleAdmire = () => {
    if (!profile.hasAdmired) {
      admireMutation.mutate(userId);
    }
  };

  return (
    <View style={styles.miniProfileContainer}>
      <View style={styles.miniProfileHeader}>
        <Image source={getAvatarSource(profile.avatarUrl, profile.gender)} style={styles.miniAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.miniName}>{profile.fullname}</Text>
          <Text style={styles.miniNickname}>@{profile.nickname}</Text>
          {profile.country && <Text style={styles.miniCountry}>{profile.country}</Text>}
        </View>
        <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
          <Icon name="close" size={24} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View style={styles.miniStatsRow}>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatVal}>{profile.level || 0}</Text>
          <Text style={styles.miniStatLabel}>Level</Text>
        </View>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatVal}>{profile.streak || 0}🔥</Text>
          <Text style={styles.miniStatLabel}>Streak</Text>
        </View>
      </View>

      <View style={styles.miniActions}>
        {/* Nút Kết bạn */}
        {!isFriend && (
          <TouchableOpacity
            onPress={handleAddFriend}
            disabled={hasSentRequest}
            style={[styles.miniBtn, hasSentRequest ? styles.btnDisabled : styles.btnAdd]}
          >
            <Icon name={hasSentRequest ? "check" : "person-add"} size={20} color="white" />
            <Text style={styles.miniBtnText}>{hasSentRequest ? t('sent') : t('add_friend')}</Text>
          </TouchableOpacity>
        )}

        {/* Nút Admire */}
        <TouchableOpacity
          onPress={handleAdmire}
          disabled={profile.hasAdmired}
          style={[styles.miniBtn, profile.hasAdmired ? styles.btnAdmired : styles.btnAdmire]}
        >
          <Icon name="favorite" size={20} color={profile.hasAdmired ? 'white' : '#db2777'} />
          <Text style={[styles.miniBtnText, !profile.hasAdmired && { color: '#db2777' }]}>
            {profile.admirationCount}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- COMPONENT: REMOTE VIDEO (Memoized) ---
const RemoteVideoItem = React.memo(({ stream, style }: { stream: MediaStream, style: any }) => {
  return (
    <View style={style}>
      <RTCView streamURL={stream.toURL()} style={{ flex: 1 }} objectFit="cover" />
    </View>
  );
}, (prev, next) => prev.stream.id === next.stream.id);

RemoteVideoItem.displayName = 'RemoteVideoItem';

// --- COMPONENT: SUBTITLE OVERLAY (Fixed Logic) ---
const SubtitleOverlay = React.memo(({ data, mode, t, currentUserId }: any) => {
  if (!data || mode === 'off' || !data.originalFull?.trim()) return null;

  const isMe = data.senderId === currentUserId;
  const { originalFull, translated } = data;

  // Hiển thị cho bản thân (Luôn hiện ngôn ngữ gốc để check mic)
  if (isMe) {
    return (
      <View style={styles.subtitleContainer}>
        <Text style={[styles.subtitleSender, { textAlign: 'center', color: '#818cf8' }]}>{t('you') || 'Bạn'}</Text>
        <Text style={[styles.subtitleTextOriginal, { textAlign: 'center' }]}>{originalFull}</Text>
      </View>
    );
  }

  // Logic hiển thị chuẩn theo chế độ
  const showOriginal = mode === 'dual' || mode === 'original';
  const showTranslated = mode === 'dual' || mode === 'native';

  // Logic Fallback: Nếu chọn Native mà chưa có dịch -> Hiện original mờ
  const isTranslating = !translated && originalFull !== "hmm...";
  const effectiveShowOriginal = showOriginal || (mode === 'native' && isTranslating);

  return (
    <View style={styles.subtitleContainer}>
      <Text style={[styles.subtitleSender, { textAlign: 'center' }]}>{t('partner') || 'Đối phương'}</Text>

      {effectiveShowOriginal && (
        <Text style={[
          styles.subtitleTextOriginal,
          { textAlign: 'center' },
          mode === 'native' && isTranslating && { opacity: 0.6, fontSize: 14 } // Style fallback
        ]}>
          {originalFull}
        </Text>
      )}

      {showTranslated && translated && (
        <Text style={[styles.subtitleTextTranslated, { textAlign: 'center' }]}>{translated}</Text>
      )}

      {/* Loading state visual */}
      {showTranslated && isTranslating && (
        <Text style={[styles.subtitleTextTranslated, { textAlign: 'center', color: '#9ca3af', fontSize: 14, fontStyle: 'italic' }]}>
          {t('translating') || '...'}
        </Text>
      )}
    </View>
  );
}, (prev, next) => {
  return prev.data?.originalFull === next.data?.originalFull &&
    prev.data?.translated === next.data?.translated &&
    prev.mode === next.mode;
});

SubtitleOverlay.displayName = 'SubtitleOverlay';

type WebRTCParams = {
  WebRTCCall: { roomId: string; videoCallId: string; isCaller?: boolean; mode?: 'RANDOM' | 'GROUP'; };
};

type SubtitleData = {
  originalFull: string; originalLang: string; translated: string; translatedLang: string; senderId: string; status?: 'processing' | 'complete' | 'noise';
};

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// --- MAIN SCREEN ---
const WebRTCCallScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<WebRTCParams, 'WebRTCCall'>>();
  const navigation = useNavigation();
  const { roomId, videoCallId } = route.params;

  const { user } = useUserStore();
  const accessToken = useTokenStore.getState().accessToken;
  const defaultNativeLangCode = useAppStore.getState().nativeLanguage || 'vi';
  const { callPreferences, setCallPreferences } = useAppStore();

  const { useUpdateVideoCall } = useVideoCalls();
  const { mutate: updateCallStatus } = useUpdateVideoCall();

  // Refs
  const wsSignal = useRef<WebSocket | null>(null);
  const wsAudio = useRef<WebSocket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const isManuallyClosed = useRef(false);
  const subtitleTimeoutRef = useRef<any>(null);

  // States
  const [isMicOn, setIsMicOn] = useState(callPreferences.micEnabled);
  const [isCameraOn, setIsCameraOn] = useState(callPreferences.cameraEnabled); // New State Camera
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');

  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [settingTab, setSettingTab] = useState<'subtitle' | 'participants'>('subtitle'); // Tab trong settings
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null); // Để show popup profile
  const [fullSubtitle, setFullSubtitle] = useState<SubtitleData | null>(null);

  // Gửi config audio khi thay đổi preference
  const sendAudioConfig = useCallback(() => {
    if (wsAudio.current?.readyState === WebSocket.OPEN) {
      wsAudio.current.send(JSON.stringify({
        config: {
          subtitleMode: callPreferences.subtitleMode,
          micEnabled: callPreferences.micEnabled
        }
      }));
    }
  }, [callPreferences.subtitleMode, callPreferences.micEnabled]);

  // Audio Options
  const audioOptions = useMemo(() => ({
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: Platform.OS === 'android' ? 7 : 0,
    bufferSize: 2048,
    wavFile: 'temp.wav'
  }), []);

  // --- AUDIO SOCKET LOGIC ---
  const initSubtitleAudioStream = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    setTimeout(() => {
      if (isManuallyClosed.current) return;
      try {
        LiveAudioStream.stop();
        LiveAudioStream.init(audioOptions);

        LiveAudioStream.on('data', (base64Data: string) => {
          console.log("🎤 Audio chunk size:", base64Data.length);

          if (wsAudio.current?.readyState === WebSocket.OPEN && isMicOn) {
            // Gửi data
            wsAudio.current.send(JSON.stringify({ audio: base64Data }));
          }
        });

        if (isMicOn) {
          console.log("✅ Starting LiveAudioStream...");
          LiveAudioStream.start();
        }
      } catch (e) {
        console.error("❌ Audio Init Error:", e);
      }
    }, 2000); // Tăng delay lên 2s để tránh race condition với WebRTC
  }, [isMicOn, audioOptions]);

  const connectAudioSocket = useCallback(() => {
    if (!roomId || !accessToken || isManuallyClosed.current) return;
    if (wsAudio.current) { wsAudio.current.close(); wsAudio.current = null; }

    const normalizedRoomId = String(roomId).trim().toLowerCase();
    let cleanBase = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';
    const url = `${protocol}${cleanBase}/ws/py/subtitles-audio?token=${accessToken}&roomId=${normalizedRoomId}&nativeLang=${defaultNativeLangCode}`;

    const ws = new WebSocket(url);
    wsAudio.current = ws;

    ws.onopen = () => {
      initSubtitleAudioStream();
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            config: {
              subtitleMode: useAppStore.getState().callPreferences.subtitleMode,
              micEnabled: useAppStore.getState().callPreferences.micEnabled
            }
          }));
        }
      }, 500);
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'subtitle') {
          if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
          setFullSubtitle(data);
          if (data.status === 'complete') {
            subtitleTimeoutRef.current = setTimeout(() => setFullSubtitle(null), 4000);
          }
        }
      } catch (_) { }
    };
    ws.onclose = () => {
      if (!isManuallyClosed.current) setTimeout(connectAudioSocket, 5000);
    };
  }, [roomId, accessToken, defaultNativeLangCode, initSubtitleAudioStream]);

  // --- WEBRTC LOGIC ---
  const getMediaStream = useCallback(async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
          facingMode: 'user'
        }
      });
      return stream;
    } catch (e) { return null; }
  }, []);

  const createPeerConnection = useCallback(async (partnerId: string, shouldCreateOffer: boolean) => {
    if (peerConnections.current.has(partnerId)) return peerConnections.current.get(partnerId);
    const pc = new RTCPeerConnection({ iceServers });
    peerConnections.current.set(partnerId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    (pc as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        sendSignalingMessage({ type: 'ice_candidate', targetId: partnerId }, { candidate: event.candidate });
      }
    };

    (pc as any).ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams(prev => new Map(prev).set(partnerId, event.streams[0]));
        setConnectionStatus("Connected");
      }
    };

    if (shouldCreateOffer) {
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      sendSignalingMessage({ type: 'offer', targetId: partnerId }, offer);
    }
    return pc;
  }, []);

  const sendSignalingMessage = useCallback((meta: any, payloadData?: any) => {
    if (wsSignal.current?.readyState === WebSocket.OPEN) {
      wsSignal.current.send(JSON.stringify({
        type: meta.type === 'JOIN_ROOM' ? 'JOIN_ROOM' : 'webrtc_signal',
        roomId, senderId: user?.userId, payload: { ...meta, ...payloadData }
      }));
    }
  }, [roomId, user?.userId]);

  const connectSignalingSocket = useCallback(() => {
    if (!roomId || !accessToken || isManuallyClosed.current) return;
    if (wsSignal.current) { wsSignal.current.close(); }

    const normalizedRoomId = String(roomId).trim().toLowerCase();
    let cleanBase = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';
    const url = `${protocol}${cleanBase}/ws/py/signal?token=${accessToken}&roomId=${normalizedRoomId}`;

    const ws = new WebSocket(url);
    wsSignal.current = ws;

    ws.onopen = () => {
      setConnectionStatus("Waiting for partner...");
      sendSignalingMessage({ type: 'JOIN_ROOM' });
    };
    ws.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'webrtc_signal' || data.type === 'JOIN_ROOM') {
          const senderId = String(data.senderId);
          if (senderId === String(user?.userId)) return;
          const payload = data.payload || data;

          if (payload.type === 'JOIN_ROOM') {
            await createPeerConnection(senderId, true);
          } else if (payload.type === 'offer') {
            const pc = await createPeerConnection(senderId, false);
            await pc?.setRemoteDescription(new RTCSessionDescription(payload));
            const answer = await pc?.createAnswer();
            await pc?.setLocalDescription(answer);
            sendSignalingMessage({ type: 'answer', targetId: senderId }, answer);
          } else if (payload.type === 'answer') {
            const pc = peerConnections.current.get(senderId);
            await pc?.setRemoteDescription(new RTCSessionDescription(payload));
          } else if (payload.type === 'ice_candidate') {
            const pc = peerConnections.current.get(senderId);
            await pc?.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        }
      } catch (_) { }
    };
  }, [roomId, accessToken, user?.userId, createPeerConnection, sendSignalingMessage]);

  useEffect(() => {
    sendAudioConfig();
  }, [callPreferences.subtitleMode, callPreferences.micEnabled, sendAudioConfig]);

  // --- INIT & CLEANUP ---
  useEffect(() => {
    let isMounted = true;
    const startCall = async () => {
      const stream = await getMediaStream();
      if (isMounted && stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;

        // Apply initial config
        stream.getAudioTracks().forEach(t => t.enabled = callPreferences.micEnabled);
        stream.getVideoTracks().forEach(t => t.enabled = callPreferences.cameraEnabled); // Apply camera config

        connectSignalingSocket();
        connectAudioSocket();
      }
    };
    startCall();

    return () => {
      isMounted = false;
      isManuallyClosed.current = true;
      try { LiveAudioStream.stop(); } catch (e) { }
      if (wsSignal.current) wsSignal.current.close();
      if (wsAudio.current) wsAudio.current.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnections.current.forEach(pc => pc.close());
    };
  }, []);

  // --- ACTIONS ---
  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    setCallPreferences({ micEnabled: newState });

    // 1. WebRTC Track (Mute đối với partner)
    localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = newState);

    // 2. STT Logic (Ngừng gửi data, KHÔNG gọi stop() để tránh mất audio session)
    if (newState) LiveAudioStream.start();
    // Nếu tắt mic, ta chỉ cần ngừng gửi ở hàm on('data') là đủ an toàn
  };

  const toggleCamera = () => {
    const newState = !isCameraOn;
    setIsCameraOn(newState);
    setCallPreferences({ cameraEnabled: newState });

    // Chỉ disable track video, không stop stream
    localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = newState);
  };

  const handleCallEnd = () => {
    if (videoCallId && user?.userId) {
      updateCallStatus({ id: videoCallId, payload: { callerId: user.userId, status: VideoCallStatus.ENDED } });
    }
    navigation.goBack();
  };

  const remoteStreamsArr = Array.from(remoteStreams.entries()); // [id, stream]

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {/* REMOTE VIDEOS */}
        {remoteStreamsArr.length > 0 ? (
          <View style={styles.gridContainer}>
            {remoteStreamsArr.map(([id, stream]) => (
              <RemoteVideoItem key={id} stream={stream} style={{ width: '100%', height: '100%' }} />
            ))}
          </View>
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.statusText}>{connectionStatus}</Text>
          </View>
        )}

        {/* LOCAL VIDEO */}
        {localStream && (
          <View style={styles.localVideoContainer}>
            {isCameraOn ? (
              <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} />
            ) : (
              <View style={[styles.localVideo, styles.cameraOffPlaceholder]}>
                <Icon name="videocam-off" size={24} color="#6b7280" />
              </View>
            )}
          </View>
        )}

        {/* SUBTITLES */}
        <SubtitleOverlay
          data={fullSubtitle}
          mode={callPreferences.subtitleMode}
          t={t}
          currentUserId={user?.userId}
        />

        {/* MAIN CONTROLS */}
        <TouchableOpacity style={styles.endCallButton} onPress={handleCallEnd}>
          <Icon name="call-end" size={30} color="white" />
        </TouchableOpacity>

        <View style={styles.controls}>
          {/* Setting Btn */}
          <TouchableOpacity style={styles.iconButton} onPress={() => { setSettingTab('subtitle'); setShowSettings(true); }}>
            <Icon name="settings" size={24} color="white" />
          </TouchableOpacity>

          {/* Mic Toggle */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isMicOn ? '#22c55e' : '#ef4444' }]}
            onPress={toggleMic}>
            <Icon name={isMicOn ? "mic" : "mic-off"} size={24} color="white" />
          </TouchableOpacity>

          {/* Camera Toggle */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isCameraOn ? '#22c55e' : '#ef4444' }]}
            onPress={toggleCamera}>
            <Icon name={isCameraOn ? "videocam" : "videocam-off"} size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* SETTINGS MODAL (With Participants Tab) */}
        <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettings(false)} />
          <View style={styles.modalContainer}>

            {/* Tabs */}
            <View style={styles.tabHeader}>
              <Pressable onPress={() => setSettingTab('subtitle')} style={[styles.tabItem, settingTab === 'subtitle' && styles.tabActive]}>
                <Text style={[styles.tabText, settingTab === 'subtitle' && styles.tabTextActive]}>{t('subtitle_mode')}</Text>
              </Pressable>
              <Pressable onPress={() => setSettingTab('participants')} style={[styles.tabItem, settingTab === 'participants' && styles.tabActive]}>
                <Text style={[styles.tabText, settingTab === 'participants' && styles.tabTextActive]}>{t('participants')}</Text>
              </Pressable>
            </View>

            {/* Content: Subtitle Mode */}
            {settingTab === 'subtitle' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 }}>
                {['dual', 'native', 'original', 'off'].map(m => (
                  <TouchableOpacity key={m}
                    onPress={() => setCallPreferences({ subtitleMode: m as any })}
                    style={[styles.modeButton, callPreferences.subtitleMode === m && styles.modeButtonActive]}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Content: Participants */}
            {settingTab === 'participants' && (
              <ScrollView style={{ marginTop: 15 }}>
                {remoteStreamsArr.length === 0 && (
                  <Text style={{ color: '#9ca3af', textAlign: 'center' }}>No one else is here.</Text>
                )}
                {remoteStreamsArr.map(([id]) => (
                  <TouchableOpacity
                    key={id}
                    style={styles.participantRow}
                    onPress={() => {
                      setShowSettings(false);
                      setSelectedProfileId(id);
                    }}
                  >
                    <View style={styles.participantAvatar}>
                      <Icon name="person" size={20} color="white" />
                    </View>
                    <Text style={styles.participantName}>User {id.slice(0, 6)}...</Text>
                    <Icon name="info-outline" size={24} color="#6366f1" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </Modal>

        {/* MINI PROFILE POPUP */}
        <Modal visible={!!selectedProfileId} transparent animationType="fade" onRequestClose={() => setSelectedProfileId(null)}>
          <View style={styles.centerModalOverlay}>
            <View style={styles.popupWrapper}>
              {selectedProfileId && user?.userId && (
                <MiniUserProfile
                  userId={selectedProfileId}
                  currentUserId={user.userId}
                  onClose={() => setSelectedProfileId(null)}
                />
              )}
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
  remoteVideoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827', gap: 20 },
  statusText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Local Video & Camera Off
  localVideoContainer: { position: 'absolute', top: 60, right: 20, width: 100, height: 150, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#4b5563', backgroundColor: '#374151' },
  localVideo: { flex: 1 },
  cameraOffPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1f2937' },

  endCallButton: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#ef4444', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // Subtitles
  subtitleContainer: { position: 'absolute', bottom: 120, alignSelf: 'center', padding: 12, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.8)', maxWidth: windowWidth * 0.9, marginHorizontal: 10 },
  subtitleSender: { color: '#9ca3af', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  subtitleTextOriginal: { color: '#e5e7eb', marginBottom: 4, flexShrink: 1, fontSize: 18 },
  subtitleTextTranslated: { color: '#fbbf24', fontWeight: 'bold', fontSize: 18, flexShrink: 1 },

  // Controls
  controls: { position: 'absolute', top: 60, left: 20, gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

  // Settings Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { height: '35%', backgroundColor: '#1f2937', marginTop: 'auto', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sectionTitle: { color: '#9ca3af', fontWeight: 'bold', marginBottom: 10 },
  modeButton: { padding: 10, backgroundColor: '#374151', borderRadius: 8, minWidth: '45%', alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: '#4f46e5' },

  // Tabs in Setting
  tabHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#374151' },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { color: '#9ca3af', fontWeight: '600' },
  tabTextActive: { color: 'white' },

  // Participant List
  participantRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', padding: 10, borderRadius: 8, marginBottom: 8 },
  participantAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6b7280', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  participantName: { color: 'white', flex: 1, fontWeight: '500' },

  // Mini Profile Popup
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  popupWrapper: { width: '85%', backgroundColor: '#1f2937', borderRadius: 16, overflow: 'hidden' },
  miniProfileContainer: { padding: 20 },
  miniProfileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  miniAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: '#374151' },
  miniName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  miniNickname: { color: '#9ca3af', fontSize: 14 },
  miniCountry: { color: '#d1d5db', fontSize: 12, marginTop: 2 },
  miniStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, backgroundColor: '#374151', padding: 10, borderRadius: 10 },
  miniStat: { alignItems: 'center' },
  miniStatVal: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  miniStatLabel: { color: '#9ca3af', fontSize: 12 },
  miniActions: { flexDirection: 'row', gap: 10 },
  miniBtn: { flex: 1, padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  btnAdd: { backgroundColor: '#2563eb' },
  btnAdmire: { backgroundColor: '#fce7f3' },
  btnAdmired: { backgroundColor: '#db2777' },
  btnDisabled: { backgroundColor: '#4b5563' },
  miniBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});

export default WebRTCCallScreen;