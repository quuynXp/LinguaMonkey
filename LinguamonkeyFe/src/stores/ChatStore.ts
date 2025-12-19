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
import { findBestTranslation, useLexiconStore } from '../utils/LexiconLite';
import { uploadTemp } from '../services/cloudinary';
import { translateText } from '../services/pythonService';
import { roomSecurityService } from '../services/RoomSecurityService';

const AI_BOT_ID = "00000000-0000-0000-0000-000000000000";
const CACHE_PREFIX_MSGS = 'room_msgs_';
const LOADING_PLACEHOLDER = "⚠️ Đang tải khóa phòng...";
const DECRYPTION_FAILED = "!! Decryption Failed";

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
  isLocal?: boolean;
};

export type IncomingCall = {
  roomId: string;
  callerId: string;
  videoCallId: string;
  videoCallType: string;
  roomName?: string;
  type?: string;
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
  fetchRoomInfo: (roomId: string) => Promise<Room | null>;
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
  addReaction: (roomId: string, messageId: string, reaction: string) => void;
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
  performEagerTranslation: (messageId: string, text: string, targetLang?: string, roomId?: string) => Promise<void>;
  translateLastNMessages: (roomId: string, targetLang: string, count?: number) => Promise<void>;
  decryptNewMessages: (roomId: string, newMessages: Message[]) => Promise<void>;
  _processDecryptionQueue: (roomId: string, messages: Message[]) => void;
  updateDecryptedContent: (roomId: string, messageId: string, decryptedContent: string) => void;
  mergeTranslationUpdate: (roomId: string, messageId: string, translations: Record<string, string>) => void;
}

const saveRoomMessagesToCache = (roomId: string, messages: Message[]) => {
  const cleanMessages = messages.map(m => {
    if (m.decryptedContent === LOADING_PLACEHOLDER || m.decryptedContent === DECRYPTION_FAILED || m.decryptedContent?.includes('⚠️')) {
      return { ...m, decryptedContent: null };
    }
    return m;
  });
  mmkvStorage.setItem(CACHE_PREFIX_MSGS + roomId, JSON.stringify(cleanMessages.slice(0, 50)));
};

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
      roomId: defaultRoomId || 'unknown',
      isRead: false
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
  const strictIsRead = msg.read === true || msg.isRead === true;

  const senderEphemeralKey = msg.senderEphemeralKey || msg.sender_ephemeral_key;
  const usedPreKeyId = msg.usedPreKeyId || msg.used_pre_key_id;
  const initializationVector = msg.initializationVector || msg.initialization_vector;

  const selfContent = msg.selfContent || msg.self_content;
  const selfEphemeralKey = msg.selfEphemeralKey || msg.self_ephemeral_key;
  const selfInitializationVector = msg.selfInitializationVector || msg.self_initialization_vector;

  const baseMsg: ExtendedMessage = {
    ...msg,
    roomId: resolvedRoomId,
    translationsMap: parsedTranslations,
    senderEphemeralKey,
    usedPreKeyId,
    initializationVector,
    selfContent,
    selfEphemeralKey,
    selfInitializationVector,
    decryptedContent: msg.decryptedContent || null,
    mediaUrl: safeMediaUrl,
    isRead: strictIsRead,
  };

  if (msg?.id?.chatMessageId) {
    return baseMsg as Message;
  }

  const chatMessageId = msg?.chatMessageId || msg?.id;
  const sentAt = msg?.sentAt || msg?.id?.sentAt || new Date().toISOString();

  const rawMsg = {
    ...baseMsg,
    id: { chatMessageId: String(chatMessageId), sentAt: sentAt },
    senderId: msg.senderId,
    content: msg.content,
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
      isSending: false,
      isRead: existing.isRead || newMessage.isRead
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
        decryptedContent: existing.decryptedContent || existing.content,
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

function extractRoomIdFromTopic(topic: string) {
  return topic.split('/').pop() || '';
}

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
    if (current) {
      if (current.isOnline === isOnline && current.lastActiveAt === newLastActive) return;
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
      saveRoomMessagesToCache(roomId, updatedMsgs);
      return { messagesByRoom: { ...state.messagesByRoom, [roomId]: updatedMsgs } };
    });
  },

  mergeTranslationUpdate: (roomId: string, messageId: string, translations: Record<string, string>) => {
    const targetLang = Object.keys(translations)[0];
    const translatedText = Object.values(translations)[0];
    set(state => {
      const updatedEagerTranslations = {
        ...state.eagerTranslations,
        [messageId]: { ...(state.eagerTranslations[messageId] || {}), [targetLang]: translatedText }
      };
      const msgs = state.messagesByRoom[roomId] || [];
      const updatedMsgs = msgs.map(m => {
        if (m.id.chatMessageId !== messageId) return m;
        const room = state.rooms[roomId];
        const isGroup = room?.purpose !== RoomPurpose.PRIVATE_CHAT;
        const currentTrans = m.translationsMap || {};
        const currentDecrypted = m.decryptedTranslationsMap || {};
        const newTransMap = { ...currentTrans, ...translations };
        const newDecryptedTrans = isGroup ? { ...currentDecrypted, ...translations } : undefined;
        return { ...m, translationsMap: newTransMap, decryptedTranslationsMap: isGroup ? newDecryptedTrans : undefined };
      });
      saveRoomMessagesToCache(roomId, updatedMsgs);
      mmkvStorage.setItem(`trans_${messageId}_${targetLang}`, translatedText);
      return { eagerTranslations: updatedEagerTranslations, messagesByRoom: { ...state.messagesByRoom, [roomId]: updatedMsgs } };
    });
  },

  upsertRoom: (room: Room) => {
    if (room.secretKey) {
      roomSecurityService.setKey(room.roomId, room.secretKey);
    }
    set((state) => {
      const currentRoom = state.rooms[room.roomId];
      if (currentRoom && currentRoom.roomName === room.roomName) return state;
      return { rooms: { ...state.rooms, [room.roomId]: room } };
    });
  },

  fetchRoomInfo: async (roomId: string) => {
    try {
      const res = await instance.get<AppApiResponse<Room>>(`/api/v1/rooms/${roomId}`);
      if (res.data.result) {
        const room = res.data.result;
        get().upsertRoom(room);
        return room;
      }
    } catch (e) {
      console.error("[ChatStore] Failed to fetch room info:", e);
    }
    return null;
  },

  decryptNewMessages: async (roomId, messagesToProcess) => {
    if (!messagesToProcess || messagesToProcess.length === 0) return;
    get()._processDecryptionQueue(roomId, messagesToProcess);
  },

  _processDecryptionQueue: async (roomId, messages) => {
    const user = useUserStore.getState().user;
    let room = get().rooms[roomId];

    if (!room) {
      room = await get().fetchRoomInfo(roomId) || undefined;
    }

    if (!user?.userId) return;

    e2eeService.setUserId(user.userId);
    if (room && room.purpose !== RoomPurpose.PRIVATE_CHAT && room.secretKey) {
      await e2eeService.setRoomKey(roomId, room.secretKey);
    }

    const targets = messages.filter(m =>
      m.messageType === 'TEXT' &&
      (!m.decryptedContent || m.decryptedContent === LOADING_PLACEHOLDER || m.decryptedContent === DECRYPTION_FAILED || m.decryptedContent.trim() === '')
    );

    if (targets.length === 0) return;

    const isGroupStrategy = room?.purpose !== RoomPurpose.PRIVATE_CHAT;

    const results = await Promise.all(targets.map(async (msg) => {
      try {
        let text = "";
        let decryptedTrans = msg.translationsMap || {};

        if (isGroupStrategy) {
          text = await roomSecurityService.decryptMessage(roomId, msg.content);
          if (msg.translationsMap) {
            const transTasks = Object.entries(msg.translationsMap).map(async ([lang, encTrans]) => {
              if (encTrans) {
                const decTrans = await e2eeService.decryptGroupMessage(roomId, encTrans);
                return [lang, decTrans];
              }
              return [lang, encTrans];
            });
            const transResults = await Promise.all(transTasks);
            decryptedTrans = Object.fromEntries(transResults);
          }
        } else {
          if (msg.senderEphemeralKey) {
            text = await e2eeService.decrypt(msg);
          } else {
            text = msg.content;
          }
        }
        return { id: msg.id.chatMessageId, text, decryptedTrans };
      } catch (e) {
        return { id: msg.id.chatMessageId, text: DECRYPTION_FAILED, decryptedTrans: {} };
      }
    }));

    set(state => {
      const roomMsgs = state.messagesByRoom[roomId] || [];
      const decryptedMap = new Map();
      const transMap = new Map();
      results.forEach(r => {
        decryptedMap.set(r.id, r.text);
        transMap.set(r.id, r.decryptedTrans);
      });
      const newRoomMsgs = roomMsgs.map(m => {
        if (decryptedMap.has(m.id.chatMessageId)) {
          return {
            ...m,
            decryptedContent: decryptedMap.get(m.id.chatMessageId),
            decryptedTranslationsMap: transMap.get(m.id.chatMessageId)
          };
        }
        return m;
      });
      if (newRoomMsgs.length > 0) {
        saveRoomMessagesToCache(roomId, newRoomMsgs);
      }
      return { messagesByRoom: { ...state.messagesByRoom, [roomId]: newRoomMsgs } };
    });
    const { chatSettings, nativeLanguage: appNativeLang } = useAppStore.getState();
    const { user: currentUser } = useUserStore.getState();
    const targetLang = currentUser?.nativeLanguageCode || chatSettings.targetLanguage || appNativeLang || 'vi';
    if (chatSettings.autoTranslate) {
      results.forEach(res => {
        if (res.text !== DECRYPTION_FAILED) {
          get().performEagerTranslation(res.id, res.text, targetLang, roomId);
        }
      });
    }
  },

  performEagerTranslation: async (messageId, text, overrideTargetLang, roomId) => {
    if (!text || !messageId) return;
    if (text === DECRYPTION_FAILED || text.includes('🔒')) return;
    const { nativeLanguage: appNativeLang, chatSettings } = useAppStore.getState();
    const { user: currentUser } = useUserStore.getState();
    const targetLang = overrideTargetLang || currentUser?.nativeLanguageCode || chatSettings?.targetLanguage || appNativeLang || 'vi';
    const state = get();
    let msg: Message | undefined = null;
    if (roomId) msg = state.messagesByRoom[roomId]?.find(m => m.id.chatMessageId === messageId);
    else {
      for (const rId in state.messagesByRoom) {
        msg = state.messagesByRoom[rId].find(m => m.id.chatMessageId === messageId);
        if (msg) { roomId = rId; break; }
      }
    }
    const fromMmkv = mmkvStorage.getString(`trans_${messageId}_${targetLang}`);
    if (fromMmkv) {
      get().mergeTranslationUpdate(roomId || 'unknown', messageId, { [targetLang]: fromMmkv });
      return;
    }
    if (msg) {
      const existingTrans = msg.translationsMap?.[targetLang] || msg.decryptedTranslationsMap?.[targetLang];
      if (existingTrans) return;
    }
    if (state.eagerTranslations[messageId]?.[targetLang]) return;
    const lexiconStore = useLexiconStore.getState();
    if (lexiconStore.entries.size === 0) lexiconStore.loadFromStorage();
    if (state.lexiconMaster.size === 0) {
      state.fetchLexiconMaster().catch(err => console.warn("Bg fetch failed", err));
    }
    const { translatedText, ratio } = findBestTranslation(text, state.lexiconMaster, targetLang);
    if (ratio >= 1.0) {
      set(state => {
        const updatedEager = { ...state.eagerTranslations, [messageId]: { ...(state.eagerTranslations[messageId] || {}), [targetLang]: translatedText } };
        const allRooms = state.messagesByRoom;
        let foundRoomId = roomId;
        if (!foundRoomId) {
          for (const rId in allRooms) {
            if (allRooms[rId].some(m => m.id.chatMessageId === messageId)) { foundRoomId = rId; break; }
          }
        }
        if (foundRoomId) {
          const roomMsgs = allRooms[foundRoomId];
          const updatedMsgs = roomMsgs.map(m => {
            if (m.id.chatMessageId === messageId) return { ...m, translationsMap: { ...m.translationsMap, [targetLang]: translatedText } };
            return m;
          });
          saveRoomMessagesToCache(foundRoomId, updatedMsgs);
          mmkvStorage.setItem(`trans_${messageId}_${targetLang}`, translatedText);
          return { eagerTranslations: updatedEager, messagesByRoom: { ...allRooms, [foundRoomId]: updatedMsgs } };
        }
        return { eagerTranslations: updatedEager };
      });
    } else {
      if (pythonAiWsService.isConnected) pythonAiWsService.sendTranslationRequest(messageId, text, targetLang, roomId);
      else {
        try {
          const httpTranslatedText = await translateText(text, targetLang, roomId, messageId);
          if (httpTranslatedText) get().mergeTranslationUpdate(roomId || 'unknown', messageId, { [targetLang]: httpTranslatedText });
        } catch (e) { }
      }
    }
  },

  fetchLexiconMaster: async () => {
    if (get().lexiconMaster.size > 0) return;
    try {
      const res = await instance.get<AppApiResponse<any>>('/api/py/lexicon/lite-sync', { params: { limit: 5000 } });
      if (res.data.result) {
        const { data, version } = res.data.result;
        useLexiconStore.getState().syncWithServer(data || [], version || Date.now());
        const newMaster = new Map<string, Record<string, string>>();
        if (Array.isArray(data)) {
          data.forEach((item: any) => { if (item.k && item.t) newMaster.set(item.k, item.t); });
        }
        set({ lexiconMaster: newMaster });
      }
    } catch (e) { console.error("Failed to sync lexicon", e); }
  },

  translateLastNMessages: async (roomId: string, targetLang: string, count = 10) => {
    const messages = get().messagesByRoom[roomId] || [];
    const currentUserId = useUserStore.getState().user?.userId;
    const candidates = messages.filter(m => m.messageType === 'TEXT' && m.senderId !== currentUserId && !m.isDeleted).slice(0, count);
    await Promise.all(candidates.map(async msg => {
      const contentToTranslate = msg.decryptedContent || msg.content;
      const existingTrans = msg.translationsMap?.[targetLang] || msg.decryptedTranslationsMap?.[targetLang];
      if (!existingTrans && contentToTranslate) await get().performEagerTranslation(msg.id.chatMessageId, contentToTranslate, targetLang, roomId);
    }));
  },

  initStompClient: () => {
    const user = useUserStore.getState().user;
    const currentUserId = user?.userId;
    if (currentUserId) e2eeService.initAndCheckUpload(currentUserId).catch(err => console.warn("E2EE Init failed", err));
    if (stompService.isConnected || get().stompConnected) { set({ stompConnected: true }); return; }
    stompService.connect(() => {
      set({ stompConnected: true });
      try {
        stompService.subscribe('/user/queue/notifications', async (rawMsg: any) => {
          if (rawMsg && (rawMsg.type === 'VIDEO_CALL' || rawMsg.type === 'INCOMING_CALL')) {
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
              if (list.length > 0) saveRoomMessagesToCache(roomId, list);
              return { messagesByRoom: { ...s.messagesByRoom, [roomId]: list } };
            });
            if (newMsg.senderEphemeralKey || newMsg.content) get().decryptNewMessages(roomId, [newMsg]);
          }
        });
      } catch (e) { }
      const pendingSubs = get().pendingSubscriptions || [];
      pendingSubs.forEach(dest => { get().subscribeToRoom(extractRoomIdFromTopic(dest)); });
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
    // const typingDest = `/topic/room/${roomId}/typing`; // DISABLED TYPING

    if (!stompService.isConnected) {
      set((s) => {
        if (s.pendingSubscriptions.includes(chatDest)) return s;
        // DISABLED TYPING: Removed typingDest from pendingSubscriptions
        return { pendingSubscriptions: Array.from(new Set([...s.pendingSubscriptions, chatDest, statusDest, readDest])) };
      });
      get().initStompClient();
      return;
    }
    const handleChatMessage = (rawMsg: any) => {
      if (rawMsg?.type === 'VIDEO_CALL' || rawMsg?.type === 'INCOMING_CALL' || rawMsg?.type === 'TRANSLATION_UPDATE') {
        if (rawMsg.type === 'TRANSLATION_UPDATE') get().mergeTranslationUpdate(rawMsg.roomId, rawMsg.id, rawMsg.translations);
        else {
          const state = get();
          const currentUserId = useUserStore.getState().user?.userId;
          if (state.currentAppScreen !== 'LessonScreen' && rawMsg.callerId !== currentUserId) {
            if (state.incomingCallRequest?.videoCallId === rawMsg.videoCallId) return;
            set({ incomingCallRequest: rawMsg });
            playInAppSound().catch(() => { });
          }
        }
        return;
      }
      const newMsg = normalizeMessage(rawMsg, roomId);
      set((state) => {
        const currentList = state.messagesByRoom[roomId] || [];
        const { list, isNew } = upsertMessageList(currentList, newMsg);
        if (list.length > 0) saveRoomMessagesToCache(roomId, list);
        if (!isNew) {
          const existingMsg = currentList.find(m => m.id.chatMessageId === newMsg.id.chatMessageId);
          if (existingMsg && JSON.stringify(existingMsg) === JSON.stringify(newMsg)) return state;
        }
        return { messagesByRoom: { ...state.messagesByRoom, [roomId]: list } };
      });
      setTimeout(() => get().decryptNewMessages(roomId, [newMsg]), 0);
    };
    const handleStatus = (msg: any) => { if (msg.userId) setTimeout(() => get().updateUserStatus(msg.userId, msg.status === 'ONLINE', new Date().toISOString()), 0); };
    const handleRead = (msg: any) => {
      if (msg?.userId && msg?.messageId) {
        set(state => {
          const newReadReceipts = { ...state.readReceipts, [roomId]: { ...(state.readReceipts[roomId] || {}), [msg.userId]: msg.messageId } };
          const roomMsgs = state.messagesByRoom[roomId] || [];

          const updatedMsgs = roomMsgs.map(m => m.id.chatMessageId === msg.messageId ? { ...m, isRead: true } : m);

          if (updatedMsgs.length > 0) saveRoomMessagesToCache(roomId, updatedMsgs);
          return { readReceipts: newReadReceipts, messagesByRoom: { ...state.messagesByRoom, [roomId]: updatedMsgs } };
        });
      }
    };
    /* DISABLED TYPING
    const handleTyping = (msg: any) => {
      const userId = msg.userId;
      const isTyping = msg.isTyping;
      const currentUserId = useUserStore.getState().user?.userId;
      if (!userId || userId === currentUserId) return;
      set(state => {
        const roomTyping = state.typingUsers[roomId] || [];
        const newRoomTyping = isTyping ? (roomTyping.includes(userId) ? roomTyping : [...roomTyping, userId]) : roomTyping.filter(id => id !== userId);
        return { typingUsers: { ...state.typingUsers, [roomId]: newRoomTyping } };
      });
    };
    */
    if (!(stompService as any).hasSubscription?.(chatDest)) stompService.subscribe(chatDest, handleChatMessage);
    if (!(stompService as any).hasSubscription?.(statusDest)) stompService.subscribe(statusDest, handleStatus);
    if (!(stompService as any).hasSubscription?.(readDest)) stompService.subscribe(readDest, handleRead);
    // if (!(stompService as any).hasSubscription?.(typingDest)) stompService.subscribe(typingDest, handleTyping); // DISABLED TYPING
  },

  unsubscribeFromRoom: (roomId: string) => {
    const chatDest = `/topic/room/${roomId}`;
    const statusDest = `/topic/room/${roomId}/status`;
    const readDest = `/topic/room/${roomId}/read`;
    // const typingDest = `/topic/room/${roomId}/typing`; // DISABLED TYPING
    if (stompService.isConnected) {
      stompService.unsubscribe(chatDest);
      stompService.unsubscribe(statusDest);
      stompService.unsubscribe(readDest);
      // stompService.unsubscribe(typingDest); // DISABLED TYPING
    } else {
      set((s) => ({ pendingSubscriptions: s.pendingSubscriptions.filter(d => ![chatDest, statusDest, readDest].includes(d)) })); // DISABLED TYPING: Removed typingDest
    }
  },

  initAiClient: () => {
    if (!pythonAiWsService.isConnected) {
      pythonAiWsService.connect((msg: any) => {
        const state = get();

        if (msg.type === 'chat_response_chunk') {
          const content = msg.content;
          const roomId = msg.roomId;

          if (!content || !roomId) return;

          set((s) => {
            const currentHistory = [...s.aiChatHistory];
            const lastMsg = currentHistory.length > 0 ? currentHistory[0] : null;

            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
              const updatedMsg = { ...lastMsg, content: lastMsg.content + content };
              currentHistory[0] = updatedMsg;
              return { aiChatHistory: currentHistory };
            } else {
              const newMsg: AiMessage = {
                id: 'ai-' + Date.now(),
                role: 'assistant',
                content: content,
                isStreaming: true,
                roomId: roomId
              };
              return { aiChatHistory: [newMsg, ...currentHistory] };
            }
          });
        }

        else if (msg.type === 'chat_response_complete') {
          set((s) => {
            const currentHistory = [...s.aiChatHistory];
            const lastMsg = currentHistory.length > 0 ? currentHistory[0] : null;

            if (lastMsg && lastMsg.role === 'assistant') {
              currentHistory[0] = { ...lastMsg, isStreaming: false };
            }

            return {
              isAiStreaming: false,
              aiChatHistory: currentHistory
            };
          });
        }

        else if (msg.type === 'translation_result' && msg.messageId && msg.translatedText) {
          const roomId = msg.roomId;
          if (roomId) get().mergeTranslationUpdate(roomId, msg.messageId, { [msg.targetLang]: msg.translatedText });
          else {
            for (const rId in state.messagesByRoom) {
              if (state.messagesByRoom[rId].some(m => m.id.chatMessageId === msg.messageId)) {
                get().mergeTranslationUpdate(rId, msg.messageId, { [msg.targetLang]: msg.translatedText });
                break;
              }
            }
          }
        }
      }, () => set({ aiWsConnected: true }));
    }
  },

  startPrivateChat: async (targetUserId) => {
    try {
      const res = await instance.post<AppApiResponse<Room>>(`/api/v1/rooms/private`, {}, { params: { targetUserId } });
      const room = res.data.result;
      if (room?.roomId) { get().upsertRoom(room); get().subscribeToRoom(room.roomId); return room; }
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
    if (room?.roomId) { await get().selectAiRoom(room.roomId); await get().fetchAiRoomList(); }
  },

  selectAiRoom: async (roomId) => {
    set({ activeAiRoomId: roomId, aiChatHistory: [], loadingByRoom: { ...get().loadingByRoom, [roomId]: true } });
    await get().loadMessages(roomId, 0, 10);
    const messages = get().messagesByRoom[roomId] || [];
    const aiFormatMessages: AiMessage[] = messages.map((m) => ({
      id: m.id.chatMessageId,
      role: (m.senderId && m.senderId !== AI_BOT_ID) ? 'user' : 'assistant',
      content: m.content || '',
      roomId: roomId
    }));
    set({ aiChatHistory: aiFormatMessages, loadingByRoom: { ...get().loadingByRoom, [roomId]: false } });
  },

  sendAiPrompt: (content) => {
    const { activeAiRoomId, aiWsConnected } = get();
    if (!activeAiRoomId || !aiWsConnected) return;

    // CHANGE: Prepend to history (index 0 is Newest) for Inverted FlatList
    const newMsg: AiMessage = { id: Date.now().toString(), role: 'user', content, roomId: activeAiRoomId };

    set((state) => ({
      aiChatHistory: [newMsg, ...state.aiChatHistory],
      isAiStreaming: true
    }));

    // CHANGE: Prepare history for backend (Oldest -> Newest), excluding the message we just added
    // get().aiChatHistory is [New, Old, Older]
    // slice(1) gets [Old, Older]
    // reverse() gets [Older, Old] (Chronological)
    const history = get().aiChatHistory.slice(1).reverse().map((m) => ({ role: m.role, content: m.content }));

    pythonAiWsService.sendMessage({ type: 'chat_request', prompt: content, history: history, roomId: activeAiRoomId, messageType: 'TEXT' });
  },

  sendAiWelcomeMessage: (localizedText: string) => {
    const { activeAiRoomId } = get();
    if (!activeAiRoomId) return;
    if (get().aiChatHistory.length > 0) return;
    const welcomeMsg: AiMessage = { id: 'local-welcome-' + Date.now(), role: 'assistant', content: localizedText, roomId: activeAiRoomId, isStreaming: false };
    set(state => ({ aiChatHistory: [welcomeMsg, ...state.aiChatHistory], isAiStreaming: false }));
  },

  loadMessages: async (roomId, page = 0, size = 25) => {
    const state = get();
    if (state.loadingByRoom[roomId] && page !== 0) return;
    set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: true } }));

    let room = state.rooms[roomId];
    if (!room) {
      room = await get().fetchRoomInfo(roomId) || undefined;
    }

    if (page === 0) {
      const cachedMsgsJson = mmkvStorage.getString(CACHE_PREFIX_MSGS + roomId);
      if (cachedMsgsJson) {
        try {
          let cachedMsgs = JSON.parse(cachedMsgsJson);
          let needsReDecryption = false;

          cachedMsgs = cachedMsgs.map((msg: any) => {
            if (msg.decryptedContent === LOADING_PLACEHOLDER || msg.decryptedContent === DECRYPTION_FAILED || msg.decryptedContent?.includes('⚠️')) {
              needsReDecryption = true;
              return { ...msg, decryptedContent: null };
            }
            return msg;
          });

          const decryptedCachedMsgs = await Promise.all(cachedMsgs.map(async (msg: any) => {
            if (!msg.decryptedContent && (msg.content || msg.isEncrypted)) {
              const safeRoom = get().rooms[roomId];
              let text = "";
              try {
                if (safeRoom?.purpose !== RoomPurpose.PRIVATE_CHAT) {
                  if (safeRoom?.secretKey) {
                    roomSecurityService.setKey(roomId, safeRoom.secretKey);
                    text = await roomSecurityService.decryptMessage(roomId, msg.content);
                  }
                } else {
                  if (msg.senderEphemeralKey) text = await e2eeService.decrypt(msg);
                }
              } catch (e) { text = ""; }
              if (text && text !== DECRYPTION_FAILED && !text.includes('🔒')) return { ...msg, decryptedContent: text };
            }
            return msg;
          }));

          set(s => ({ messagesByRoom: { ...s.messagesByRoom, [roomId]: decryptedCachedMsgs } }));
          if (needsReDecryption) saveRoomMessagesToCache(roomId, decryptedCachedMsgs);
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
        if (page === 0) saveRoomMessagesToCache(roomId, mergedList);
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

    let safeLocalAsset: any = localAsset;
    if (typeof localAsset === 'string') safeLocalAsset = { uri: localAsset, name: 'file', type: 'application/octet-stream' };

    // FIX: REMOVED LOCAL OPTIMISTIC UPDATE to prevent duplicates
    // We rely solely on the server echo via Stomp
    // get().sendTypingStatus(roomId, false); // DISABLED TYPING

    try {
      let finalMediaUrl = safeLocalAsset?.uri || '';
      let finalContent = content;
      if (safeLocalAsset) {
        try {
          const assetUri = safeLocalAsset.uri || safeLocalAsset.fileUrl || safeLocalAsset.path || safeLocalAsset.url;
          if (!assetUri) return;
          if (typeof assetUri === 'string' && assetUri.startsWith('http')) finalMediaUrl = assetUri;
          else {
            let safeType = safeLocalAsset.type || safeLocalAsset.mimeType;
            if (!safeType) safeType = type === 'IMAGE' ? 'image/jpeg' : type === 'VIDEO' ? 'video/mp4' : type === 'AUDIO' ? 'audio/mpeg' : 'application/octet-stream';
            safeType = String(safeType);
            const uploadPayload = { uri: assetUri, name: safeLocalAsset.name || `upload_${Date.now()}.${safeType.includes('video') ? 'mp4' : 'jpg'}`, type: safeType, mimeType: safeType };
            const uploadResult = await uploadTemp(uploadPayload);
            finalMediaUrl = uploadResult.fileUrl;
          }
        } catch (uploadError) { return; }
      }

      const isPrivateChat = room?.purpose === RoomPurpose.PRIVATE_CHAT;
      const finalPayload: any = { senderId: user.userId, roomId, messageType: type, purpose: room?.purpose || RoomPurpose.PRIVATE_CHAT, mediaUrl: type !== 'TEXT' ? finalMediaUrl : null, content: finalContent };

      if (type === 'TEXT') {
        if (isPrivateChat) {
          const receiverId = room?.members?.find(m => m.userId !== user.userId)?.userId;
          if (receiverId) {
            const encResult = await e2eeService.encrypt(receiverId, user.userId, content);
            // ENCRYPTED PAYLOAD: We send the CIPHERTEXT
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
            const hasKey = roomSecurityService.getKey(roomId);
            if (hasKey) {
              const encryptedContent = await roomSecurityService.encryptMessage(roomId, content);
              finalPayload.content = encryptedContent;
            }
          } catch (e) { return; }
        }
      }
      const dest = `/app/chat/room/${roomId}`;
      if (stompService.isConnected) stompService.publish(dest, finalPayload);
      else { get().initStompClient(); setTimeout(() => stompService.publish(dest, finalPayload), 1000); }
    } catch (err) { }
  },

  editMessage: async (roomId, messageId, newContent) => { await instance.put(`/api/v1/chat/messages/${messageId}`, { content: newContent }); },
  deleteMessage: async (roomId, messageId) => {
    await instance.delete(`/api/v1/chat/messages/${messageId}`);
    set(state => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: state.messagesByRoom[roomId]?.filter(m => m.id.chatMessageId !== messageId) || [] } }));
  },

  addReaction: (roomId, messageId, reaction) => {
    const user = useUserStore.getState().user;
    if (!user) return;
    const dest = `/app/chat/message/${messageId}/react`;
    const payload = { reaction, userId: user.userId };
    if (stompService.isConnected) stompService.publish(dest, payload);
  },

  markMessageAsRead: (roomId, messageId) => {
    if (messageId.startsWith('local') || messageId.startsWith('unknown')) return;
    const state = get();
    const roomMsgs = state.messagesByRoom[roomId] || [];
    const targetMsg = roomMsgs.find(m => m.id.chatMessageId === messageId);

    if (targetMsg && targetMsg.isRead === true) return;

    const user = useUserStore.getState().user;
    if (!user) return;
    set(currentState => ({
      messagesByRoom: { ...currentState.messagesByRoom, [roomId]: currentState.messagesByRoom[roomId]?.map(m => m.id.chatMessageId === messageId ? { ...m, isRead: true } : m) || [] },
      readReceipts: { ...currentState.readReceipts, [roomId]: { ...(currentState.readReceipts[roomId] || {}), [user.userId]: messageId } }
    }));
    const dest = `/app/chat/message/${messageId}/read`;
    const payload = { senderId: user?.userId, timestamp: new Date().toISOString() };
    if (stompService.isConnected) { try { stompService.publish(dest, payload); } catch (e) { set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: payload }] })); } }
    else { set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: payload }] })); get().initStompClient(); }
  },

  sendTypingStatus: (roomId, isTyping) => {
    /* DISABLED TYPING
    const user = useUserStore.getState().user;
    if (!user) return;
    const dest = `/app/chat/room/${roomId}/typing`;
    const payload = { userId: user.userId, isTyping, roomId };
    if (stompService.isConnected) stompService.publish(dest, payload);
    */
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