import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  PermissionsAndroid,
  Platform,
  Dimensions,
  Image,
  ScrollView,
  Pressable,
  Animated,
  Easing
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

import { useAppStore } from '../../stores/appStore';
import { useUserStore } from '../../stores/UserStore';
import { useChatStore } from '../../stores/ChatStore';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useTokenStore } from '../../stores/tokenStore';
import { API_BASE_URL } from '../../api/apiConfig';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useVideoCalls } from '../../hooks/useVideos';
import { VideoCallStatus, FriendshipStatus } from '../../types/enums';
import { useUsers } from '../../hooks/useUsers';
import { useFriendships } from '../../hooks/useFriendships';
import { getAvatarSource } from '../../utils/avatarUtils';

const PAGE_SIZE = 6;

const normalizeLexiconText = (text: string) => {
  if (!text) return "";
  return text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").trim();
};

const getLexiconKey = (lang: string, text: string) => {
  const langCode = lang ? lang.split('-')[0].toLowerCase() : 'en';
  return `${langCode}:${normalizeLexiconText(text)}`;
};

const clientSideTranslate = (text: string, srcLang: string, targetLang: string): string | null => {
  const lexicon = useChatStore.getState().lexiconMaster;
  if (!lexicon || lexicon.size === 0 || !text) return null;

  const words = text.split(/\s+/).filter(w => w);
  const translatedParts: string[] = [];
  let i = 0;
  let hasMatch = false;

  while (i < words.length) {
    let matched = false;
    for (let j = Math.min(words.length - i, 6); j >= 1; j--) {
      const phrase = words.slice(i, i + j).join(' ');
      const key = getLexiconKey(srcLang, phrase);
      const entry = lexicon.get(key);

      if (entry && entry.translations && entry.translations[targetLang]) {
        translatedParts.push(entry.translations[targetLang]);
        i += j;
        matched = true;
        hasMatch = true;
        break;
      }
    }
    if (!matched) {
      translatedParts.push(words[i]);
      i++;
    }
  }
  return hasMatch ? translatedParts.join(' ') : null;
};

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
        <Text style={{ color: 'white' }}>Loading...</Text>
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

const SmoothVideoItem = React.memo(({ stream, style, label, isActiveSpeaker }: { stream: MediaStream, style: any, label: string, isActiveSpeaker: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: fadeAnim }]}>
      <View style={[styles.videoWrapper, isActiveSpeaker && styles.activeSpeakerBorder]}>
        <RTCView streamURL={stream.toURL()} style={{ flex: 1 }} objectFit="cover" zOrder={0} />
        <View style={styles.nameTag}>
          <Text style={styles.nameTagText}>{label}</Text>
        </View>
        {isActiveSpeaker && (
          <View style={styles.activeIcon}>
            <Icon name="graphic-eq" size={16} color="#22c55e" />
          </View>
        )}
      </View>
    </Animated.View>
  );
}, (prev, next) => prev.stream.id === next.stream.id && prev.isActiveSpeaker === next.isActiveSpeaker);

SmoothVideoItem.displayName = 'SmoothVideoItem';

const SubtitleOverlay = React.memo(({ data, mode, t, currentUserId }: any) => {
  if (!data || mode === 'off' || !data.originalFull?.trim()) return null;

  if (data.isFiller && data.senderId !== currentUserId) {
    return (
      <View style={[styles.subtitleContainer, { opacity: 0.5, backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <Text style={[styles.subtitleTextOriginal, { textAlign: 'center', fontSize: 14 }]}>...</Text>
      </View>
    );
  }

  const isMe = data.senderId === currentUserId;
  const { originalFull, translated } = data;

  if (isMe) {
    return (
      <View style={styles.subtitleContainer}>
        <Text style={[styles.subtitleSender, { textAlign: 'center', color: '#818cf8' }]}>{t('you') || 'Bạn'}</Text>
        <Text style={[styles.subtitleTextOriginal, { textAlign: 'center' }]}>{originalFull}</Text>
      </View>
    );
  }

  const showOriginal = mode === 'dual' || mode === 'original';
  const showTranslated = mode === 'dual' || mode === 'native';
  const effectiveShowOriginal = showOriginal || (mode === 'native' && !translated);

  return (
    <View style={styles.subtitleContainer}>
      <Text style={[styles.subtitleSender, { textAlign: 'center' }]}>{t('partner') || 'Đối phương'}</Text>

      {effectiveShowOriginal && (
        <Text style={[
          styles.subtitleTextOriginal,
          { textAlign: 'center' },
          mode === 'native' && !translated && { opacity: 0.6, fontSize: 14 }
        ]}>
          {originalFull}
        </Text>
      )}

      {showTranslated && translated ? (
        <Text style={[styles.subtitleTextTranslated, { textAlign: 'center' }]}>{translated}</Text>
      ) : null}
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
  originalFull: string; originalLang: string; translated: string; translatedLang: string; senderId: string; status?: 'processing' | 'complete' | 'noise'; isFiller?: boolean;
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
  const { nativeLanguage, callPreferences, setCallPreferences } = useAppStore();
  const targetLang = callPreferences.nativeLanguage || nativeLanguage || 'vi';

  const { useUpdateVideoCall } = useVideoCalls();
  const { mutate: updateCallStatus } = useUpdateVideoCall();

  const wsSignal = useRef<WebSocket | null>(null);
  const wsAudio = useRef<WebSocket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const isManuallyClosed = useRef(false);
  const subtitleTimeoutRef = useRef<any>(null);

  const [isMicOn, setIsMicOn] = useState(callPreferences.micEnabled);
  const [isCameraOn, setIsCameraOn] = useState(callPreferences.cameraEnabled);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [settingTab, setSettingTab] = useState<'subtitle' | 'participants'>('subtitle');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [fullSubtitle, setFullSubtitle] = useState<SubtitleData | null>(null);
  const [isViewAll, setIsViewAll] = useState(false);

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

  const audioOptions = useMemo(() => ({
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: Platform.OS === 'android' ? 7 : 0,
    bufferSize: 4096,
    wavFile: 'temp.wav'
  }), []);

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
          if (wsAudio.current?.readyState === WebSocket.OPEN && isMicOn) {
            wsAudio.current.send(JSON.stringify({ audio: base64Data }));
          }
        });

        if (isMicOn) {
          LiveAudioStream.start();
        }
      } catch (e) {
        console.error("❌ Audio Init Error:", e);
      }
    }, 2000);
  }, [isMicOn, audioOptions]);

  const connectAudioSocket = useCallback(() => {
    if (!roomId || !accessToken || isManuallyClosed.current) return;
    if (wsAudio.current) { wsAudio.current.close(); wsAudio.current = null; }

    const normalizedRoomId = String(roomId).trim().toLowerCase();
    let cleanBase = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';
    const url = `${protocol}${cleanBase}/ws/py/subtitles-audio?token=${accessToken}&roomId=${normalizedRoomId}&nativeLang=${targetLang}`;

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

          let translated = data.translated || "";

          if (!translated && data.originalFull && data.senderId !== user?.userId && !data.isFiller) {
            const localTrans = clientSideTranslate(data.originalFull, data.originalLang, targetLang);
            if (localTrans) translated = localTrans;
          }

          setFullSubtitle({ ...data, translated });
          if (data.status === 'complete') {
            subtitleTimeoutRef.current = setTimeout(() => setFullSubtitle(null), 4000);
          }
        }
        else if (data.type === 'subtitle_translation') {
          if (data.targetLang && data.targetLang !== targetLang.split('-')[0]) return;
          setFullSubtitle(prev => {
            if (prev && prev.originalFull === data.originalFull) {
              return { ...prev, translated: data.translated };
            }
            return prev;
          });
        }
      } catch (_) { }
    };
    ws.onclose = () => {
      if (!isManuallyClosed.current) setTimeout(connectAudioSocket, 5000);
    };
  }, [roomId, accessToken, targetLang, initSubtitleAudioStream, user?.userId]);

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

        if (data.type === 'active_speaker_update' && data.activeSpeakerId) {
          setActiveSpeakerId(data.activeSpeakerId);
          return;
        }

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

  useEffect(() => {
    let isMounted = true;
    const startCall = async () => {
      const stream = await getMediaStream();
      if (isMounted && stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach(t => t.enabled = callPreferences.micEnabled);
        stream.getVideoTracks().forEach(t => t.enabled = callPreferences.cameraEnabled);
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

  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    setCallPreferences({ micEnabled: newState });
    localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = newState);
    if (newState) LiveAudioStream.start();
  };

  const toggleCamera = () => {
    const newState = !isCameraOn;
    setIsCameraOn(newState);
    setCallPreferences({ cameraEnabled: newState });
    localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = newState);
  };

  const handleCallEnd = () => {
    if (videoCallId && user?.userId) {
      updateCallStatus({ id: videoCallId, payload: { callerId: user.userId, status: VideoCallStatus.ENDED } });
    }
    navigation.goBack();
  };

  const remoteStreamsArr = Array.from(remoteStreams.entries());

  const visibleStreams = useMemo(() => {
    let sorted = [...remoteStreamsArr];
    if (activeSpeakerId) {
      const activeIdx = sorted.findIndex(([id]) => id === activeSpeakerId);
      if (activeIdx > -1) {
        const [active] = sorted.splice(activeIdx, 1);
        sorted.unshift(active);
      }
    }
    if (!isViewAll) {
      return sorted.slice(0, PAGE_SIZE);
    }
    return sorted;
  }, [remoteStreamsArr, activeSpeakerId, isViewAll]);

  const remainingCount = Math.max(0, remoteStreamsArr.length - visibleStreams.length);

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollGrid}>
          <View style={styles.gridWrapper}>
            {visibleStreams.map(([id, stream]) => (
              <SmoothVideoItem
                key={id}
                stream={stream}
                label={`User ${id.slice(0, 4)}`}
                isActiveSpeaker={id === activeSpeakerId}
                style={{
                  width: isViewAll ? '30%' : '45%',
                  aspectRatio: 1,
                  margin: 5
                }}
              />
            ))}
          </View>

          {!isViewAll && remainingCount > 0 && (
            <TouchableOpacity style={styles.viewMoreBtn} onPress={() => setIsViewAll(true)}>
              <Text style={styles.viewMoreText}>+{remainingCount} others</Text>
            </TouchableOpacity>
          )}
          {isViewAll && (
            <TouchableOpacity style={styles.viewMoreBtn} onPress={() => setIsViewAll(false)}>
              <Text style={styles.viewMoreText}>Collapse</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

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

        <SubtitleOverlay
          data={fullSubtitle}
          mode={callPreferences.subtitleMode}
          t={t}
          currentUserId={user?.userId}
        />

        <TouchableOpacity style={styles.endCallButton} onPress={handleCallEnd}>
          <Icon name="call-end" size={30} color="white" />
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => { setSettingTab('subtitle'); setShowSettings(true); }}>
            <Icon name="settings" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: isMicOn ? '#22c55e' : '#ef4444' }]} onPress={toggleMic}>
            <Icon name={isMicOn ? "mic" : "mic-off"} size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: isCameraOn ? '#22c55e' : '#ef4444' }]} onPress={toggleCamera}>
            <Icon name={isCameraOn ? "videocam" : "videocam-off"} size={24} color="white" />
          </TouchableOpacity>
        </View>

        <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettings(false)} />
          <View style={styles.modalContainer}>
            <View style={styles.tabHeader}>
              <Pressable onPress={() => setSettingTab('subtitle')} style={[styles.tabItem, settingTab === 'subtitle' && styles.tabActive]}>
                <Text style={[styles.tabText, settingTab === 'subtitle' && styles.tabTextActive]}>{t('subtitle_mode')}</Text>
              </Pressable>
              <Pressable onPress={() => setSettingTab('participants')} style={[styles.tabItem, settingTab === 'participants' && styles.tabActive]}>
                <Text style={[styles.tabText, settingTab === 'participants' && styles.tabTextActive]}>{t('participants')}</Text>
              </Pressable>
            </View>

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

            {settingTab === 'participants' && (
              <ScrollView style={{ marginTop: 15 }}>
                {remoteStreamsArr.length === 0 && <Text style={{ color: '#9ca3af', textAlign: 'center' }}>No one else is here.</Text>}
                {remoteStreamsArr.map(([id]) => (
                  <TouchableOpacity key={id} style={styles.participantRow} onPress={() => { setShowSettings(false); setSelectedProfileId(id); }}>
                    <View style={styles.participantAvatar}><Icon name="person" size={20} color="white" /></View>
                    <Text style={styles.participantName}>User {id.slice(0, 6)}...</Text>
                    {id === activeSpeakerId && <Icon name="graphic-eq" size={20} color="#22c55e" style={{ marginRight: 10 }} />}
                    <Icon name="info-outline" size={24} color="#6366f1" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </Modal>

        <Modal visible={!!selectedProfileId} transparent animationType="fade" onRequestClose={() => setSelectedProfileId(null)}>
          <View style={styles.centerModalOverlay}>
            <View style={styles.popupWrapper}>
              {selectedProfileId && user?.userId && (
                <MiniUserProfile userId={selectedProfileId} currentUserId={user.userId} onClose={() => setSelectedProfileId(null)} />
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
  scrollGrid: { paddingTop: 80, paddingBottom: 150, alignItems: 'center' },
  gridWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
  videoWrapper: { flex: 1, backgroundColor: '#1f2937', borderRadius: 8, overflow: 'hidden' },
  activeSpeakerBorder: { borderWidth: 2, borderColor: '#22c55e' },
  nameTag: { position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  nameTagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  activeIcon: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 12 },
  viewMoreBtn: { marginTop: 20, backgroundColor: '#374151', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#6b7280' },
  viewMoreText: { color: '#e5e7eb', fontWeight: '600' },
  localVideoContainer: { position: 'absolute', top: 60, right: 20, width: 100, height: 150, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#4b5563', backgroundColor: '#374151' },
  localVideo: { flex: 1 },
  cameraOffPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1f2937' },
  endCallButton: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#ef4444', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  subtitleContainer: { position: 'absolute', bottom: 120, alignSelf: 'center', padding: 12, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.8)', maxWidth: windowWidth * 0.9, marginHorizontal: 10 },
  subtitleSender: { color: '#9ca3af', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  subtitleTextOriginal: { color: '#e5e7eb', marginBottom: 4, flexShrink: 1, fontSize: 18 },
  subtitleTextTranslated: { color: '#fbbf24', fontWeight: 'bold', fontSize: 18, flexShrink: 1 },
  controls: { position: 'absolute', top: 60, left: 20, gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { height: '35%', backgroundColor: '#1f2937', marginTop: 'auto', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modeButton: { padding: 10, backgroundColor: '#374151', borderRadius: 8, minWidth: '45%', alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: '#4f46e5' },
  tabHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#374151' },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { color: '#9ca3af', fontWeight: '600' },
  tabTextActive: { color: 'white' },
  participantRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', padding: 10, borderRadius: 8, marginBottom: 8 },
  participantAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6b7280', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  participantName: { color: 'white', flex: 1, fontWeight: '500' },
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