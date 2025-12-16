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
import mmkvStorage from '../utils/storage';

const AI_BOT_ID = "00000000-0000-0000-0000-000000000000";
const CACHE_PREFIX_MSGS = 'room_msgs_';

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
  _processDecryptionQueue: (roomId: string, messages: Message[]) => void;
  updateDecryptedContent: (roomId: string, messageId: string, decryptedContent: string) => void;
  mergeTranslationUpdate: (roomId: string, messageId: string, translations: Record<string, string>) => void;
}

const normalizeLexiconText = (text: string) => {
  if (!text) return "";
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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
  if (localMsg.isLocal && localMsg.senderId === serverMsg.senderId) {
    const timeDiff = Math.abs(parseDate(localMsg.id.sentAt) - parseDate(serverMsg.id.sentAt));
    if (timeDiff < 10000) {
      if (serverMsg.senderEphemeralKey) return true;
      if (localMsg.messageType === serverMsg.messageType) {
        if (localMsg.mediaUrl && localMsg.mediaUrl === serverMsg.mediaUrl) return true;
        if (localMsg.content === serverMsg.content) return true;
        if (localMsg.messageType === 'TEXT') return true;
      }
    }
  }
  return false;
};

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
      decryptedContent: newMessage.decryptedContent || existing.decryptedContent,
      isLocal: false,
      translationsMap: { ...existing.translationsMap, ...newMessage.translationsMap }
    };
    return { list, isNew: false };
  }

  if (!newMessage.isLocal) {
    const localMatchIndex = list.findIndex(m => m.isLocal && isSameMessage(m, newMessage));
    if (localMatchIndex > -1) {
      const existing = list[localMatchIndex];
      list[localMatchIndex] = {
        ...newMessage,
        decryptedContent: existing.decryptedContent || existing.content,
        isLocal: false,
        translationsMap: { ...existing.translationsMap, ...newMessage.translationsMap }
      };
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
    set(state => {
      const msgs = state.messagesByRoom[roomId] || [];
      const updatedMsgs = msgs.map(m => {
        if (m.id.chatMessageId !== messageId) return m;
        return { ...m, decryptedContent: decryptedContent };
      });
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
      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: updatedMsgs
        }
      };
    });
  },

  upsertRoom: (room: Room) => {
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

    // Trigger eager translation for newly decrypted
    const { chatSettings, nativeLanguage } = useAppStore.getState();
    const targetLang = chatSettings.targetLanguage || nativeLanguage || 'vi';
    if (chatSettings.autoTranslate) {
      results.forEach(res => {
        if (!res.text.includes('!!')) get().performEagerTranslation(res.id, res.text, targetLang);
      });
    }
  },

  performEagerTranslation: async (messageId: string, text: string, overrideTargetLang?: string) => {
    if (!text || !messageId) return;

    // LOG DEBUG FOR USER
    console.log(`[Lexicon-Debug] performEagerTranslation Start | MsgId: ${messageId} | Text: "${text}"`);

    if (text.trim().startsWith('{') && text.includes('ciphertext')) {
      console.warn("[Lexicon-Debug] Ignored JSON Ciphertext");
      return;
    }
    if (text.includes('!! Decryption Failed') || text.includes('🔒')) {
      console.warn("[Lexicon-Debug] Ignored Failed Decryption/Lock");
      return;
    }

    // New check: Suspicious ciphertext (no spaces, high entropy, ends with =)
    if (!text.includes(' ') && text.length > 20 && text.trim().endsWith('=')) {
      console.warn(`[Lexicon-Debug] WARNING: Text looks like RAW CIPHERTEXT/BASE64. Translation will fail. Input: ${text.substring(0, 15)}...`);
    }

    const { nativeLanguage, chatSettings } = useAppStore.getState();
    const targetLang = overrideTargetLang || chatSettings?.targetLanguage || nativeLanguage || 'vi';

    if (get().eagerTranslations[messageId]?.[targetLang]) return;

    const lexicon = get().lexiconMaster;
    if (lexicon.size === 0) {
      console.log("[Lexicon-Debug] Lexicon empty, fetching master...");
      await get().fetchLexiconMaster();
    }

    const normalizedInput = normalizeLexiconText(text);
    console.log(`[Lexicon-Debug] Normalized Input: "${normalizedInput}"`);

    if (!normalizedInput) return;

    const words = normalizedInput.split(' ').filter(w => w);

    let translatedText = '';
    let matchedWordsCount = 0;

    for (let i = 0; i < words.length;) {
      let bestMatch = '';
      let bestTranslation = '';
      let bestJ = 0;

      for (let j = Math.min(words.length - i, 8); j >= 1; j--) {
        const phrase = words.slice(i, i + j).join(' ');
        const phraseKey = normalizeLexiconText(phrase);
        let translations = lexicon.get(phraseKey);

        // Verbose check for the first few words to verify matching logic
        if (i === 0) {
          console.log(`[Lexicon-Debug] Checking Key: "${phraseKey}" | Found: ${!!translations}`);
        }

        if (translations && translations[targetLang]) {
          bestMatch = phrase;
          bestTranslation = translations[targetLang];
          bestJ = j;
          break;
        }
      }

      if (bestJ > 0) {
        translatedText += bestTranslation + ' ';
        i += bestJ;
        matchedWordsCount += bestJ;
      } else {
        translatedText += words[i] + ' ';
        i++;
      }
    }

    const finalLocalTranslation = translatedText.trim();
    const totalWords = words.length;
    const matchRatio = totalWords > 0 ? (matchedWordsCount / totalWords) : 0;

    console.log(`[Lexicon-Debug] Result: Ratio=${matchRatio} | Translated="${finalLocalTranslation}"`);

    const isClientGoodEnough = matchRatio >= 0.7 || (totalWords <= 5 && matchedWordsCount >= totalWords * 0.8);

    if (isClientGoodEnough && finalLocalTranslation.length > 0) {
      set(state => ({
        eagerTranslations: {
          ...state.eagerTranslations,
          [messageId]: { ...(state.eagerTranslations[messageId] || {}), [targetLang]: finalLocalTranslation }
        }
      }));
    } else {
      console.log(`Client translation miss (${Math.round(matchRatio * 100)}%). Waiting for server update via STOMP.`);
    }
  },

  fetchLexiconMaster: async () => {
    if (get().lexiconMaster.size > 0) return;
    try {
      const res = await instance.get<AppApiResponse<LexiconEntry[]>>('/api/py/lexicon/top', { params: { limit: 5000 } });
      const lexiconData = res.data.result || [];
      console.log(`[Lexicon-Debug] Fetched ${lexiconData.length} entries from server.`);

      const newLexicon = new Map<string, Record<string, string>>();

      lexiconData.forEach(entry => {
        const key = normalizeLexiconText(entry.original_text);
        const existing = newLexicon.get(key);
        if (existing) {
          newLexicon.set(key, { ...existing, ...entry.translations });
        } else {
          newLexicon.set(key, entry.translations);
        }
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

          if (roomId && senderId !== currentUserId && senderId !== AI_BOT_ID) {
            if (state.currentViewedRoomId !== roomId && !(state.isBubbleOpen && state.activeBubbleRoomId === roomId)) {
              if (state.appIsActive) { await playInAppSound(); state.openBubble(roomId); }
            }

            const newMsg = normalizeMessage(rawMsg);
            set((s) => {
              const currentList = s.messagesByRoom[roomId] || [];
              const { list } = upsertMessageList(currentList, newMsg);
              return { messagesByRoom: { ...s.messagesByRoom, [roomId]: list } };
            });

            if (newMsg.senderEphemeralKey || newMsg.content) {
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

            if (rawMsg.type === 'TRANSLATION_UPDATE') {
              get().mergeTranslationUpdate(rawMsg.roomId, rawMsg.id, rawMsg.translations);
              return;
            }

            const newMsg = normalizeMessage(rawMsg);
            if (!newMsg.roomId) newMsg.roomId = roomId;

            set((state) => {
              const currentList = state.messagesByRoom[roomId] || [];
              const { list } = upsertMessageList(currentList, newMsg);
              return { messagesByRoom: { ...state.messagesByRoom, [roomId]: list } };
            });

            // Always attempt decrypt/translate on incoming
            get().decryptNewMessages(roomId, [newMsg]);
          });
        } catch (e) { console.warn('Flush subscribe error', dest, e); }
      });
      set({ pendingSubscriptions: [] });
      const pendingPublishes = get().pendingPublishes || [];
      pendingPublishes.forEach(p => { try { stompService.publish(p.destination, p.payload); } catch (e) { console.warn('Publish failed', e); } });
      set({ pendingPublishes: [] });
    }, (err) => { console.error('STOMP connect error', err); set({ stompConnected: false }); });
  },

  disconnectStompClient: () => { stompService.disconnect(); set({ stompConnected: false }); },

  subscribeToRoom: (roomId: string) => {
    const chatDest = `/topic/room/${roomId}`;
    const statusDest = `/topic/room/${roomId}/status`;

    if (stompService.isConnected) {
      stompService.subscribe(chatDest, (rawMsg: any) => {
        if (rawMsg && rawMsg.type === 'VIDEO_CALL') { return; }

        if (rawMsg.type === 'TRANSLATION_UPDATE') {
          get().mergeTranslationUpdate(rawMsg.roomId, rawMsg.id, rawMsg.translations);
          return;
        }

        const newMsg = normalizeMessage(rawMsg);
        if (!newMsg.roomId) newMsg.roomId = roomId;

        set((state) => {
          const currentList = state.messagesByRoom[roomId] || [];
          const { list } = upsertMessageList(currentList, newMsg);
          return { messagesByRoom: { ...state.messagesByRoom, [roomId]: list } };
        });

        get().decryptNewMessages(roomId, [newMsg]);
      });

      stompService.subscribe(statusDest, (msg: any) => {
        if (msg.userId) { get().updateUserStatus(msg.userId, msg.status === 'ONLINE', new Date().toISOString()); }
      });
      return;
    }

    set((s) => ({ pendingSubscriptions: Array.from(new Set([...s.pendingSubscriptions, chatDest, statusDest])) }));
    get().initStompClient();
  },

  unsubscribeFromRoom: (roomId: string) => {
    const chatDest = `/topic/room/${roomId}`;
    const statusDest = `/topic/room/${roomId}/status`;
    if (stompService.isConnected) { stompService.unsubscribe(chatDest); stompService.unsubscribe(statusDest); }
    else { set((s) => ({ pendingSubscriptions: s.pendingSubscriptions.filter(d => d !== chatDest && d !== statusDest) })); }
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

    // Pre-load from cache if page 0
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
      const newMessages = rawMessages.map(normalizeMessage);
      const totalPages = res.data.result?.totalPages || 0;

      set((currentState) => {
        const currentMsgs = currentState.messagesByRoom[roomId] || [];
        let mergedList = page === 0 ? [] : [...currentMsgs];

        newMessages.forEach(msg => {
          const { list } = upsertMessageList(mergedList, msg);
          mergedList = list;
        });

        if (page === 0) {
          mmkvStorage.setItem(CACHE_PREFIX_MSGS + roomId, JSON.stringify(mergedList.slice(0, 50)));
        }

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
      const newMessages = rawMessages.map(normalizeMessage);

      get().decryptNewMessages(roomId, newMessages);

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
    const optimisticId = `local-${Date.now()}`;
    const isPrivateChat = room?.purpose === RoomPurpose.PRIVATE_CHAT;

    if (!isPrivateChat && room.secretKey) {
      await e2eeService.setRoomKey(roomId, room.secretKey);
    }

    let optimisticContent = content;
    if (type === 'IMAGE' && !content) optimisticContent = "📷 [Hình ảnh]";
    else if (type === 'VIDEO' && !content) optimisticContent = "🎥 [Video]";
    else if (type === 'AUDIO' && !content) optimisticContent = "🎤 [Audio]";
    else if (type === 'DOCUMENT' && !content) optimisticContent = "📄 [Tài liệu]";

    const optimisticMsg: ExtendedMessage = {
      id: { chatMessageId: optimisticId, sentAt: new Date().toISOString() },
      senderId: user.userId,
      content: optimisticContent,
      decryptedContent: content,
      messageType: type as any,
      mediaUrl: mediaUrl || null,
      isLocal: true,
      translationsMap: {},
      roomId: roomId,
      isRead: false,
      isDeleted: false,
    };

    set((s) => {
      const currentList = s.messagesByRoom[roomId] || [];
      const { list } = upsertMessageList(currentList, optimisticMsg);
      return { messagesByRoom: { ...s.messagesByRoom, [roomId]: list } };
    });

    let finalPayload: any = {
      senderId: user.userId,
      roomId,
      messageType: type,
      purpose: room?.purpose || RoomPurpose.PRIVATE_CHAT,
      mediaUrl: mediaUrl || null,
      receiverId,
      content: content
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
          const encryptedContent = await e2eeService.encryptGroupMessage(roomId, content);
          finalPayload.content = encryptedContent;
        } catch (e) {
          console.error("Group Encrypt Failed", e);
          return;
        }
      }
    }

    const dest = `/app/chat/room/${roomId}`;
    if (stompService.isConnected) {
      try { stompService.publish(dest, finalPayload); }
      catch (e) { set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: finalPayload }] })); }
    } else {
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
    const payload = { senderId: user?.userId, timestamp: new Date().toISOString() };
    if (stompService.isConnected) {
      try { stompService.publish(dest, payload); }
      catch (e) { set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: payload }] })); }
    } else {
      set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: payload }] }));
      get().initStompClient();
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