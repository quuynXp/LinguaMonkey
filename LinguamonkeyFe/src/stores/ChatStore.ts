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

const AI_BOT_ID = "00000000-0000-0000-0000-000000000000";

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

  disconnectStompClient: () => void;

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
}

const normalizeMessage = (msg: any): Message => {
  if (!msg) {
    return {
      id: { chatMessageId: 'unknown-' + Math.random(), sentAt: new Date().toISOString() },
    } as Message;
  }

  // Parse translations safely
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

  const mapTranslationFields = (source: any) => ({
    translationsMap: parsedTranslations,
    translatedText: source.translatedText || null,
  });

  // CRITICAL FIX: Robust ID Extraction
  // Priority 1: Nested id.chatMessageId (Standard Entity)
  if (msg?.id?.chatMessageId) {
    return { ...msg, ...mapTranslationFields(msg) } as Message;
  }

  // Priority 2: Flat chatMessageId (DTO / Projection)
  if (msg?.chatMessageId) {
    return {
      ...msg,
      id: { chatMessageId: msg.chatMessageId, sentAt: msg.sentAt || new Date().toISOString() },
      senderId: msg.senderId,
      content: msg.content,
      ...mapTranslationFields(msg)
    } as Message;
  }

  // Priority 3: 'id' field as string (Simplified DTO)
  if (msg?.id && typeof msg.id === 'string') {
    return {
      ...msg,
      id: { chatMessageId: msg.id, sentAt: msg.sentAt || new Date().toISOString() },
      ...mapTranslationFields(msg)
    } as Message;
  }

  // Fallback (Should rarely happen if backend is correct)
  return {
    ...msg,
    id: { chatMessageId: 'unknown-' + Math.random(), sentAt: new Date().toISOString() }
  } as Message;
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

function upsertMessage(list: Message[], rawMsg: any, eagerCallback?: (msg: Message) => void): Message[] {
  if (!rawMsg) return list;
  const msg = normalizeMessage(rawMsg);
  const currentUserId = useUserStore.getState().user?.userId;

  if (msg.isDeleted) {
    return list.filter(m => m.id.chatMessageId !== msg.id.chatMessageId);
  }

  // Trigger translation for incoming text messages from others
  if (eagerCallback && msg.senderId !== currentUserId && msg.messageType === 'TEXT' && msg.content) {
    eagerCallback(msg);
  }

  let workingList = [...list];

  // CRITICAL FIX: Remove local optimistic message when server message arrives
  // Logic: If I am sender, and this new msg is NOT local (from server),
  // find any local message with similar content and remove it before adding the real one.
  if (msg.senderId === currentUserId && !msg.isLocal) {
    // We filter out any LOCAL message that has same content (trimmed)
    workingList = workingList.filter(m => {
      const isMyLocal = m.isLocal === true;
      const contentMatch = m.content?.trim() === msg.content?.trim();
      // If it's my local message and content matches, DELETE IT (return false to filter out)
      // because we are about to add the authoritative server version.
      return !(isMyLocal && contentMatch);
    });
  }

  const existsIndex = workingList.findIndex((m) => m.id.chatMessageId === msg.id.chatMessageId);

  if (existsIndex > -1) {
    // Update existing message
    const existing = workingList[existsIndex];
    // Preserve translation map if existing has more data
    if (Object.keys(existing.translationsMap || {}).length > Object.keys(msg.translationsMap || {}).length) {
      msg.translationsMap = { ...msg.translationsMap, ...existing.translationsMap };
    }
    // Preserve local status if for some reason we are updating a local message
    if (existing.isLocal && !msg.id.chatMessageId.startsWith('local')) {
      // If we matched ID but existing was local, it means ID was generated correctly client side? 
      // Rare case, usually we swap. Let's trust the new msg unless it's strictly an update.
    }
    workingList[existsIndex] = msg;
  } else {
    // Add new message
    workingList = [msg, ...workingList];
  }

  // Sort Descending (Newest first) for Store storage
  return workingList.sort((a, b) => {
    const timeA = parseDate(a.id?.sentAt);
    const timeB = parseDate(b.id?.sentAt);
    if (timeA === timeB) {
      const idA = a.id?.chatMessageId || '';
      const idB = b.id?.chatMessageId || '';
      return idB.localeCompare(idA);
    }
    return timeB - timeA;
  });
}

function extractRoomIdFromTopic(topic: string) {
  const parts = topic.split('/');
  return parts[parts.length - 1];
}

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
  totalOnlineUsers: 0,
  currentViewedRoomId: null,
  incomingCallRequest: null,

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

  performEagerTranslation: async (messageId: string, text: string, overrideTargetLang?: string) => {
    if (!text || !messageId) return;
    const { nativeLanguage, chatSettings } = useAppStore.getState();
    const targetLang = overrideTargetLang || chatSettings?.targetLanguage || nativeLanguage || 'vi';

    // Check if we already have it
    if (get().eagerTranslations[messageId]?.[targetLang]) return;

    try {
      // 1. Call Python API (Fastest Path)
      const res = await instance.post('/api/py/translate', {
        text,
        target_lang: targetLang,
        source_lang: 'auto',
        message_id: messageId.startsWith('local') ? undefined : messageId
      });

      const translatedText = res.data.result?.translated_text;

      if (translatedText) {
        // 2. Update Local State immediately for UI
        set(state => ({
          eagerTranslations: {
            ...state.eagerTranslations,
            [messageId]: { ...(state.eagerTranslations[messageId] || {}), [targetLang]: translatedText }
          }
        }));
      }

    } catch (e) {
      console.warn("Eager translation failed", e);
    }
  },

  translateLastNMessages: async (roomId: string, targetLang: string, count = 10) => {
    const messages = get().messagesByRoom[roomId] || [];
    const currentUserId = useUserStore.getState().user?.userId;

    const candidates = messages
      .filter(m => m.messageType === 'TEXT' && m.senderId !== currentUserId && !m.isDeleted)
      .slice(0, count);

    Promise.all(candidates.map(msg =>
      get().performEagerTranslation(msg.id.chatMessageId, msg.content, targetLang)
    ));
  },

  initStompClient: () => {
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
          const currentUserId = useUserStore.getState().user?.userId;
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
            // IMPORTANT: Ensure roomId is correct type
            set((s) => ({ messagesByRoom: { ...s.messagesByRoom, [roomId]: upsertMessage(s.messagesByRoom[roomId] || [], rawMsg, triggerEager) } }));
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

            // Inject roomId if missing in payload
            if (rawMsg && !rawMsg.roomId) rawMsg.roomId = roomId;

            set((state) => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: upsertMessage(state.messagesByRoom[roomId] || [], rawMsg, triggerEager) } }));
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

        set((state) => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: upsertMessage(state.messagesByRoom[roomId] || [], rawMsg, triggerEager) } }));
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
    }
    else {
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

      // Trigger eager translation for loaded messages
      const { chatSettings } = useAppStore.getState();
      if (chatSettings.autoTranslate && newMessages.length > 0) {
        newMessages.slice(0, 5).forEach((m: Message) => {
          if (m.senderId !== useUserStore.getState().user?.userId) {
            get().performEagerTranslation(m.id.chatMessageId, m.content);
          }
        });
      }

      set((currentState) => {
        const currentMsgs = currentState.messagesByRoom[roomId] || [];
        const updatedList = page === 0 ? newMessages : [...currentMsgs, ...newMessages];
        const uniqueMap = new Map();
        updatedList.forEach(item => { if (item?.id?.chatMessageId) uniqueMap.set(item.id.chatMessageId, item); });
        const uniqueList = Array.from(uniqueMap.values()) as Message[];
        uniqueList.sort((a, b) => {
          const timeA = parseDate(a.id.sentAt);
          const timeB = parseDate(b.id.sentAt);
          if (timeA === timeB) return (b.id.chatMessageId || '').localeCompare(a.id.chatMessageId || '');
          return timeB - timeA;
        });
        return {
          messagesByRoom: { ...currentState.messagesByRoom, [roomId]: uniqueList },
          pageByRoom: { ...currentState.pageByRoom, [roomId]: page },
          hasMoreByRoom: { ...currentState.hasMoreByRoom, [roomId]: page < totalPages - 1 },
          loadingByRoom: { ...currentState.loadingByRoom, [roomId]: false },
        };
      });
    } catch (e) { set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: false } })); }
  },

  searchMessages: async (roomId: string, keyword: string) => {
    if (!keyword.trim()) { await get().loadMessages(roomId, 0, 20); return; }
    set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: true } }));
    try {
      const res = await instance.get<AppApiResponse<PageResponse<any>>>(`/api/v1/chat/room/${roomId}/messages`, { params: { page: 0, size: 50, keyword } });
      const rawMessages = res.data.result?.content || [];
      const newMessages = rawMessages.map(normalizeMessage);
      set((currentState) => ({
        messagesByRoom: { ...currentState.messagesByRoom, [roomId]: newMessages },
        loadingByRoom: { ...currentState.loadingByRoom, [roomId]: false },
        hasMoreByRoom: { ...currentState.hasMoreByRoom, [roomId]: false }
      }));
    } catch (e) { set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: false } })); }
  },

  sendMessage: (roomId, content, type, mediaUrl) => {
    const state = get();
    const room = state.rooms[roomId];
    const payload = { content, roomId, messageType: type, purpose: room?.purpose || RoomPurpose.GROUP_CHAT, mediaUrl: mediaUrl || null };

    // Optimistic ID must strictly start with 'local-' for detection logic
    const optimisticId = `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const optimisticMsg = {
      id: { chatMessageId: optimisticId, sentAt: new Date().toISOString() },
      senderId: useUserStore.getState().user?.userId,
      content,
      messageType: type,
      mediaUrl: mediaUrl || null,
      isLocal: true,
      translatedText: null,
      translatedLang: null
    } as any;

    // Add optimistic message instantly
    set((s) => ({ messagesByRoom: { ...s.messagesByRoom, [roomId]: upsertMessage(s.messagesByRoom[roomId] || [], optimisticMsg) } }));

    const dest = `/app/chat/room/${roomId}`;
    if (stompService.isConnected) {
      try { stompService.publish(dest, payload); }
      catch (e) { set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload }] })); }
    } else {
      set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload }] }));
      get().initStompClient();
    }
  },

  editMessage: async (roomId, messageId, newContent) => { await instance.put(`/api/v1/chat/messages/${messageId}`, { content: newContent }); },
  deleteMessage: async (roomId, messageId) => {
    await instance.delete(`/api/v1/chat/messages/${messageId}`);
    set(state => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: state.messagesByRoom[roomId]?.filter(m => m.id.chatMessageId !== messageId) || [] } }));
  },
  markMessageAsRead: (roomId, messageId) => {
    const dest = `/app/chat/message/${messageId}/read`;
    if (stompService.isConnected) {
      try { stompService.publish(dest, {}); }
      catch (e) { set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: {} }] })); }
    } else {
      set((s) => ({ pendingPublishes: [...s.pendingPublishes, { destination: dest, payload: {} }] }));
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