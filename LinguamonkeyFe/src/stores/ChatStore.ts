import { create } from 'zustand';
import { stompService } from '../services/stompService';
import { pythonAiWsService } from '../services/pythonAiWsService';
import { VideoSubtitleService, DualSubtitle } from '../services/videoSubtitleService';
import instance from '../api/axiosClient';
import type { ChatMessage as Message, Room } from '../types/entity';
import type { AppApiResponse, PageResponse } from '../types/dto';
import { useUserStore } from "./UserStore";
import { RoomPurpose } from "../types/enums";
import { playInAppSound } from '../utils/soundUtils';
import { useAppStore } from './appStore';
import { e2eeService } from '../services/E2EEService';
import mmkvStorage from '../utils/storage';
import { normalizeLexiconText, findBestTranslation, LexiconEntry, useLexiconStore } from '../utils/LexiconLite';
import { uploadTemp } from '../services/cloudinary';
import { translateText } from '../services/pythonService';

const AI_BOT_ID = "00000000-0000-0000-0000-000000000000";
const CACHE_PREFIX_MSGS = 'room_msgs_';

type ExtendedMessage = Message & {
  selfContent?: string;
  selfEphemeralKey?: string;
  selfInitializationVector?: string;
  isSending?: boolean;
  metadata?: any;
};

type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  roomId: string;
};

export type IncomingCall = {
  roomId: string;
  callerId: string;
  videoCallId: string;
  videoCallType: string;
  roomName?: string;
};

export type UserStatus = {
  userId: string;
  isOnline: boolean;
  lastActiveAt?: string;
};

interface UseChatState {
  stompConnected: boolean;
  aiWsConnected: boolean;
  rooms: { [roomId: string]: Room };
  userStatuses: { [userId: string]: UserStatus };
  lexiconMaster: Map<string, Record<string, string>>;
  aiRoomList: Room[];
  pendingSubscriptions: string[];
  pendingPublishes: { destination: string, payload: any }[];
  activeAiRoomId: string | null;
  messagesByRoom: { [roomId: string]: Message[] };
  pageByRoom: { [roomId: string]: number };
  hasMoreByRoom: { [roomId: string]: boolean };
  loadingByRoom: { [roomId: string]: boolean };
  aiChatHistory: AiMessage[];
  isAiStreaming: boolean;
  eagerTranslations: { [messageId: string]: { [lang: string]: string } };
  videoSubtitleService: VideoSubtitleService | null;
  currentVideoSubtitles: DualSubtitle | null;
  activeBubbleRoomId: string | null;
  isBubbleOpen: boolean;
  currentAppScreen: string | null;
  appIsActive: boolean;
  currentViewedRoomId: string | null;
  incomingCallRequest: IncomingCall | null;
  totalOnlineUsers: number;

  readReceipts: { [roomId: string]: { [userId: string]: string } };
  typingUsers: { [roomId: string]: string[] };

  fetchLexiconMaster: () => Promise<void>;
  disconnectStompClient: () => void;
  upsertRoom: (room: Room) => void;
  initStompClient: () => void;
  subscribeToRoom: (roomId: string) => void;
  unsubscribeFromRoom: (roomId: string) => void;
  initAiClient: () => void;
  startPrivateChat: (targetUserId: string) => Promise<Room | null>;
  fetchAiRoomList: () => Promise<void>;
  startNewAiChat: () => Promise<void>;
  selectAiRoom: (roomId: string) => Promise<void>;
  sendAiPrompt: (content: string) => void;
  sendAiWelcomeMessage: (localizedText: string) => void;
  loadMessages: (roomId: string, page?: number, size?: number) => Promise<void>;
  searchMessages: (roomId: string, keyword: string) => Promise<void>;
  sendMessage: (roomId: string, content: string, type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT', localAsset?: any) => Promise<void>;
  editMessage: (roomId: string, messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (roomId: string, messageId: string) => Promise<void>;
  markMessageAsRead: (roomId: string, messageId: string) => void;
  sendTypingStatus: (roomId: string, isTyping: boolean) => void;
  connectVideoSubtitles: (roomId: string, targetLang: string) => void;
  disconnectVideoSubtitles: () => void;
  disconnectStomp: () => void;
  disconnectAi: () => void;
  disconnectAll: () => void;
  openBubble: (roomId: string) => void;
  closeBubble: () => void;
  minimizeBubble: () => void;
  setCurrentAppScreen: (screen: string | null) => void;
  setAppIsActive: (isActive: boolean) => void;
  setCurrentViewedRoomId: (roomId: string | null) => void;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  updateUserStatus: (userId: string, isOnline: boolean, lastActiveAt?: string) => void;
  performEagerTranslation: (messageId: string, text: string, targetLang?: string, mode?: 'AUTO' | 'MANUAL') => Promise<void>;
  translateLastNMessages: (roomId: string, targetLang: string, count?: number) => Promise<void>;
  decryptNewMessages: (roomId: string, newMessages: Message[]) => Promise<void>;
  _processDecryptionQueue: (roomId: string, messages: Message[]) => void;
  updateDecryptedContent: (roomId: string, messageId: string, decryptedContent: string) => void;
  mergeTranslationUpdate: (roomId: string, messageId: string, translations: Record<string, string>) => void;
}

const parseDate = (dateInput: any): number => {
  if (!dateInput) return Date.now();
  if (Array.isArray(dateInput)) {
    const [y, M, d, h, m, s, ns] = dateInput;
    const date = new Date(y, M - 1, d, h || 0, m || 0, s || 0);
    if (ns) date.setMilliseconds(Math.floor(ns / 1000000));
    return date.getTime();
  }
  return new Date(dateInput).getTime();
};

const isSameMessage = (localMsg: Message, serverMsg: Message): boolean => {
  if (localMsg.id.chatMessageId === serverMsg.id.chatMessageId) return true;
  if ((localMsg as any).isLocal && localMsg.senderId === serverMsg.senderId) {
    const timeDiff = Math.abs(parseDate(localMsg.id.sentAt) - parseDate(serverMsg.id.sentAt));
    if (timeDiff < 60000) {
      if (localMsg.content === serverMsg.content) return true;
      if (serverMsg.senderEphemeralKey) return true;
      if (localMsg.messageType !== 'TEXT' && localMsg.messageType === serverMsg.messageType) return true;
    }
  }
  return false;
};

const normalizeMessage = (msg: any, defaultRoomId?: string): Message => {
  if (!msg) {
    return {
      id: { chatMessageId: 'unknown-' + Math.random(), sentAt: new Date().toISOString() },
      roomId: defaultRoomId || 'unknown'
    } as Message;
  }

  let parsedTranslations: Record<string, string> = {};
  if (msg.translations) {
    try {
      if (typeof msg.translations === 'string') {
        if (msg.translations.trim().startsWith('{')) {
          parsedTranslations = JSON.parse(msg.translations);
        }
      } else if (typeof msg.translations === 'object') {
        parsedTranslations = msg.translations;
      }
    } catch (e) {
      parsedTranslations = {};
    }
  }

  const safeMediaUrl = msg.mediaUrl || msg.media_url || null;
  const resolvedRoomId = msg.roomId || defaultRoomId;

  const baseMsg: ExtendedMessage = {
    ...msg,
    roomId: resolvedRoomId,
    translationsMap: parsedTranslations,
    senderEphemeralKey: msg.senderEphemeralKey,
    usedPreKeyId: msg.usedPreKeyId,
    initializationVector: msg.initializationVector,
    selfContent: msg.selfContent,
    selfEphemeralKey: msg.selfEphemeralKey,
    selfInitializationVector: msg.selfInitializationVector,
    decryptedContent: msg.decryptedContent || null,
    mediaUrl: safeMediaUrl,
  };

  if (msg?.id?.chatMessageId) {
    return baseMsg as Message;
  }

  const chatMessageId = msg?.chatMessageId || msg?.id;
  const sentAt = msg?.sentAt || msg?.id?.sentAt || new Date().toISOString();

  const rawMsg = {
    ...msg,
    id: { chatMessageId: String(chatMessageId), sentAt: sentAt },
    roomId: resolvedRoomId,
    senderId: msg.senderId,
    content: msg.content,
    translationsMap: parsedTranslations,
    senderEphemeralKey: msg.senderEphemeralKey,
    usedPreKeyId: msg.usedPreKeyId,
    initializationVector: msg.initializationVector,
    decryptedContent: msg.decryptedContent || null,
    mediaUrl: safeMediaUrl,
  };
  return rawMsg as Message;
};

const upsertMessageList = (currentList: Message[], newMessage: Message): { list: Message[], isNew: boolean } => {
  const list = [...currentList];

  const idMatchIndex = list.findIndex(m => m.id.chatMessageId === newMessage.id.chatMessageId);
  if (idMatchIndex > -1) {
    const existing = list[idMatchIndex];
    list[idMatchIndex] = {
      ...existing,
      ...newMessage,
      decryptedContent: existing.decryptedContent || newMessage.decryptedContent,
      translationsMap: { ...existing.translationsMap, ...newMessage.translationsMap },
      isLocal: false,
      isSending: false
    } as ExtendedMessage;
    return { list, isNew: false };
  }

  if (!(newMessage as any).isLocal) {
    const localMatchIndex = list.findIndex(m => (m as any).isLocal && isSameMessage(m, newMessage));
    if (localMatchIndex > -1) {
      const existing = list[localMatchIndex];
      list[localMatchIndex] = {
        ...newMessage,
        roomId: newMessage.roomId || existing.roomId,
        decryptedContent: existing.content,
        translationsMap: { ...existing.translationsMap, ...newMessage.translationsMap },
        isLocal: false,
        isSending: false
      } as ExtendedMessage;
      return { list, isNew: false };
    }
  }

  list.unshift(newMessage);
  list.sort((a, b) => parseDate(b.id.sentAt) - parseDate(a.id.sentAt));
  return { list, isNew: true };
};

function extractRoomIdFromTopic(topic: string) { return topic.split('/').pop() || ''; }

let streamBuffer = "";
let lastStreamUpdate = 0;
let streamTimeout: number | null = null;
const STREAM_THROTTLE_MS = 60;

export const useChatStore = create<UseChatState>((set, get) => ({
  stompConnected: false,
  aiWsConnected: false,
  pendingSubscriptions: [],
  pendingPublishes: [],
  rooms: {},
  userStatuses: {},
  aiRoomList: [],
  messagesByRoom: {},
  lexiconMaster: new Map(),
  pageByRoom: {},
  hasMoreByRoom: {},
  loadingByRoom: {},
  aiChatHistory: [],
  isAiStreaming: false,
  activeAiRoomId: null,
  eagerTranslations: {},
  videoSubtitleService: null,
  currentVideoSubtitles: null,
  activeBubbleRoomId: null,
  isBubbleOpen: false,
  currentAppScreen: null,
  appIsActive: true,
  currentViewedRoomId: null,
  incomingCallRequest: null,
  totalOnlineUsers: 0,
  readReceipts: {},
  typingUsers: {},

  setCurrentAppScreen: (screen) => set({ currentAppScreen: screen }),
  setAppIsActive: (isActive) => set({ appIsActive: isActive }),
  setCurrentViewedRoomId: (roomId) => set({ currentViewedRoomId: roomId }),

  updateUserStatus: (userId, isOnline, lastActiveAt) => {
    const current = get().userStatuses[userId];
    const newLastActive = lastActiveAt || (isOnline ? undefined : new Date().toISOString());

    if (current && current.isOnline === isOnline && current.lastActiveAt === newLastActive) {
      return;
    }

    set((state) => ({
      userStatuses: {
        ...state.userStatuses,
        [userId]: { userId, isOnline, lastActiveAt: newLastActive }
      }
    }));
  },

  updateDecryptedContent: (roomId, messageId, decryptedContent) => {
    set(state => {
      const msgs = state.messagesByRoom[roomId] || [];
      const updatedMsgs = msgs.map(m => {
        if (m.id.chatMessageId !== messageId) return m;
        return { ...m, decryptedContent: decryptedContent };
      });
      mmkvStorage.setItem(CACHE_PREFIX_MSGS + roomId, JSON.stringify(updatedMsgs.slice(0, 50)));
      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: updatedMsgs
        }
      };
    });
  },

  mergeTranslationUpdate: (roomId, messageId, translations) => {
    set(state => {
      const msgs = state.messagesByRoom[roomId] || [];
      const updatedMsgs = msgs.map(m => {
        if (m.id.chatMessageId !== messageId) return m;
        return {
          ...m,
          translationsMap: { ...(m.translationsMap || {}), ...translations }
        };
      });
      mmkvStorage.setItem(CACHE_PREFIX_MSGS + roomId, JSON.stringify(updatedMsgs.slice(0, 50)));
      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: updatedMsgs
        }
      };
    });
  },

  upsertRoom: (room: Room) => {
    const currentRoom = get().rooms[room.roomId];
    if (currentRoom && JSON.stringify(currentRoom) === JSON.stringify(room)) {
      return;
    }
    set((state) => ({ rooms: { ...state.rooms, [room.roomId]: room } }));
  },

  decryptNewMessages: async (roomId, messagesToProcess) => {
    if (!messagesToProcess || messagesToProcess.length === 0) return;
    get()._processDecryptionQueue(roomId, messagesToProcess);
  },

  _processDecryptionQueue: async (roomId, messages) => {
    const user = useUserStore.getState().user;
    const room = get().rooms[roomId];
    if (!user?.userId) return;

    e2eeService.setUserId(user.userId);

    if (room && room.purpose !== RoomPurpose.PRIVATE_CHAT && room.secretKey) {
      await e2eeService.setRoomKey(roomId, room.secretKey);
    }

    const targets = messages.filter(m =>
      m.messageType === 'TEXT' &&
      (!m.decryptedContent || m.decryptedContent.includes('!!') || m.decryptedContent.trim() === '')
    );

    if (targets.length === 0) return;

    const isGroupStrategy = room?.purpose !== RoomPurpose.PRIVATE_CHAT;

    const results = await Promise.all(targets.map(async (msg) => {
      try {
        let text = "";
        if (isGroupStrategy) {
          text = await e2eeService.decryptGroupMessage(roomId, msg.content);
        } else {
          if (msg.senderEphemeralKey) {
            text = await e2eeService.decrypt(msg);
          } else {
            text = msg.content;
          }
        }
        return { id: msg.id.chatMessageId, text };
      } catch (e) {
        return { id: msg.id.chatMessageId, text: '!! Decryption Failed' };
      }
    }));

    set(state => {
      const roomMsgs = state.messagesByRoom[roomId] || [];
      const decryptedMap = new Map();
      results.forEach(r => decryptedMap.set(r.id, r.text));

      const newRoomMsgs = roomMsgs.map(m => {
        if (decryptedMap.has(m.id.chatMessageId)) {
          return { ...m, decryptedContent: decryptedMap.get(m.id.chatMessageId) };
        }
        return m;
      });

      if (newRoomMsgs.length > 0) {
        mmkvStorage.setItem(CACHE_PREFIX_MSGS + roomId, JSON.stringify(newRoomMsgs.slice(0, 50)));
      }

      return { messagesByRoom: { ...state.messagesByRoom, [roomId]: newRoomMsgs } };
    });

    const { chatSettings, nativeLanguage: appNativeLang } = useAppStore.getState();
    const { user: currentUser } = useUserStore.getState();
    const targetLang = currentUser?.nativeLanguageCode || chatSettings.targetLanguage || appNativeLang || 'vi';

    if (chatSettings.autoTranslate) {
      results.forEach(res => {
        if (!res.text.includes('!!')) {
          get().performEagerTranslation(res.id, res.text, targetLang, 'AUTO');
        }
      });
    }
  },

  performEagerTranslation: async (messageId: string, text: string, overrideTargetLang?: string, mode: 'AUTO' | 'MANUAL' = 'AUTO') => {
    if (!text || !messageId) return;
    if (text.includes('!! Decryption Failed') || text.includes('🔒')) return;

    const { nativeLanguage: appNativeLang, chatSettings } = useAppStore.getState();
    const { user: currentUser } = useUserStore.getState();
    const targetLang = overrideTargetLang || currentUser?.nativeLanguageCode || chatSettings?.targetLanguage || appNativeLang || 'vi';

    if (get().eagerTranslations[messageId]?.[targetLang]) return;

    const lexiconStore = useLexiconStore.getState();
    if (lexiconStore.entries.size === 0) lexiconStore.loadFromStorage();
    if (get().lexiconMaster.size === 0) await get().fetchLexiconMaster();

    const { translatedText, ratio } = findBestTranslation(text, get().lexiconMaster, targetLang);

    if (ratio >= 1.0) {
      set(state => {
        const updatedEager = {
          ...state.eagerTranslations,
          [messageId]: { ...(state.eagerTranslations[messageId] || {}), [targetLang]: translatedText }
        };
        const allRooms = state.messagesByRoom;
        let foundRoomId: string | undefined;
        for (const rId in allRooms) {
          if (allRooms[rId].some(m => m.id.chatMessageId === messageId)) {
            foundRoomId = rId;
            break;
          }
        }
        if (foundRoomId) {
          const roomMsgs = allRooms[foundRoomId];
          const updatedMsgs = roomMsgs.map(m => {
            if (m.id.chatMessageId === messageId) {
              return { ...m, translationsMap: { ...m.translationsMap, [targetLang]: translatedText } };
            }
            return m;
          });
          mmkvStorage.setItem(CACHE_PREFIX_MSGS + foundRoomId, JSON.stringify(updatedMsgs.slice(0, 50)));
          return { eagerTranslations: updatedEager, messagesByRoom: { ...allRooms, [foundRoomId]: updatedMsgs } };
        }
        return { eagerTranslations: updatedEager };
      });
    } else {
      set(state => ({
        eagerTranslations: {
          ...state.eagerTranslations,
          [messageId]: { ...(state.eagerTranslations[messageId] || {}), [targetLang]: '...' }
        }
      }));

      if (pythonAiWsService.isConnected) {
        pythonAiWsService.sendTranslationRequest(messageId, text, targetLang);
      } else {
        try {
          const httpTranslatedText = await translateText(text, targetLang);
          if (httpTranslatedText) {
            set(state => {
              const updatedEager = {
                ...state.eagerTranslations,
                [messageId]: { ...(state.eagerTranslations[messageId] || {}), [targetLang]: httpTranslatedText }
              };
              const allRooms = state.messagesByRoom;
              let foundRoomId: string | undefined;
              for (const rId in allRooms) {
                if (allRooms[rId].some(m => m.id.chatMessageId === messageId)) {
                  foundRoomId = rId;
                  break;
                }
              }
              if (foundRoomId) {
                const roomMsgs = allRooms[foundRoomId];
                const updatedMsgs = roomMsgs.map(m => {
                  if (m.id.chatMessageId === messageId) {
                    return { ...m, translationsMap: { ...m.translationsMap, [targetLang]: httpTranslatedText } };
                  }
                  return m;
                });
                mmkvStorage.setItem(CACHE_PREFIX_MSGS + foundRoomId, JSON.stringify(updatedMsgs.slice(0, 50)));
                return { eagerTranslations: updatedEager, messagesByRoom: { ...allRooms, [foundRoomId]: updatedMsgs } };
              }
              return { eagerTranslations: updatedEager };
            });
          }
        } catch (e) {
          // Silent fail or retry later
        }
      }
    }
  },

  fetchLexiconMaster: async () => {
    if (get().lexiconMaster.size > 0) return;
    try {
      type SyncResponse = {
        version: number;
        total: number;
        data: LexiconEntry[];
      };

      const res = await instance.get<AppApiResponse<SyncResponse>>('/api/py/lexicon/lite-sync', { params: { limit: 5000 } });

      if (res.data.result) {
        const { data, version } = res.data.result;
        useLexiconStore.getState().syncWithServer(data || [], version || Date.now());
      }
    } catch (e) {
      console.error("Failed to sync lexicon", e);
    }
  },

  translateLastNMessages: async (roomId: string, targetLang: string, count = 10) => {
    const messages = get().messagesByRoom[roomId] || [];
    const currentUserId = useUserStore.getState().user?.userId;
    const candidates = messages.filter(m => m.messageType === 'TEXT' && m.senderId !== currentUserId && !m.isDeleted).slice(0, count);
    Promise.all(candidates.map(msg => {
      const contentToTranslate = msg.decryptedContent || msg.content;
      return (!msg.translationsMap || !msg.translationsMap[targetLang]) && contentToTranslate ?
        get().performEagerTranslation(msg.id.chatMessageId, contentToTranslate, targetLang, 'AUTO') : Promise.resolve();
    }));
  },

  initStompClient: () => {
    const user = useUserStore.getState().user;
    const currentUserId = user?.userId;
    if (currentUserId) {
      e2eeService.initAndCheckUpload(currentUserId).catch(err => console.warn("E2EE Init failed", err));
    }

    if (stompService.isConnected || get().stompConnected) { set({ stompConnected: true }); return; }
    stompService.connect(() => {
      set({ stompConnected: true });
      try {
        stompService.subscribe('/user/queue/notifications', async (rawMsg: any) => {
          if (rawMsg && rawMsg.type === 'VIDEO_CALL') {
            const state = get();
            const currentUserId = useUserStore.getState().user?.userId;
            if (state.currentAppScreen !== 'LessonScreen' && rawMsg.callerId !== currentUserId) {
              if (state.incomingCallRequest?.videoCallId === rawMsg.videoCallId) return;

              set({ incomingCallRequest: rawMsg });
              await playInAppSound();
            }
            return;
          }

          const roomId = rawMsg?.roomId || rawMsg?.room_id;
          const senderId = rawMsg?.senderId || rawMsg?.sender_id;
          const state = get();

          if (roomId && senderId !== currentUserId && senderId !== AI_BOT_ID) {
            if (state.currentViewedRoomId !== roomId && !(state.isBubbleOpen && state.activeBubbleRoomId === roomId)) {
              if (state.appIsActive) { await playInAppSound(); state.openBubble(roomId); }
            }

            const newMsg = normalizeMessage(rawMsg, roomId);
            set((s) => {
              const currentList = s.messagesByRoom[roomId] || [];
              const { list } = upsertMessageList(currentList, newMsg);
              if (list.length > 0) mmkvStorage.setItem(CACHE_PREFIX_MSGS + roomId, JSON.stringify(list.slice(0, 50)));
              return { messagesByRoom: { ...s.messagesByRoom, [roomId]: list } };
            });

            if (newMsg.senderEphemeralKey || newMsg.content) {
              get().decryptNewMessages(roomId, [newMsg]);
            }
          }
        });
      } catch (e) { }

      const pendingSubs = get().pendingSubscriptions || [];
      pendingSubs.forEach(dest => {
        try {
          stompService.subscribe(dest, (rawMsg: any) => {
            const roomId = extractRoomIdFromTopic(dest);
            if (dest.includes('/status')) { if (rawMsg.userId) { get().updateUserStatus(rawMsg.userId, rawMsg.status === 'ONLINE', rawMsg.timestamp); } return; }

            if (dest.includes('/read')) {
              if (rawMsg && rawMsg.userId && rawMsg.messageId) {
                set(state => ({
                  readReceipts: {
                    ...state.readReceipts,
                    ...state.readReceipts,
                    [roomId]: { ...(state.readReceipts[roomId] || {}), [rawMsg.userId]: rawMsg.messageId }
                  }
                }));
              }
              return;
            }

            if (dest.includes('/typing')) {
              const userId = rawMsg.userId;
              const isTyping = rawMsg.isTyping;
              set(state => {
                const roomTyping = state.typingUsers[roomId] || [];
                const newRoomTyping = isTyping
                  ? (roomTyping.includes(userId) ? roomTyping : [...roomTyping, userId])
                  : roomTyping.filter(id => id !== userId);
                return { typingUsers: { ...state.typingUsers, [roomId]: newRoomTyping } };
              });
              return;
            }

            if (rawMsg.type === 'TRANSLATION_UPDATE') {
              get().mergeTranslationUpdate(rawMsg.roomId, rawMsg.id, rawMsg.translations);
              return;
            }

            const newMsg = normalizeMessage(rawMsg, roomId);

            set((state) => {
              const currentList = state.messagesByRoom[roomId] || [];
              const { list } = upsertMessageList(currentList, newMsg);
              if (list.length > 0) mmkvStorage.setItem(CACHE_PREFIX_MSGS + roomId, JSON.stringify(list.slice(0, 50)));
              return { messagesByRoom: { ...state.messagesByRoom, [roomId]: list } };
            });
            get().decryptNewMessages(roomId, [newMsg]);
          });
        } catch (e) { }
      });
      set({ pendingSubscriptions: [] });
      const pendingPublishes = get().pendingPublishes || [];
      pendingPublishes.forEach(p => { try { stompService.publish(p.destination, p.payload); } catch (e) { } });
      set({ pendingPublishes: [] });
    }, (err) => { set({ stompConnected: false }); });
  },

  disconnectStompClient: () => { stompService.disconnect(); set({ stompConnected: false }); },

  subscribeToRoom: (roomId: string) => {
    const chatDest = `/topic/room/${roomId}`;
    const statusDest = `/topic/room/${roomId}/status`;
    const readDest = `/topic/room/${roomId}/read`;
    const typingDest = `/topic/room/${roomId}/typing`;

    const handleSub = (dest: string, callback: (msg: any) => void) => {
      if (stompService.isConnected) {
        stompService.subscribe(dest, callback);
      } else {
        set((s) => ({ pendingSubscriptions: Array.from(new Set([...s.pendingSubscriptions, dest])) }));
      }
    };

    if (!stompService.isConnected) {
      set((s) => ({ pendingSubscriptions: Array.from(new Set([...s.pendingSubscriptions, chatDest, statusDest, readDest, typingDest])) }));
      get().initStompClient();
      return;
    }

    stompService.subscribe(chatDest, (rawMsg: any) => {
      if (rawMsg && rawMsg.type === 'VIDEO_CALL') { return; }
      if (rawMsg.type === 'TRANSLATION_UPDATE') {
        get().mergeTranslationUpdate(rawMsg.roomId, rawMsg.id, rawMsg.translations);
        return;
      }
      const newMsg = normalizeMessage(rawMsg, roomId);
      set((state) => {
        const currentList = state.messagesByRoom[roomId] || [];
        const { list } = upsertMessageList(currentList, newMsg);
        if (list.length > 0) mmkvStorage.setItem(CACHE_PREFIX_MSGS + roomId, JSON.stringify(list.slice(0, 50)));
        return { messagesByRoom: { ...state.messagesByRoom, [roomId]: list } };
      });
      get().decryptNewMessages(roomId, [newMsg]);
    });

    stompService.subscribe(statusDest, (msg: any) => {
      if (msg.userId) { get().updateUserStatus(msg.userId, msg.status === 'ONLINE', new Date().toISOString()); }
    });

    stompService.subscribe(readDest, (msg: any) => {
      if (msg && msg.userId && msg.messageId) {
        set(state => ({
          readReceipts: {
            ...state.readReceipts,
            [roomId]: { ...(state.readReceipts[roomId] || {}), [msg.userId]: msg.messageId }
          }
        }));
      }
    });

    stompService.subscribe(typingDest, (msg: any) => {
      const userId = msg.userId;
      const isTyping = msg.isTyping;
      if (!userId) return;
      const currentUserId = useUserStore.getState().user?.userId;
      if (userId === currentUserId) return;

      set(state => {
        const roomTyping = state.typingUsers[roomId] || [];
        const newRoomTyping = isTyping
          ? (roomTyping.includes(userId) ? roomTyping : [...roomTyping, userId])
          : roomTyping.filter(id => id !== userId);
        return { typingUsers: { ...state.typingUsers, [roomId]: newRoomTyping } };
      });
    });
  },

  unsubscribeFromRoom: (roomId: string) => {
    const chatDest = `/topic/room/${roomId}`;
    const statusDest = `/topic/room/${roomId}/status`;
    const readDest = `/topic/room/${roomId}/read`;
    const typingDest = `/topic/room/${roomId}/typing`;
    if (stompService.isConnected) {
      stompService.unsubscribe(chatDest);
      stompService.unsubscribe(statusDest);
      stompService.unsubscribe(readDest);
      stompService.unsubscribe(typingDest);
    }
    else {
      set((s) => ({ pendingSubscriptions: s.pendingSubscriptions.filter(d => ![chatDest, statusDest, readDest, typingDest].includes(d)) }));
    }
  },

  initAiClient: () => {
    if (!pythonAiWsService.isConnected) {
      pythonAiWsService.connect((msg: any) => {
        const state = get();

        if (msg.type === 'translation_result') {
          const { messageId, translatedText, targetLang } = msg;
          if (messageId && translatedText && targetLang) {
            set(state => {
              const newEager = {
                ...state.eagerTranslations,
                [messageId]: { ...(state.eagerTranslations[messageId] || {}), [targetLang]: translatedText }
              };

              const allRooms = state.messagesByRoom;
              let foundRoomId: string | undefined;
              for (const rId in allRooms) {
                if (allRooms[rId].some(m => m.id.chatMessageId === messageId)) {
                  foundRoomId = rId;
                  break;
                }
              }

              if (foundRoomId) {
                const roomMsgs = allRooms[foundRoomId];
                const updatedMsgs = roomMsgs.map(m => {
                  if (m.id.chatMessageId === messageId) {
                    return { ...m, translationsMap: { ...m.translationsMap, [targetLang]: translatedText } };
                  }
                  return m;
                });
                mmkvStorage.setItem(CACHE_PREFIX_MSGS + foundRoomId, JSON.stringify(updatedMsgs.slice(0, 50)));
                return { eagerTranslations: newEager, messagesByRoom: { ...allRooms, [foundRoomId]: updatedMsgs } };
              }

              return { eagerTranslations: newEager };
            });
          }
          return;
        }

        if (msg.type === 'chat_response_chunk') {
          streamBuffer += (msg.content || '');
          const now = Date.now();
          if (now - lastStreamUpdate > STREAM_THROTTLE_MS) {
            const currentHistory = [...get().aiChatHistory];
            const lastMsgIndex = currentHistory.length - 1;
            if (lastMsgIndex >= 0 && currentHistory[lastMsgIndex].role === 'assistant' && currentHistory[lastMsgIndex].isStreaming) {
              currentHistory[lastMsgIndex] = { ...currentHistory[lastMsgIndex], content: currentHistory[lastMsgIndex].content + streamBuffer };
              streamBuffer = "";
              lastStreamUpdate = now;
              set({ aiChatHistory: currentHistory });
            }
          } else {
            if (streamTimeout) clearTimeout(streamTimeout);
            streamTimeout = setTimeout(() => {
              const currentHistory = [...get().aiChatHistory];
              const lastMsgIndex = currentHistory.length - 1;
              if (lastMsgIndex >= 0 && currentHistory[lastMsgIndex].isStreaming) {
                currentHistory[lastMsgIndex] = { ...currentHistory[lastMsgIndex], content: currentHistory[lastMsgIndex].content + streamBuffer };
                streamBuffer = "";
                lastStreamUpdate = Date.now();
                set({ aiChatHistory: currentHistory });
              }
            }, STREAM_THROTTLE_MS + 10) as any as number;
          }
          const lastMsg = state.aiChatHistory[state.aiChatHistory.length - 1];
          if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.isStreaming) {
            set({ aiChatHistory: [...state.aiChatHistory, { id: Date.now().toString(), role: 'assistant', content: '', isStreaming: true, roomId: msg.roomId || state.activeAiRoomId || '' }] });
          }
        } else if (msg.type === 'chat_response_complete') {
          if (streamBuffer.length > 0) {
            const currentHistory = [...get().aiChatHistory];
            const lastMsgIndex = currentHistory.length - 1;
            if (lastMsgIndex >= 0) { currentHistory[lastMsgIndex].content += streamBuffer; }
            set({ aiChatHistory: currentHistory });
            streamBuffer = "";
          }
          set((s) => {
            const history = [...s.aiChatHistory];
            const last = history[history.length - 1];
            if (last) last.isStreaming = false;
            return { isAiStreaming: false, aiChatHistory: history };
          });
          if (streamTimeout) clearTimeout(streamTimeout);
        }
      }, () => set({ aiWsConnected: true }));
    }
  },

  startPrivateChat: async (targetUserId) => {
    try {
      const res = await instance.post<AppApiResponse<Room>>(`/api/v1/rooms/private`, {}, { params: { targetUserId } });
      const room = res.data.result;
      if (room?.roomId) {
        get().upsertRoom(room);
        get().subscribeToRoom(room.roomId);
        return room;
      }
      return null;
    } catch (error) { return null; }
  },

  fetchAiRoomList: async () => {
    const userId = useUserStore.getState().user?.userId;
    if (!userId) return;
    try {
      const res = await instance.get<AppApiResponse<Room[]>>(`/api/v1/rooms/ai-history`, { params: { userId } });
      if (res.data.result) set({ aiRoomList: res.data.result });
    } catch (e) { }
  },

  startNewAiChat: async () => {
    const userId = useUserStore.getState().user?.userId;
    if (!userId) return;
    const res = await instance.get<AppApiResponse<Room>>(`/api/v1/rooms/ai-chat-room`, { params: { userId, newSession: true } });
    const room = res.data.result;
    if (room?.roomId) {
      await get().selectAiRoom(room.roomId);
      await get().fetchAiRoomList();
    }
  },

  selectAiRoom: async (roomId) => {
    set({ activeAiRoomId: roomId, aiChatHistory: [], loadingByRoom: { ...get().loadingByRoom, [roomId]: true } });
    await get().loadMessages(roomId, 0, 10);
    const messages = get().messagesByRoom[roomId] || [];
    const sortedForAi = [...messages].reverse();
    const aiFormatMessages: AiMessage[] = sortedForAi.map((m) => ({
      id: m.id.chatMessageId,
      role: (m.senderId && m.senderId !== AI_BOT_ID) ? 'user' : 'assistant',
      content: m.content || '',
      roomId: roomId
    }));
    set({
      aiChatHistory: aiFormatMessages,
      loadingByRoom: { ...get().loadingByRoom, [roomId]: false },
    });
  },

  sendAiPrompt: (content) => {
    const { activeAiRoomId, aiWsConnected } = get();
    if (!activeAiRoomId || !aiWsConnected) return;
    set((state) => ({ aiChatHistory: [...state.aiChatHistory, { id: Date.now().toString(), role: 'user', content, roomId: activeAiRoomId }], isAiStreaming: true }));
    const history = get().aiChatHistory.map((m) => ({ role: m.role, content: m.content }));
    pythonAiWsService.sendMessage({ type: 'chat_request', prompt: content, history: history.slice(0, -1), roomId: activeAiRoomId, messageType: 'TEXT' });
  },

  sendAiWelcomeMessage: (localizedText: string) => {
    const { activeAiRoomId } = get();
    if (!activeAiRoomId) return;
    if (get().aiChatHistory.length > 0) return;
    const welcomeMsg: AiMessage = {
      id: 'local-welcome-' + Date.now(),
      role: 'assistant',
      content: localizedText,
      roomId: activeAiRoomId,
      isStreaming: false
    };
    set(state => ({
      aiChatHistory: [welcomeMsg, ...state.aiChatHistory],
      isAiStreaming: false
    }));
  },

  loadMessages: async (roomId, page = 0, size = 25) => {
    const state = get();
    if (state.loadingByRoom[roomId] && page !== 0) return;
    set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: true } }));

    if (page === 0) {
      const cachedMsgsJson = mmkvStorage.getString(CACHE_PREFIX_MSGS + roomId);
      if (cachedMsgsJson) {
        try {
          const cachedMsgs = JSON.parse(cachedMsgsJson);
          set(s => ({ messagesByRoom: { ...s.messagesByRoom, [roomId]: cachedMsgs } }));
          get().decryptNewMessages(roomId, cachedMsgs);
        } catch (e) { }
      }
    }

    try {
      const res = await instance.get<AppApiResponse<PageResponse<any>>>(`/api/v1/chat/room/${roomId}/messages`, { params: { page, size, sort: 'id.sentAt,desc' } });
      const rawMessages = res.data.result?.content || [];
      const newMessages = rawMessages.map(m => normalizeMessage(m, roomId));
      const totalPages = res.data.result?.totalPages || 0;

      set((currentState) => {
        const currentMsgs = currentState.messagesByRoom[roomId] || [];
        let mergedList = page === 0 ? [] : [...currentMsgs];

        if (page === 0 && currentMsgs.length > 0) mergedList = [...currentMsgs];

        newMessages.forEach(msg => {
          const { list } = upsertMessageList(mergedList, msg);
          mergedList = list;
        });

        if (page === 0) mmkvStorage.setItem(CACHE_PREFIX_MSGS + roomId, JSON.stringify(mergedList.slice(0, 50)));

        return {
          messagesByRoom: { ...currentState.messagesByRoom, [roomId]: mergedList },
          pageByRoom: { ...currentState.pageByRoom, [roomId]: page },
          hasMoreByRoom: { ...currentState.hasMoreByRoom, [roomId]: page < totalPages - 1 },
          loadingByRoom: { ...currentState.loadingByRoom, [roomId]: false },
        };
      });

      get().decryptNewMessages(roomId, newMessages);

    } catch (e) {
      set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: false } }));
    }
  },

  searchMessages: async (roomId, keyword) => {
    if (!keyword.trim()) { await get().loadMessages(roomId, 0, 20); return; }
    set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: true } }));
    try {
      const res = await instance.get<AppApiResponse<PageResponse<any>>>(`/api/v1/chat/room/${roomId}/messages`, { params: { page: 0, size: 50, keyword } });
      const rawMessages = res.data.result?.content || [];
      const newMessages = rawMessages.map(m => normalizeMessage(m, roomId));

      get().decryptNewMessages(roomId, newMessages);

      set((currentState) => ({
        messagesByRoom: { ...currentState.messagesByRoom, [roomId]: newMessages },
        loadingByRoom: { ...currentState.loadingByRoom, [roomId]: false },
        hasMoreByRoom: { ...currentState.hasMoreByRoom, [roomId]: false }
      }));
    } catch (e) { set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: false } })); }
  },

  sendMessage: async (roomId, content, type, localAsset) => {
    const state = get();
    const user = useUserStore.getState().user;
    if (!user?.userId) return;

    const room = state.rooms[roomId];
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimisticMsg: ExtendedMessage = {
      id: { chatMessageId: tempId, sentAt: new Date().toISOString() },
      senderId: user.userId,
      content: content || (type === 'IMAGE' ? '📷 Image' : type === 'VIDEO' ? '🎥 Video' : ''),
      messageType: type as any,
      mediaUrl: localAsset?.uri || null,
      isLocal: true,
      isSending: true,
      translationsMap: {},
      roomId: roomId,
      isRead: false,
      isDeleted: false,
      metadata: localAsset ? { duration: localAsset.duration, width: localAsset.width, height: localAsset.height } : {}
    };

    set((s) => {
      const currentList = s.messagesByRoom[roomId] || [];
      return { messagesByRoom: { ...s.messagesByRoom, [roomId]: [optimisticMsg, ...currentList] } };
    });

    get().sendTypingStatus(roomId, false);

    try {
      let finalMediaUrl = localAsset?.uri || '';
      let finalContent = content;

      if (localAsset) {
        try {
          const uploadResult = await uploadTemp({
            uri: localAsset.uri,
            name: localAsset.name,
            type: localAsset.type
          });
          finalMediaUrl = uploadResult.fileUrl;
        } catch (uploadError) {
          console.error("Upload failed in ChatStore", uploadError);
          return;
        }
      }

      const isPrivateChat = room?.purpose === RoomPurpose.PRIVATE_CHAT;
      const finalPayload: any = {
        senderId: user.userId,
        roomId,
        messageType: type,
        purpose: room?.purpose || RoomPurpose.PRIVATE_CHAT,
        mediaUrl: type !== 'TEXT' ? finalMediaUrl : null,
        content: finalContent
      };

      if (type === 'TEXT') {
        if (isPrivateChat) {
          const receiverId = room?.members?.find(m => m.userId !== user.userId)?.userId;
          if (receiverId) {
            const encResult = await e2eeService.encrypt(receiverId, user.userId, content);
            finalPayload.content = encResult.content;
            finalPayload.senderEphemeralKey = encResult.senderEphemeralKey;
            finalPayload.usedPreKeyId = encResult.usedPreKeyId;
            finalPayload.initializationVector = encResult.initializationVector;
            finalPayload.selfContent = encResult.selfContent;
            finalPayload.selfEphemeralKey = encResult.selfEphemeralKey;
            finalPayload.selfInitializationVector = encResult.selfInitializationVector;
          }
        } else {
          try {
            if (room.secretKey) {
              await e2eeService.setRoomKey(roomId, room.secretKey);
              const encryptedContent = await e2eeService.encryptGroupMessage(roomId, content);
              finalPayload.content = encryptedContent;
            }
          } catch (e) {
            return;
          }
        }
      }

      const dest = `/app/chat/room/${roomId}`;
      if (stompService.isConnected) {
        stompService.publish(dest, finalPayload);
      } else {
        get().initStompClient();
        setTimeout(() => stompService.publish(dest, finalPayload), 1000);
      }
    } catch (err) {
      console.error("Send message critical error", err);
    }
  },

  editMessage: async (roomId, messageId, newContent) => { await instance.put(`/api/v1/chat/messages/${messageId}`, { content: newContent }); },
  deleteMessage: async (roomId, messageId) => {
    await instance.delete(`/api/v1/chat/messages/${messageId}`);
    set(state => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: state.messagesByRoom[roomId]?.filter(m => m.id.chatMessageId !== messageId) || [] } }));
  },

  markMessageAsRead: (roomId, messageId) => {
    if (messageId.startsWith('local') || messageId.startsWith('unknown')) return;

    const user = useUserStore.getState().user;
    if (!user) return;

    set(state => ({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: state.messagesByRoom[roomId]?.map(m =>
          m.id.chatMessageId === messageId ? { ...m, isRead: true } : m
        ) || []
      },
      readReceipts: {
        ...state.readReceipts,
        [roomId]: { ...(state.readReceipts[roomId] || {}), [user.userId]: messageId }
      }
    }));

    const dest = `/app/chat/message/${messageId}/read`;
    const payload = { senderId: user?.userId, timestamp: new Date().toISOString() };
    if (stompService.isConnected) {
      try { stompService.publish(dest, payload); }
      catch (e) { set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: payload }] })); }
    } else {
      set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: payload }] }));
      get().initStompClient();
    }
  },

  sendTypingStatus: (roomId, isTyping) => {
    const user = useUserStore.getState().user;
    if (!user) return;

    const dest = `/app/chat/room/${roomId}/typing`;
    const payload = { userId: user.userId, isTyping, roomId };

    if (stompService.isConnected) {
      stompService.publish(dest, payload);
    }
  },

  connectVideoSubtitles: (roomId, targetLang) => {
    const service = new VideoSubtitleService();
    set({ videoSubtitleService: service });
    service.connect(roomId, targetLang, (sub) => { set({ currentVideoSubtitles: sub }); });
  },
  disconnectVideoSubtitles: () => { get().videoSubtitleService?.disconnect(); set({ videoSubtitleService: null, currentVideoSubtitles: null }); },
  disconnectStomp: () => { stompService.disconnect(); set({ stompConnected: false, pendingSubscriptions: [], pendingPublishes: [] }); },
  disconnectAi: () => { pythonAiWsService.disconnect(); set({ aiWsConnected: false, aiChatHistory: [], activeAiRoomId: null }); },
  disconnectAll: () => { get().disconnectStomp(); get().disconnectAi(); get().disconnectVideoSubtitles(); set({ activeBubbleRoomId: null, isBubbleOpen: false, currentVideoSubtitles: null }); },
  openBubble: (roomId) => set({ activeBubbleRoomId: roomId, isBubbleOpen: true }),
  closeBubble: () => set({ activeBubbleRoomId: null, isBubbleOpen: false }),
  minimizeBubble: () => set({ isBubbleOpen: false }),
  acceptIncomingCall: () => set({ incomingCallRequest: null }),
  rejectIncomingCall: () => set({ incomingCallRequest: null }),
}));