import { create } from 'zustand';
import { stompService } from '../services/stompService';
import { VideoSubtitleService, DualSubtitle } from '../services/videoSubtitleService';
import instance from '../api/axiosClient';
import type { ChatMessage as Message, Room } from '../types/entity';
import type { AppApiResponse, PageResponse } from '../types/dto';
import { useUserStore } from "./UserStore";
import { RoomPurpose } from "../types/enums";
import { playInAppSound } from '../utils/soundUtils';
import { useAppStore } from './appStore';

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

type TranslationEvent = {
  messageId: string;
  targetLang: string;
  translatedText: string;
};

interface UseChatState {
  stompConnected: boolean;
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
  totalOnlineUsers: number;
  videoSubtitleService: VideoSubtitleService | null;
  currentVideoSubtitles: DualSubtitle | null;
  activeBubbleRoomId: string | null;
  isBubbleOpen: boolean;
  currentAppScreen: string | null;
  appIsActive: boolean;
  currentViewedRoomId: string | null;
  incomingCallRequest: IncomingCall | null;

  initStompClient: () => void;
  disconnectStompClient: () => void;
  subscribeToRoom: (roomId: string) => void;
  unsubscribeFromRoom: (roomId: string) => void;
  startPrivateChat: (targetUserId: string) => Promise<Room | null>;
  fetchAiRoomList: () => Promise<void>;
  startNewAiChat: () => Promise<void>;
  selectAiRoom: (roomId: string) => Promise<void>;
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
  updateMessageTranslation: (roomId: string, event: TranslationEvent) => void;
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

const normalizeMessage = (msg: any): Message => {
  if (!msg) {
    return {
      id: { chatMessageId: 'unknown-' + Math.random(), sentAt: new Date().toISOString() },
    } as Message;
  }
  const mapTranslationFields = (source: any) => ({
    translatedText: source.translatedText || source.translated_text || null,
    translatedLang: source.translatedLang || source.translated_lang || null,
  });

  let sentAt = new Date().toISOString();
  if (msg?.id?.sentAt) {
    sentAt = new Date(parseDate(msg.id.sentAt)).toISOString();
  } else if (msg?.sentAt) {
    sentAt = new Date(parseDate(msg.sentAt)).toISOString();
  }

  let chatMessageId = 'unknown-' + Math.random();
  if (msg?.id?.chatMessageId) chatMessageId = msg.id.chatMessageId;
  else if (msg?.chatMessageId) chatMessageId = msg.chatMessageId;

  const baseMsg = {
    ...msg,
    id: { chatMessageId, sentAt },
    senderId: msg.senderId || msg?.id?.senderId,
    ...mapTranslationFields(msg)
  };

  return baseMsg as Message;
};

// Merge logic to avoid overwriting existing profile or translation data if new data is partial
function upsertMessage(list: Message[], rawMsg: any): Message[] {
  if (!rawMsg) return list;
  const msg = normalizeMessage(rawMsg);
  const currentUserId = useUserStore.getState().user?.userId;

  if (msg.isDeleted) return list.filter(m => m.id.chatMessageId !== msg.id.chatMessageId);

  let workingList = [...list];

  // Remove temporary local message if server response arrives
  if (msg.senderId === currentUserId && !msg.isLocal) {
    workingList = workingList.filter(m => !(m.isLocal && m.content === msg.content));
  }

  const existingIndex = workingList.findIndex((m) => m.id.chatMessageId === msg.id.chatMessageId);

  if (existingIndex !== -1) {
    const existingMsg = workingList[existingIndex];
    // Keep existing translation if new message doesn't have it (unless explicitly cleared)
    const mergedMsg = {
      ...msg,
      senderProfile: msg.senderProfile || existingMsg.senderProfile,
      translatedText: msg.translatedText || existingMsg.translatedText,
      translatedLang: msg.translatedLang || existingMsg.translatedLang
    };
    workingList[existingIndex] = mergedMsg;
  } else {
    workingList.push(msg);
  }

  return workingList.sort((a, b) => {
    const timeA = parseDate(a.id?.sentAt);
    const timeB = parseDate(b.id?.sentAt);
    return timeA - timeB;
  });
}

function extractRoomIdFromTopic(topic: string) {
  const parts = topic.split('/');
  if (topic.endsWith('/translations')) {
    return parts[parts.length - 2];
  }
  return parts[parts.length - 1];
}

export const useChatStore = create<UseChatState>((set, get) => ({
  stompConnected: false,
  pendingSubscriptions: [],
  pendingPublishes: [],
  rooms: {},
  userStatuses: {},
  aiRoomList: [],
  messagesByRoom: {},
  pageByRoom: {},
  hasMoreByRoom: {},
  loadingByRoom: {},
  activeAiRoomId: null,
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

  updateMessageTranslation: (roomId, event) => {
    set(state => {
      const currentMessages = state.messagesByRoom[roomId] || [];
      const updatedMessages = currentMessages.map(msg => {
        // Match by Message ID and inject translation
        if (msg.id.chatMessageId === event.messageId) {
          return {
            ...msg,
            translatedText: event.translatedText,
            translatedLang: event.targetLang
          };
        }
        return msg;
      });

      // Ensure immutability for re-render
      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: updatedMessages
        }
      };
    });
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
          if (roomId && senderId !== currentUserId) {
            if (state.currentViewedRoomId !== roomId && !(state.isBubbleOpen && state.activeBubbleRoomId === roomId)) {
              if (state.appIsActive) { await playInAppSound(); state.openBubble(roomId); }
            }
            set((s) => ({ messagesByRoom: { ...s.messagesByRoom, [roomId]: upsertMessage(s.messagesByRoom[roomId] || [], rawMsg) } }));
          }
        });
      } catch (e) { console.warn("Notif sub error", e); }

      try {
        stompService.subscribe('/user/queue/messages', (rawMsg: any) => {
          const roomId = rawMsg?.roomId || rawMsg?.room_id;
          if (roomId) {
            set((state) => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: upsertMessage(state.messagesByRoom[roomId] || [], rawMsg) } }));
          }
        });
      } catch (e) { console.warn("Queue message sub error", e); }

      try {
        stompService.subscribe('/topic/public/user-status', (msg: any) => {
          if (msg.userId) { get().updateUserStatus(msg.userId, msg.status === 'ONLINE', msg.timestamp); }
        });
      } catch (e) { }

      try {
        stompService.subscribe('/topic/public/online-count', (count: any) => {
          if (typeof count === 'number') {
            set({ totalOnlineUsers: count });
          }
        });
      } catch (e) { }

      const pendingSubs = get().pendingSubscriptions || [];
      pendingSubs.forEach(dest => {
        try {
          stompService.subscribe(dest, (rawMsg: any) => {
            const roomId = extractRoomIdFromTopic(dest);
            if (dest.includes('/status')) {
              if (rawMsg.userId) { get().updateUserStatus(rawMsg.userId, rawMsg.status === 'ONLINE', rawMsg.timestamp); }
              return;
            }
            if (dest.includes('/translations')) {
              get().updateMessageTranslation(roomId, rawMsg);
              return;
            }
            set((state) => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: upsertMessage(state.messagesByRoom[roomId] || [], rawMsg) } }));
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
    const transDest = `/topic/room/${roomId}/translations`;

    if (stompService.isConnected) {
      stompService.subscribe(chatDest, (rawMsg: any) => {
        if (rawMsg && rawMsg.type === 'VIDEO_CALL') { return; }
        if (rawMsg && !rawMsg.roomId) rawMsg.roomId = roomId;
        set((state) => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: upsertMessage(state.messagesByRoom[roomId] || [], rawMsg) } }));
      });

      stompService.subscribe(statusDest, (msg: any) => {
        if (msg.userId) {
          get().updateUserStatus(msg.userId, msg.status === 'ONLINE', new Date().toISOString());
        }
      });

      stompService.subscribe(transDest, (evt: TranslationEvent) => {
        get().updateMessageTranslation(roomId, evt);
      });
      return;
    }

    set((s) => ({ pendingSubscriptions: Array.from(new Set([...s.pendingSubscriptions, chatDest, statusDest, transDest])) }));
    get().initStompClient();
  },

  unsubscribeFromRoom: (roomId: string) => {
    const chatDest = `/topic/room/${roomId}`;
    const statusDest = `/topic/room/${roomId}/status`;
    const transDest = `/topic/room/${roomId}/translations`;
    if (stompService.isConnected) {
      stompService.unsubscribe(chatDest);
      stompService.unsubscribe(statusDest);
      stompService.unsubscribe(transDest);
    }
    else {
      set((s) => ({ pendingSubscriptions: s.pendingSubscriptions.filter(d => d !== chatDest && d !== statusDest && d !== transDest) }));
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
      if (res.data.result) {
        const newRoomsMap = res.data.result.reduce((acc, room) => ({ ...acc, [room.roomId]: room }), {});
        set((state) => ({
          aiRoomList: res.data.result || [],
          rooms: { ...state.rooms, ...newRoomsMap }
        }));
      }
    } catch (e) { console.error(e); }
  },

  startNewAiChat: async () => {
    const userId = useUserStore.getState().user?.userId;
    if (!userId) return;
    const res = await instance.get<AppApiResponse<Room>>(`/api/v1/rooms/ai-chat-room`, { params: { userId } });
    const room = res.data.result;
    if (room?.roomId) {
      set((state) => ({ rooms: { ...state.rooms, [room.roomId]: room } }));
      await get().selectAiRoom(room.roomId);
      await get().fetchAiRoomList();
    }
  },

  selectAiRoom: async (roomId) => {
    set({ activeAiRoomId: roomId, loadingByRoom: { ...get().loadingByRoom, [roomId]: true } });
    get().subscribeToRoom(roomId);
    await get().loadMessages(roomId, 0, 10);
  },

  loadMessages: async (roomId, page = 0, size = 10) => {
    const state = get();
    if (state.loadingByRoom[roomId] && page !== 0) return;
    set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: true } }));

    try {
      const res = await instance.get<AppApiResponse<PageResponse<any>>>(`/api/v1/chat/room/${roomId}/messages`, { params: { page, size, sort: 'id.sentAt,desc' } });
      const rawMessages = res.data.result?.content || [];
      const totalPages = res.data.result?.totalPages || 0;

      const newMessages = rawMessages.map(normalizeMessage);
      newMessages.reverse();

      set((currentState) => {
        const currentMsgs = currentState.messagesByRoom[roomId] || [];
        let updatedList: Message[] = [];
        if (page === 0) {
          const locals = currentMsgs.filter(m => m.isLocal);
          updatedList = [...newMessages, ...locals];
        } else {
          updatedList = [...newMessages, ...currentMsgs];
        }

        const uniqueMap = new Map();
        updatedList.forEach(item => { if (item?.id?.chatMessageId) uniqueMap.set(item.id.chatMessageId, item); });
        const uniqueList = Array.from(uniqueMap.values()) as Message[];

        uniqueList.sort((a, b) => {
          const timeA = parseDate(a.id.sentAt);
          const timeB = parseDate(b.id.sentAt);
          return timeA - timeB;
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
      newMessages.reverse();

      set((currentState) => ({
        messagesByRoom: { ...currentState.messagesByRoom, [roomId]: newMessages },
        loadingByRoom: { ...currentState.loadingByRoom, [roomId]: false },
        hasMoreByRoom: { ...currentState.hasMoreByRoom, [roomId]: false }
      }));
    } catch (e) { set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: false } })); }
  },

  sendMessage: (roomId, content, type, mediaUrl) => {
    const state = get();
    const { chatSettings } = useAppStore.getState();
    const room = state.rooms[roomId];

    const payload = {
      content,
      roomId,
      messageType: type,
      purpose: room?.purpose || RoomPurpose.AI_CHAT,
      mediaUrl: mediaUrl || null,
      isRoomAutoTranslate: chatSettings?.autoTranslate || false
    };

    const optimisticMsg = { id: { chatMessageId: `local-${Date.now()}`, sentAt: new Date().toISOString() }, senderId: useUserStore.getState().user?.userId, content, messageType: type, mediaUrl: mediaUrl || null, isLocal: true, translatedText: null, translatedLang: null } as any;

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

  connectVideoSubtitles: (roomId, targetLang) => {
    const service = new VideoSubtitleService();
    set({ videoSubtitleService: service });
    service.connect(roomId, targetLang, (sub) => { set({ currentVideoSubtitles: sub }); });
  },
  disconnectVideoSubtitles: () => { get().videoSubtitleService?.disconnect(); set({ videoSubtitleService: null, currentVideoSubtitles: null }); },
  disconnectStomp: () => { stompService.disconnect(); set({ stompConnected: false, pendingSubscriptions: [], pendingPublishes: [] }); },
  disconnectAi: () => { set({ activeAiRoomId: null }); },
  disconnectAll: () => { get().disconnectStomp(); get().disconnectAi(); get().disconnectVideoSubtitles(); set({ activeBubbleRoomId: null, isBubbleOpen: false, currentVideoSubtitles: null }); },
  openBubble: (roomId) => set({ activeBubbleRoomId: roomId, isBubbleOpen: true }),
  closeBubble: () => set({ activeBubbleRoomId: null, isBubbleOpen: false }),
  minimizeBubble: () => set({ isBubbleOpen: false }),
  acceptIncomingCall: () => set({ incomingCallRequest: null }),
  rejectIncomingCall: () => set({ incomingCallRequest: null }),
}));