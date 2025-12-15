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
import { showToast } from '../components/Toast';

const AI_BOT_ID = "00000000-0000-0000-0000-000000000000";

type ExtendedMessage = Message & {
  selfContent?: string;
  selfEphemeralKey?: string;
  selfInitializationVector?: string;
};

type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  roomId: string;
};

type LexiconEntry = {
  original_text: string;
  original_lang: string;
  translations: Record<string, string>;
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
  lexiconMaster: Map<string, LexiconEntry>;
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
  sendMessage: (roomId: string, content: string, type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT', mediaUrl?: string) => void;
  editMessage: (roomId: string, messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (roomId: string, messageId: string) => Promise<void>;
  markMessageAsRead: (roomId: string, messageId: string) => void;
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
  performEagerTranslation: (messageId: string, text: string, targetLang?: string) => Promise<void>;
  translateLastNMessages: (roomId: string, targetLang: string, count?: number) => Promise<void>;
  decryptNewMessages: (roomId: string, newMessages: Message[]) => Promise<void>;
  updateDecryptedContent: (roomId: string, messageId: string, decryptedContent: string) => void;
}

const normalizeMessage = (msg: any): Message => {
  if (!msg) {
    return {
      id: { chatMessageId: 'unknown-' + Math.random(), sentAt: new Date().toISOString() },
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
      console.warn('Failed to parse message translations', e);
      parsedTranslations = {};
    }
  }

  const safeMediaUrl = msg.mediaUrl || msg.media_url || null;

  const baseMsg: ExtendedMessage = {
    ...msg,
    translationsMap: parsedTranslations,
    senderEphemeralKey: msg.senderEphemeralKey,
    usedPreKeyId: msg.usedPreKeyId,
    initializationVector: msg.initializationVector,
    selfContent: msg.selfContent,
    selfEphemeralKey: msg.selfEphemeralKey,
    selfInitializationVector: msg.selfInitializationVector,
    decryptedContent: msg.decryptedContent || null,
    mediaUrl: msg.mediaUrl || msg.media_url || null,
  };

  if (msg?.id?.chatMessageId) {
    return baseMsg as Message;
  }

  if (msg?.chatMessageId) {
    const rawMsg = {
      ...msg,
      id: { chatMessageId: msg.chatMessageId, sentAt: msg.sentAt || new Date().toISOString() },
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
  }

  if (msg?.id && typeof msg.id === 'string') {
    const rawMsg = {
      ...msg,
      id: { chatMessageId: msg.id, sentAt: msg.sentAt || new Date().toISOString() },
      translationsMap: parsedTranslations,
      senderEphemeralKey: msg.senderEphemeralKey,
      usedPreKeyId: msg.usedPreKeyId,
      initializationVector: msg.initializationVector,
      decryptedContent: msg.decryptedContent || null,
      mediaUrl: safeMediaUrl,
    };
    return rawMsg as Message;
  }

  const fallbackMsg = {
    ...msg,
    id: { chatMessageId: 'unknown-' + Math.random(), sentAt: new Date().toISOString() },
    decryptedContent: msg.decryptedContent || null,
    mediaUrl: safeMediaUrl,
  };
  return fallbackMsg as Message;
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

function upsertMessage(list: ExtendedMessage[], rawMsg: any, eagerCallback?: (msg: ExtendedMessage) => void): { list: ExtendedMessage[], isNew: boolean } {
  if (!rawMsg) return { list, isNew: false };
  const msg = normalizeMessage(rawMsg);
  const currentUserId = useUserStore.getState().user?.userId;

  if (msg.isDeleted) {
    return { list: list.filter(m => m.id.chatMessageId !== msg.id.chatMessageId), isNew: false };
  }

  if (eagerCallback && msg.senderId !== currentUserId && msg.messageType === 'TEXT' && (msg.content || msg.decryptedContent)) {
    if (msg.decryptedContent && !msg.senderEphemeralKey) {
      eagerCallback({ ...msg, content: msg.decryptedContent });
    } else if (!msg.senderEphemeralKey) {
      eagerCallback(msg);
    }
  }

  let workingList = [...list];
  let isNew = false;

  if (msg.senderId === currentUserId && !msg.isLocal) {
    const optimisticIndex = workingList.findIndex(m => {
      if (!m.isLocal) return false;
      if (msg.mediaUrl && m.mediaUrl) return m.mediaUrl === msg.mediaUrl;
      if (msg.messageType === 'TEXT') {
        const timeDiff = Math.abs(parseDate(msg.id.sentAt) - parseDate(m.id.sentAt));
        // Increase time tolerance to 60s to handle server time skew
        return timeDiff < 60000 && m.content?.trim() === msg.content?.trim();
      }
      return false;
    });

    if (optimisticIndex !== -1) {
      const optimisticMsg = workingList[optimisticIndex];
      if (optimisticMsg.decryptedContent) {
        msg.decryptedContent = optimisticMsg.decryptedContent;
      }
      workingList.splice(optimisticIndex, 1);
    }
  }

  const existsIndex = workingList.findIndex((m) => m.id.chatMessageId === msg.id.chatMessageId);

  if (existsIndex > -1) {
    const existing = workingList[existsIndex];
    if (Object.keys(existing.translationsMap || {}).length > Object.keys(msg.translationsMap || {}).length) {
      msg.translationsMap = { ...msg.translationsMap, ...existing.translationsMap };
    }
    if (existing.decryptedContent && !msg.decryptedContent) {
      msg.decryptedContent = existing.decryptedContent;
    }
    workingList[existsIndex] = msg;
  } else {
    workingList = [msg, ...workingList];
    isNew = true;
  }

  workingList.sort((a, b) => parseDate(b.id?.sentAt) - parseDate(a.id?.sentAt));
  return { list: workingList, isNew };
}

const normalizeLexiconText = (text: string) => {
  if (!text) return "";
  return text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ");
};

const normalizeLangCode = (lang: string) => {
  if (!lang) return 'en';
  return lang.split('-')[0].toLowerCase();
};

const getLexiconKey = (lang: string, text: string) => {
  return `${normalizeLangCode(lang)}:${normalizeLexiconText(text)}`;
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

  setCurrentAppScreen: (screen) => set({ currentAppScreen: screen }),
  setAppIsActive: (isActive) => set({ appIsActive: isActive }),
  setCurrentViewedRoomId: (roomId) => set({ currentViewedRoomId: roomId }),

  updateUserStatus: (userId, isOnline, lastActiveAt) => {
    set((state) => ({
      userStatuses: {
        ...state.userStatuses,
        [userId]: { userId, isOnline, lastActiveAt: lastActiveAt || (isOnline ? undefined : new Date().toISOString()) }
      }
    }));
  },

  updateDecryptedContent: (roomId, messageId, decryptedContent) => {
    set(state => ({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: state.messagesByRoom[roomId]?.map(m =>
          m.id.chatMessageId === messageId ? { ...m, decryptedContent: decryptedContent } : m
        ) || []
      }
    }));
  },

  upsertRoom: (room: Room) => {
    set((state) => ({
      rooms: {
        ...state.rooms,
        [room.roomId]: room
      }
    }));
  },

  decryptNewMessages: async (roomId, messagesToProcess) => {
    const user = useUserStore.getState().user;
    const currentUserId = user?.userId;
    const room = get().rooms[roomId];

    if (room?.purpose !== RoomPurpose.PRIVATE_CHAT) return;

    e2eeService.setUserId(currentUserId || '');

    const decryptionPromises = messagesToProcess.map(async (msg) => {
      if (msg.decryptedContent || msg.messageType !== 'TEXT') return;

      let ciphertext = msg.content;
      let ephemeralKey = msg.senderEphemeralKey;
      let iv = msg.initializationVector;

      if (msg.senderId === currentUserId) {
        if (msg.selfContent && msg.selfEphemeralKey && msg.selfInitializationVector) {
          ciphertext = msg.selfContent;
          ephemeralKey = msg.selfEphemeralKey;
          iv = msg.selfInitializationVector;
        } else {
          // Fallback if self columns are missing (e.g. sent from other device without self-copy)
          // or if local optimistic msg hasn't synced back yet
          return;
        }
      } else {
        if (!ephemeralKey) return;
      }

      const tempMsgForDecrypt: any = {
        ...msg,
        content: ciphertext,
        senderEphemeralKey: ephemeralKey,
        initializationVector: iv
      };

      try {
        const decryptedContent = await e2eeService.decrypt(tempMsgForDecrypt);
        get().updateDecryptedContent(roomId, msg.id.chatMessageId, decryptedContent);

        const { chatSettings } = useAppStore.getState();
        if (chatSettings.autoTranslate || chatSettings.targetLanguage) {
          await get().performEagerTranslation(msg.id.chatMessageId, decryptedContent);
        }
      } catch (e: any) {
        console.warn(`[ChatStore] Failed to decrypt ${msg.id.chatMessageId}:`, e);
        get().updateDecryptedContent(roomId, msg.id.chatMessageId, `!! Decryption Failed !!`);
      }
    });

    await Promise.all(decryptionPromises);
  },

  performEagerTranslation: async (messageId: string, text: string, overrideTargetLang?: string) => {
    if (!text || !messageId) return;
    if (text.trim().startsWith('{') && text.includes('ciphertext')) return;
    if (text.includes('!! Decryption Failed')) return;

    const { nativeLanguage, chatSettings } = useAppStore.getState();
    const targetLang = overrideTargetLang || chatSettings?.targetLanguage || nativeLanguage || 'vi';

    if (get().eagerTranslations[messageId]?.[targetLang]) return;

    const state = get();
    let existingMessage: Message | undefined;
    const currentRoomId = state.currentViewedRoomId;
    if (currentRoomId && state.messagesByRoom[currentRoomId]) {
      existingMessage = state.messagesByRoom[currentRoomId].find(m => m.id.chatMessageId === messageId);
    }
    if (!existingMessage) {
      for (const rId in state.messagesByRoom) {
        if (rId === currentRoomId) continue;
        existingMessage = state.messagesByRoom[rId]?.find(m => m.id.chatMessageId === messageId);
        if (existingMessage) break;
      }
    }

    if (existingMessage && existingMessage.translationsMap && existingMessage.translationsMap[targetLang]) {
      return;
    }

    const lexicon = get().lexiconMaster;
    const words = text.split(/\s+/).filter(w => w);
    let translatedText = '';
    let matchedWordsCount = 0;
    const sourceLangs = ['en', 'vi', 'zh', 'ja', 'ko', 'fr', 'es', 'de'];

    for (let i = 0; i < words.length; i++) {
      let bestMatch = '';
      let bestTranslation = '';
      let bestJ = 0;
      for (let j = Math.min(words.length - i, 6); j >= 1; j--) {
        const phrase = words.slice(i, i + j).join(' ');
        let foundTranslation = false;
        for (const srcLang of sourceLangs) {
          const key = getLexiconKey(srcLang, phrase);
          const entry = lexicon.get(key);
          if (entry && entry.translations[targetLang]) {
            bestMatch = phrase;
            bestTranslation = entry.translations[targetLang];
            bestJ = j;
            foundTranslation = true;
            break;
          }
        }
        if (foundTranslation) break;
      }
      if (bestJ > 0) {
        translatedText += bestTranslation + ' ';
        i += bestJ - 1;
        matchedWordsCount += bestJ;
      } else {
        translatedText += words[i] + ' ';
      }
    }

    const finalLocalTranslation = translatedText.trim();
    const totalWords = words.length;
    const matchRatio = totalWords > 0 ? (matchedWordsCount / totalWords) : 0;
    const isClientGoodEnough = matchRatio >= 0.7 || (totalWords <= 5 && matchedWordsCount >= 1);

    if (isClientGoodEnough && finalLocalTranslation.length > 0) {
      set(state => ({
        eagerTranslations: {
          ...state.eagerTranslations,
          [messageId]: { ...(state.eagerTranslations[messageId] || {}), [targetLang]: finalLocalTranslation }
        }
      }));
      return;
    }

    try {
      const res = await instance.post('/api/py/translate', {
        text,
        target_lang: targetLang,
        source_lang: 'auto',
        message_id: messageId.startsWith('local') ? undefined : messageId
      });
      const translatedTextFallback = res.data.result?.translated_text;
      if (translatedTextFallback) {
        set(state => ({
          eagerTranslations: {
            ...state.eagerTranslations,
            [messageId]: { ...(state.eagerTranslations[messageId] || {}), [targetLang]: translatedTextFallback }
          }
        }));
      }
    } catch (e) {
      console.error('[Translation] Backend fallback failed:', e);
    }
  },

  fetchLexiconMaster: async () => {
    try {
      const res = await instance.get<AppApiResponse<LexiconEntry[]>>('/api/py/lexicon/top', { params: { limit: 5000 } });
      const lexiconData = res.data.result || [];
      const newLexicon = new Map<string, LexiconEntry>();
      lexiconData.forEach(entry => {
        const key = getLexiconKey(entry.original_lang, entry.original_text);
        newLexicon.set(key, entry);
      });
      set({ lexiconMaster: newLexicon });
    } catch (e) { console.error("Failed to fetch lexicon master:", e); }
  },

  translateLastNMessages: async (roomId: string, targetLang: string, count = 10) => {
    const messages = get().messagesByRoom[roomId] || [];
    const currentUserId = useUserStore.getState().user?.userId;
    const candidates = messages.filter(m => m.messageType === 'TEXT' && m.senderId !== currentUserId && !m.isDeleted).slice(0, count);
    Promise.all(candidates.map(msg => {
      const contentToTranslate = msg.decryptedContent || msg.content;
      return (!msg.translationsMap || !msg.translationsMap[targetLang]) && contentToTranslate ?
        get().performEagerTranslation(msg.id.chatMessageId, contentToTranslate, targetLang) : Promise.resolve();
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
              set({ incomingCallRequest: rawMsg });
              await playInAppSound();
            }
            return;
          }
          const roomId = rawMsg?.roomId || rawMsg?.room_id;
          const senderId = rawMsg?.senderId || rawMsg?.sender_id;
          const state = get();

          const triggerEager = (m: Message) => {
            const { chatSettings } = useAppStore.getState();
            if (chatSettings.autoTranslate || chatSettings.targetLanguage) {
              get().performEagerTranslation(m.id.chatMessageId, m.content);
            }
          };

          if (roomId && senderId !== currentUserId && senderId !== AI_BOT_ID) {
            if (state.currentViewedRoomId !== roomId && !(state.isBubbleOpen && state.activeBubbleRoomId === roomId)) {
              if (state.appIsActive) { await playInAppSound(); state.openBubble(roomId); }
            }
            let newMsg: Message | undefined;
            set((s) => {
              const { list, isNew } = upsertMessage(s.messagesByRoom[roomId] || [], rawMsg, triggerEager);
              if (isNew) newMsg = list.find(m => m.id.chatMessageId === normalizeMessage(rawMsg).id.chatMessageId);
              return { messagesByRoom: { ...s.messagesByRoom, [roomId]: list } };
            });
            if (newMsg && newMsg.senderEphemeralKey) {
              get().decryptNewMessages(roomId, [newMsg]);
            }
          }
        });
      } catch (e) { console.warn("Notif sub error", e); }

      const pendingSubs = get().pendingSubscriptions || [];
      pendingSubs.forEach(dest => {
        try {
          stompService.subscribe(dest, (rawMsg: any) => {
            const roomId = extractRoomIdFromTopic(dest);
            if (dest.includes('/status')) { if (rawMsg.userId) { get().updateUserStatus(rawMsg.userId, rawMsg.status === 'ONLINE', rawMsg.timestamp); } return; }
            const triggerEager = (m: Message) => {
              const { chatSettings } = useAppStore.getState();
              if (chatSettings.autoTranslate || chatSettings.targetLanguage) {
                get().performEagerTranslation(m.id.chatMessageId, m.content);
              }
            };
            if (rawMsg && !rawMsg.roomId) rawMsg.roomId = roomId;
            let newMsg: Message | undefined;
            set((state) => {
              const { list, isNew } = upsertMessage(state.messagesByRoom[roomId] || [], rawMsg, triggerEager);
              if (isNew) newMsg = list.find(m => m.id.chatMessageId === normalizeMessage(rawMsg).id.chatMessageId);
              return { messagesByRoom: { ...state.messagesByRoom, [roomId]: list } };
            });
            if (newMsg && newMsg.senderEphemeralKey) {
              get().decryptNewMessages(roomId, [newMsg]);
            }
          });
        } catch (e) { console.warn('Flush subscribe error', dest, e); }
      });
      set({ pendingSubscriptions: [] });
      const pendingPubs = get().pendingPublishes || [];
      pendingPubs.forEach(p => { try { stompService.publish(p.destination, p.payload); } catch (e) { console.warn('Publish failed', e); } });
      set({ pendingPublishes: [] });
    }, (err) => { console.error('STOMP connect error', err); set({ stompConnected: false }); });
  },

  disconnectStompClient: () => {
    stompService.disconnect();
    set({ stompConnected: false });
  },

  subscribeToRoom: (roomId: string) => {
    const chatDest = `/topic/room/${roomId}`;
    const statusDest = `/topic/room/${roomId}/status`;
    if (stompService.isConnected) {
      stompService.subscribe(chatDest, (rawMsg: any) => {
        if (rawMsg && rawMsg.type === 'VIDEO_CALL') { return; }
        if (rawMsg && !rawMsg.roomId) rawMsg.roomId = roomId;
        const triggerEager = (m: Message) => {
          const { chatSettings } = useAppStore.getState();
          if (chatSettings.autoTranslate || chatSettings.targetLanguage) {
            get().performEagerTranslation(m.id.chatMessageId, m.content);
          }
        };
        let newMsg: Message | undefined;
        set((state) => {
          const { list, isNew } = upsertMessage(state.messagesByRoom[roomId] || [], rawMsg, triggerEager);
          if (isNew) newMsg = list.find(m => m.id.chatMessageId === normalizeMessage(rawMsg).id.chatMessageId);
          return { messagesByRoom: { ...state.messagesByRoom, [roomId]: list } };
        });
        if (newMsg) {
          get().decryptNewMessages(roomId, [newMsg]);
        }
      });
      stompService.subscribe(statusDest, (msg: any) => {
        if (msg.userId) {
          get().updateUserStatus(msg.userId, msg.status === 'ONLINE', new Date().toISOString());
        }
      });
      return;
    }
    set((s) => ({ pendingSubscriptions: Array.from(new Set([...s.pendingSubscriptions, chatDest, statusDest])) }));
    get().initStompClient();
  },

  unsubscribeFromRoom: (roomId: string) => {
    const chatDest = `/topic/room/${roomId}`;
    const statusDest = `/topic/room/${roomId}/status`;
    if (stompService.isConnected) {
      stompService.unsubscribe(chatDest);
      stompService.unsubscribe(statusDest);
    } else {
      set((s) => ({ pendingSubscriptions: s.pendingSubscriptions.filter(d => d !== chatDest && d !== statusDest) }));
    }
  },

  initAiClient: () => {
    if (!pythonAiWsService.isConnected) {
      pythonAiWsService.connect((msg: any) => {
        const state = get();
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
        set((state) => ({ rooms: { ...state.rooms, [room.roomId]: room } }));
        get().subscribeToRoom(room.roomId);
        return room;
      }
      return null;
    } catch (error) { console.error('Failed to start private chat:', error); return null; }
  },

  fetchAiRoomList: async () => {
    const userId = useUserStore.getState().user?.userId;
    if (!userId) return;
    try {
      const res = await instance.get<AppApiResponse<Room[]>>(`/api/v1/rooms/ai-history`, { params: { userId } });
      if (res.data.result) set({ aiRoomList: res.data.result });
    } catch (e) { console.error(e); }
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

  loadMessages: async (roomId, page = 0, size = 10) => {
    const state = get();
    if (state.loadingByRoom[roomId] && page !== 0) return;
    set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: true } }));

    try {
      const res = await instance.get<AppApiResponse<PageResponse<any>>>(`/api/v1/chat/room/${roomId}/messages`, { params: { page, size, sort: 'id.sentAt,desc' } });
      const rawMessages = res.data.result?.content || [];
      const newMessages = rawMessages.map(normalizeMessage);
      const totalPages = res.data.result?.totalPages || 0;

      await get().decryptNewMessages(roomId, newMessages);

      set((currentState) => {
        const currentMsgs = currentState.messagesByRoom[roomId] || [];
        let uniqueList = page === 0 ? [] : [...currentMsgs];

        newMessages.forEach(msg => {
          const existsIndex = uniqueList.findIndex(m => m.id.chatMessageId === msg.id.chatMessageId);
          if (existsIndex > -1) {
            const existing = uniqueList[existsIndex];
            uniqueList[existsIndex] = {
              ...existing,
              ...msg,
              decryptedContent: msg.decryptedContent || existing.decryptedContent
            };
          } else {
            uniqueList.push(msg);
          }
        });

        uniqueList.sort((a, b) => parseDate(b.id.sentAt) - parseDate(a.id.sentAt));

        return {
          messagesByRoom: { ...currentState.messagesByRoom, [roomId]: uniqueList },
          pageByRoom: { ...currentState.pageByRoom, [roomId]: page },
          hasMoreByRoom: { ...currentState.hasMoreByRoom, [roomId]: page < totalPages - 1 },
          loadingByRoom: { ...currentState.loadingByRoom, [roomId]: false },
        };
      });
    } catch (e) { set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: false } })); }
  },

  searchMessages: async (roomId, keyword) => {
    if (!keyword.trim()) { await get().loadMessages(roomId, 0, 20); return; }
    set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: true } }));
    try {
      const res = await instance.get<AppApiResponse<PageResponse<any>>>(`/api/v1/chat/room/${roomId}/messages`, { params: { page: 0, size: 50, keyword } });
      const rawMessages = res.data.result?.content || [];
      const newMessages = rawMessages.map(normalizeMessage);

      await get().decryptNewMessages(roomId, newMessages);

      set((currentState) => ({
        messagesByRoom: { ...currentState.messagesByRoom, [roomId]: newMessages },
        loadingByRoom: { ...currentState.loadingByRoom, [roomId]: false },
        hasMoreByRoom: { ...currentState.hasMoreByRoom, [roomId]: false }
      }));
    } catch (e) { set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: false } })); }
  },

  sendMessage: async (roomId, content, type, mediaUrl) => {
    const state = get();
    const user = useUserStore.getState().user;

    if (!user?.userId) {
      console.error("[ChatStore-ERROR] Cannot send message: User ID is missing!");
      showToast({ message: "Lỗi thông tin người dùng. Vui lòng đăng nhập lại.", type: "error" });
      return;
    }

    const room = state.rooms[roomId];
    const receiverId = room?.members?.find(m => m.userId !== user?.userId)?.userId || null;
    const optimisticId = `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const isPrivateChat = room?.purpose === RoomPurpose.PRIVATE_CHAT;

    console.log(`[ChatStore-DEBUG] sendMessage: Room=${roomId}, Type=${type}, Receiver=${receiverId}`);

    // ✅ 1. KHỞI TẠO finalPayload VỚI GIÁ TRỊ MẶC ĐỊNH TRƯỚC
    let finalPayload: any = {
      senderId: user.userId,
      roomId,
      messageType: type,
      purpose: room?.purpose || RoomPurpose.PRIVATE_CHAT,
      mediaUrl: mediaUrl || null,
      receiverId,
      isRead: false,
      content: content // Mặc định là plaintext
    };

    let optimisticContent = content;

    // ✅ 2. NẾU CẦN E2EE, GHI ĐÈ CÁC TRƯỜNG
    if (isPrivateChat && receiverId && type === 'TEXT') {
      try {
        console.log(`[ChatStore-DEBUG] Performing Dual Encryption...`);
        e2eeService.setUserId(user.userId);

        const encResult = await e2eeService.encrypt(receiverId, user.userId, content);

        // ✅ GHI ĐÈ CÁC TRƯỜNG MÃ HÓA
        finalPayload.content = encResult.content;
        finalPayload.senderEphemeralKey = encResult.senderEphemeralKey;
        finalPayload.usedPreKeyId = encResult.usedPreKeyId;
        finalPayload.initializationVector = encResult.initializationVector;
        finalPayload.selfContent = encResult.selfContent;
        finalPayload.selfEphemeralKey = encResult.selfEphemeralKey;
        finalPayload.selfInitializationVector = encResult.selfInitializationVector;

        console.log(`[ChatStore-DEBUG] ✅ Encryption success.`);

      } catch (error) {
        console.error("[ChatStore-ERROR] ❌ Encryption Failed:", error);
        showToast({ message: "Lỗi mã hóa! Không gửi được.", type: "error" });
        return;
      }
    }

    // ✅ 3. LOG ĐỂ KIỂM TRA
    console.log(`[ChatStore-DEBUG] Final Payload Check:`, {
      senderId: finalPayload.senderId,
      hasContent: !!finalPayload.content,
      contentLength: finalPayload.content?.length || 0,
      hasSenderEphemeralKey: !!finalPayload.senderEphemeralKey,
      hasSelfContent: !!finalPayload.selfContent
    });

    // ✅ 4. TẠO OPTIMISTIC MESSAGE
    const optimisticMsg: ExtendedMessage = {
      id: { chatMessageId: optimisticId, sentAt: new Date().toISOString() },
      senderId: user.userId,
      content: finalPayload.content,
      decryptedContent: optimisticContent,
      messageType: type as any,
      mediaUrl: mediaUrl || null,
      isLocal: true,
      translatedText: null,
      translationsMap: {},
      senderEphemeralKey: finalPayload.senderEphemeralKey,
      roomId: roomId,   // ✅ Added
      isDeleted: false, // ✅ Added
      isRead: false     // ✅ Added
    };

    set((s) => ({
      messagesByRoom: {
        ...s.messagesByRoom,
        [roomId]: upsertMessage(s.messagesByRoom[roomId] || [], optimisticMsg).list
      }
    }));

    // ✅ 5. GỬI QUA STOMP
    const dest = `/app/chat/room/${roomId}`;

    console.log(`[ChatStore-DEBUG] Preparing to publish to ${dest}. Connected: ${stompService.isConnected}`);

    if (stompService.isConnected) {
      try {
        stompService.publish(dest, finalPayload);
        console.log(`[ChatStore-DEBUG] ✅ STOMP publish called successfully.`);
      } catch (e) {
        console.error(`[ChatStore-ERROR] ❌ STOMP publish threw error:`, e);
        set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: finalPayload }] }));
      }
    } else {
      console.warn(`[ChatStore-WARN] STOMP not connected. Queueing message.`);
      set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: finalPayload }] }));
      get().initStompClient();
    }
  },

  editMessage: async (roomId, messageId, newContent) => { await instance.put(`/api/v1/chat/messages/${messageId}`, { content: newContent }); },
  deleteMessage: async (roomId, messageId) => {
    await instance.delete(`/api/v1/chat/messages/${messageId}`);
    set(state => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: state.messagesByRoom[roomId]?.filter(m => m.id.chatMessageId !== messageId) || [] } }));
  },

  markMessageAsRead: (roomId, messageId) => {
    if (messageId.startsWith('local') || messageId.startsWith('unknown')) return;

    set(state => ({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: state.messagesByRoom[roomId]?.map(m =>
          m.id.chatMessageId === messageId ? { ...m, isRead: true } : m
        ) || []
      }
    }));

    const user = useUserStore.getState().user;
    const dest = `/app/chat/message/${messageId}/read`;
    const payload = {
      senderId: user?.userId,
      timestamp: new Date().toISOString()
    };

    if (stompService.isConnected) {
      try { stompService.publish(dest, payload); }
      catch (e) { set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: payload }] })); }
    } else {
      set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: payload }] }));
      get().initStompClient();
    }
  },

  sendAiPrompt: (content) => {
    const { activeAiRoomId, aiWsConnected } = get();
    if (!activeAiRoomId || !aiWsConnected) return;
    set((state) => ({ aiChatHistory: [...state.aiChatHistory, { id: Date.now().toString(), role: 'user', content, roomId: activeAiRoomId }], isAiStreaming: true }));
    const history = get().aiChatHistory.map((m) => ({ role: m.role, content: m.content }));
    pythonAiWsService.sendMessage({ type: 'chat_request', prompt: content, history: history.slice(0, -1), roomId: activeAiRoomId, messageType: 'TEXT' });
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