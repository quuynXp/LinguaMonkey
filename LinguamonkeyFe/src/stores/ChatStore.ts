import { create } from 'zustand';
import { stompService } from '../services/stompService';
import { pythonAiWsService } from '../services/pythonAiWsService';
import { VideoSubtitleService, DualSubtitle } from '../services/videoSubtitleService';
import instance from '../api/axiosClient';
import type { ChatMessage as Message, Room } from '../types/entity';
import type { AppApiResponse, PageResponse } from '../types/dto';
import { useUserStore } from "./UserStore";
import { RoomPurpose } from "../types/enums";
import notificationService from '../services/notificationService';
import { playInAppSound } from '../utils/soundUtils';

type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  roomId: string;
};

interface UseChatState {
  stompConnected: boolean;
  aiWsConnected: boolean;
  rooms: { [roomId: string]: Room };
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
  isAiInitialMessageSent: boolean;
  videoSubtitleService: VideoSubtitleService | null;
  currentVideoSubtitles: DualSubtitle | null;
  activeBubbleRoomId: string | null;
  isBubbleOpen: boolean;
  currentAppScreen: string | null;
  appIsActive: boolean;

  initStompClient: () => void;
  subscribeToRoom: (roomId: string) => void;
  unsubscribeFromRoom: (roomId: string) => void;
  initAiClient: () => void;
  startPrivateChat: (targetUserId: string) => Promise<Room | null>;
  fetchAiRoomList: () => Promise<void>;
  startNewAiChat: () => Promise<void>;
  selectAiRoom: (roomId: string) => Promise<void>;
  sendAiPrompt: (content: string) => void;
  sendAiWelcomeMessage: () => void;
  loadMessages: (roomId: string, page?: number, size?: number) => Promise<void>;
  sendMessage: (roomId: string, content: string, type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO', mediaUrl?: string) => void;
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
}

const decideNotificationAction = async (parsedMsg: any) => {
  try {
    // Robustly extract roomId. ChatMessageResponse usually has roomId as UUID string.
    const roomId = parsedMsg?.roomId || parsedMsg?.room_id;

    if (!roomId) {
      console.warn('decideNotificationAction: roomId missing in message', parsedMsg);
      return;
    }

    const currentUser = useUserStore.getState().user;
    if (!currentUser) return;

    const currentUserId = currentUser.userId;
    const senderId = parsedMsg?.senderId || parsedMsg?.sender_id;

    // Don't notify if I sent the message
    if (senderId === currentUserId) return;

    const state = useChatStore.getState();
    const appIsActive = state.appIsActive;
    const currentScreen = state.currentAppScreen;

    console.log(`Notification Check - Active: ${appIsActive}, Screen: ${currentScreen}, Room: ${roomId}`);

    if (appIsActive) {
      // Logic: If user is inside THIS chat screen, do nothing (or subtle sound).
      // If user is in app but OTHER screen, show bubble + sound.

      const isInSpecificChat = currentScreen === 'GroupChatScreen' && state.activeBubbleRoomId === roomId;
      // Note: activeBubbleRoomId might track the 'open' bubble, but to check navigation stack efficiently
      // we usually rely on Route Params. For now, assuming if they are in 'GroupChatScreen', 
      // we might want to suppress ONLY if params.roomId matches. 
      // Since we don't have direct access to route params here easily without nav ref, 
      // we'll assume "If screen is GroupChatScreen", we might suppress OR verify via state.

      // Better approach: Always play sound. Only open bubble if NOT in chat.
      await playInAppSound();

      if (!isInSpecificChat) {
        state.openBubble(roomId);
      }
    } else {
      // App is in background (but not killed, assuming JS still runs briefly).
      // Stomp might disconnect, but if alive:
      // Let FCM handle the visual notification to avoid double toast.
      // But we can update badge counts here if implemented.
    }
  } catch (e) {
    console.warn('decideNotificationAction error', e);
  }
};

const normalizeMessage = (msg: any): Message => {
  if (!msg) {
    return {
      id: { chatMessageId: 'unknown-' + Math.random(), sentAt: new Date().toISOString() },
    } as Message;
  }
  if (msg?.id?.chatMessageId) return msg as Message;
  if (msg?.chatMessageId) {
    return {
      ...msg,
      id: {
        chatMessageId: msg.chatMessageId,
        sentAt: msg.sentAt || new Date().toISOString()
      },
      senderId: msg.senderId,
      content: msg.content
    } as Message;
  }
  if (typeof msg === 'string') {
    try {
      const parsed = JSON.parse(msg);
      return normalizeMessage(parsed);
    } catch (e) {
      console.warn("normalizeMessage: cannot parse string message", e);
    }
  }
  return {
    ...msg,
    id: { chatMessageId: 'unknown-' + Math.random(), sentAt: new Date().toISOString() }
  } as Message;
};

const parseDate = (dateInput: any): number => {
  if (!dateInput) return Date.now();
  if (Array.isArray(dateInput)) {
    const [y, M, d, h, m, s] = dateInput;
    return new Date(y, M - 1, d, h || 0, m || 0, s || 0).getTime();
  }
  return new Date(dateInput).getTime();
};

function upsertMessage(list: Message[], rawMsg: any): Message[] {
  if (!rawMsg) return list;
  const msg = normalizeMessage(rawMsg);
  if (msg.isDeleted) {
    return list.filter(m => m.id.chatMessageId !== msg.id.chatMessageId);
  }
  const exists = list.find((m) => m.id.chatMessageId === msg.id.chatMessageId);
  if (exists) {
    return list.map((m) => (m.id.chatMessageId === msg.id.chatMessageId ? msg : m));
  }
  const newList = [msg, ...list];
  return newList.sort((a, b) => {
    const timeA = parseDate(a.id?.sentAt);
    const timeB = parseDate(b.id?.sentAt);
    return timeB - timeA;
  });
}

function extractRoomIdFromTopic(topic: string) {
  const parts = topic.split('/');
  return parts[parts.length - 1];
}

export const useChatStore = create<UseChatState>((set, get) => ({
  stompConnected: false,
  aiWsConnected: false,
  pendingSubscriptions: [],
  pendingPublishes: [],
  rooms: {},
  aiRoomList: [],
  messagesByRoom: {},
  pageByRoom: {},
  hasMoreByRoom: {},
  loadingByRoom: {},
  aiChatHistory: [],
  isAiStreaming: false,
  activeAiRoomId: null,
  isAiInitialMessageSent: false,
  videoSubtitleService: null,
  currentVideoSubtitles: null,
  activeBubbleRoomId: null,
  isBubbleOpen: false,
  currentAppScreen: null,
  appIsActive: true,

  setCurrentAppScreen: (screen) => set({ currentAppScreen: screen }),
  setAppIsActive: (isActive) => set({ appIsActive: isActive }),

  initStompClient: () => {
    if (stompService.isConnected || get().stompConnected) {
      set({ stompConnected: true });
      return;
    }
    stompService.connect(() => {
      set({ stompConnected: true });
      const pendingSubs = get().pendingSubscriptions || [];
      pendingSubs.forEach(dest => {
        try {
          stompService.subscribe(dest, (rawMsg: any) => {
            const roomId = extractRoomIdFromTopic(dest);
            // Ensure rawMsg has roomId for decideNotificationAction
            if (rawMsg && !rawMsg.roomId) {
              rawMsg.roomId = roomId;
            }
            decideNotificationAction(rawMsg);
            set((state) => ({
              messagesByRoom: {
                ...state.messagesByRoom,
                [roomId]: upsertMessage(state.messagesByRoom[roomId] || [], rawMsg),
              },
            }));
          });
        } catch (e) {
          console.warn('Flush subscribe error', dest, e);
        }
      });
      set({ pendingSubscriptions: [] });
      const pendingPubs = get().pendingPublishes || [];
      pendingPubs.forEach(p => {
        try { stompService.publish(p.destination, p.payload); }
        catch (e) { console.warn('Publish failed', e); }
      });
      set({ pendingPublishes: [] });
    }, (err) => console.error('STOMP connect error', err));
  },

  subscribeToRoom: (roomId: string) => {
    const dest = `/topic/room/${roomId}`;
    if (stompService.isConnected) {
      try {
        stompService.subscribe(dest, (rawMsg: any) => {
          if (rawMsg && !rawMsg.roomId) rawMsg.roomId = roomId;
          decideNotificationAction(rawMsg);
          set((state) => ({
            messagesByRoom: {
              ...state.messagesByRoom,
              [roomId]: upsertMessage(state.messagesByRoom[roomId] || [], rawMsg),
            },
          }));
        });
        return;
      } catch (e) {
        // fallthrough
      }
    }
    set((s) => ({ pendingSubscriptions: Array.from(new Set([...s.pendingSubscriptions, dest])) }));
    get().initStompClient();
  },

  unsubscribeFromRoom: (roomId: string) => {
    const dest = `/topic/room/${roomId}`;
    if (stompService.isConnected) {
      stompService.unsubscribe(dest);
    } else {
      set((s) => ({ pendingSubscriptions: s.pendingSubscriptions.filter(d => d !== dest) }));
    }
  },

  initAiClient: () => {
    if (!pythonAiWsService.isConnected) {
      pythonAiWsService.connect((msg: any) => {
        const state = get();
        if (msg.type === 'chat_response_chunk') {
          const lastMsg = state.aiChatHistory[state.aiChatHistory.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
            lastMsg.content += msg.content || '';
            set({ aiChatHistory: [...state.aiChatHistory] });
          } else {
            set({
              aiChatHistory: [
                ...state.aiChatHistory,
                { id: Date.now().toString(), role: 'assistant', content: msg.content || '', isStreaming: true, roomId: msg.roomId || state.activeAiRoomId || '' },
              ],
              isAiInitialMessageSent: true,
            });
          }
        } else if (msg.type === 'chat_response_complete') {
          set({ isAiStreaming: false });
          const lastMsg = state.aiChatHistory[state.aiChatHistory.length - 1];
          if (lastMsg) lastMsg.isStreaming = false;
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
    } catch (error) {
      console.error('Failed to start private chat:', error);
      return null;
    }
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
    set({ activeAiRoomId: roomId, aiChatHistory: [], isAiInitialMessageSent: false, loadingByRoom: { ...get().loadingByRoom, [roomId]: true } });
    await get().loadMessages(roomId, 0, 10);
    const messages = get().messagesByRoom[roomId] || [];
    const sortedForAi = [...messages].reverse();
    const aiFormatMessages: AiMessage[] = sortedForAi.map((m) => ({
      id: m.id.chatMessageId, role: m.senderId ? 'user' : 'assistant', content: m.content || '', roomId: roomId,
    }));
    set({ aiChatHistory: aiFormatMessages, loadingByRoom: { ...get().loadingByRoom, [roomId]: false }, isAiInitialMessageSent: aiFormatMessages.length > 0 });
  },

  sendAiWelcomeMessage: () => {
    const { activeAiRoomId, aiWsConnected, isAiInitialMessageSent, aiChatHistory } = get();
    if (!activeAiRoomId || !aiWsConnected || isAiInitialMessageSent || !pythonAiWsService.isConnected) return;
    set({ isAiStreaming: true, isAiInitialMessageSent: true });
    pythonAiWsService.sendMessage({ type: 'chat_request', prompt: "INITIAL_WELCOME_MESSAGE", history: aiChatHistory.map(m => ({ role: m.role, content: m.content })), roomId: activeAiRoomId, messageType: 'TEXT', });
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
      set((currentState) => {
        const currentMsgs = currentState.messagesByRoom[roomId] || [];
        const updatedList = page === 0 ? newMessages : [...currentMsgs, ...newMessages];
        const uniqueMap = new Map();
        updatedList.forEach(item => { if (item?.id?.chatMessageId) uniqueMap.set(item.id.chatMessageId, item); });
        const uniqueList = Array.from(uniqueMap.values()) as Message[];
        uniqueList.sort((a, b) => parseDate(b.id.sentAt) - parseDate(a.id.sentAt));
        return {
          messagesByRoom: { ...currentState.messagesByRoom, [roomId]: uniqueList },
          pageByRoom: { ...currentState.pageByRoom, [roomId]: page },
          hasMoreByRoom: { ...currentState.hasMoreByRoom, [roomId]: page < totalPages - 1 },
          loadingByRoom: { ...currentState.loadingByRoom, [roomId]: false },
        };
      });
    } catch (e) {
      set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: false } }));
    }
  },

  sendMessage: (roomId, content, type, mediaUrl) => {
    const state = get();
    const room = state.rooms[roomId];
    const payload = { content, roomId, messageType: type, purpose: room?.purpose || RoomPurpose.GROUP_CHAT, mediaUrl: mediaUrl || null };
    const optimisticMsg = { id: { chatMessageId: `local-${Date.now()}`, sentAt: new Date().toISOString() }, senderId: useUserStore.getState().user?.userId, content, messageType: type, mediaUrl: mediaUrl || null, isLocal: true } as any;
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

  editMessage: async (roomId, messageId, newContent) => {
    await instance.put(`/api/v1/chat/messages/${messageId}`, { content: newContent });
  },

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
    set((state) => ({ aiChatHistory: [...state.aiChatHistory, { id: Date.now().toString(), role: 'user', content, roomId: activeAiRoomId }], isAiStreaming: true, isAiInitialMessageSent: true }));
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
  disconnectAi: () => { pythonAiWsService.disconnect(); set({ aiWsConnected: false, aiChatHistory: [], isAiInitialMessageSent: false, activeAiRoomId: null }); },
  disconnectAll: () => { get().disconnectStomp(); get().disconnectAi(); get().disconnectVideoSubtitles(); set({ activeBubbleRoomId: null, isBubbleOpen: false, currentVideoSubtitles: null }); },

  openBubble: (roomId) => set({ activeBubbleRoomId: roomId, isBubbleOpen: true }),
  closeBubble: () => set({ activeBubbleRoomId: null, isBubbleOpen: false }),
  minimizeBubble: () => set({ isBubbleOpen: false }),
}));