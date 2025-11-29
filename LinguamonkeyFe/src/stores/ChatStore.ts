import { create } from 'zustand';
import { stompService } from '../services/stompService';
import { pythonAiWsService } from '../services/pythonAiWsService';
import { VideoSubtitleService, DualSubtitle } from '../services/videoSubtitleService';
import instance from '../api/axiosClient';
import type { ChatMessage as Message, Room } from '../types/entity';
import type { AppApiResponse, PageResponse } from '../types/dto';
import { useUserStore } from "./UserStore";

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

  // Room Management
  rooms: { [roomId: string]: Room };
  aiRoomList: Room[];
  activeAiRoomId: string | null;

  // Message Management
  messagesByRoom: { [roomId: string]: Message[] };
  pageByRoom: { [roomId: string]: number };
  hasMoreByRoom: { [roomId: string]: boolean };
  loadingByRoom: { [roomId: string]: boolean };

  // AI Specific
  aiChatHistory: AiMessage[];
  isAiStreaming: boolean;
  isAiInitialMessageSent: boolean;

  // Subtitles
  videoSubtitleService: VideoSubtitleService | null;
  currentVideoSubtitles: DualSubtitle | null;

  // Bubble
  activeBubbleRoomId: string | null;
  isBubbleOpen: boolean;

  // Actions
  initStompClient: () => void;
  initAiClient: () => void;
  startPrivateChat: (targetUserId: string) => Promise<Room | null>;

  // AI Actions
  fetchAiRoomList: () => Promise<void>;
  startNewAiChat: () => Promise<void>;
  selectAiRoom: (roomId: string) => Promise<void>;
  sendAiPrompt: (content: string) => void;
  sendAiWelcomeMessage: () => void;

  // General Chat Actions
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
}

export const useChatStore = create<UseChatState>((set, get) => ({
  stompConnected: false,
  aiWsConnected: false,
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

  initStompClient: () => {
    // Sửa lỗi 6234: Dùng thuộc tính isConnected thay vì gọi hàm isConnected()
    if (!stompService.isConnected) {
      console.log('🚀 ChatStore: Initiating STOMP Connection...');
      stompService.connect(() => {
        set({ stompConnected: true });
        console.log('✅ ChatStore: STOMP Connected');
      });
    }
  },

  initAiClient: () => {
    // Sửa lỗi 6234: Dùng thuộc tính isConnected thay vì gọi hàm isConnected()
    if (!pythonAiWsService.isConnected) {
      console.log('🚀 ChatStore: Initiating AI WS Connection...');

      const onMessageCallback = (msg: any) => {
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
                {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: msg.content || '',
                  isStreaming: true,
                  roomId: msg.roomId || state.activeAiRoomId || '',
                },
              ],
              isAiInitialMessageSent: true,
            });
          }
        } else if (msg.type === 'chat_response_complete') {
          set({ isAiStreaming: false });
          const lastMsg = state.aiChatHistory[state.aiChatHistory.length - 1];
          if (lastMsg) lastMsg.isStreaming = false;
        }
      };

      const onConnectedCallback = () => {
        console.log('✅ ChatStore: AI WS Connected');
        set({ aiWsConnected: true });
      };

      // Sửa lỗi 2554: Truyền onMessageCallback và onConnectedCallback
      pythonAiWsService.connect(onMessageCallback, onConnectedCallback);
    }
  },

  startPrivateChat: async (targetUserId: string) => {
    try {
      const res = await instance.post<AppApiResponse<Room>>(
        `/api/v1/rooms/private`,
        {},
        { params: { targetUserId } }
      );
      const room = res.data.result;
      if (room?.roomId) {
        set((state) => ({ rooms: { ...state.rooms, [room.roomId]: room } }));
        stompService.subscribe(`/topic/room/${room.roomId}`, (rawMsg) => {
          const msg = rawMsg as Message;
          set((state) => ({
            messagesByRoom: {
              ...state.messagesByRoom,
              [room.roomId]: upsertMessage(state.messagesByRoom[room.roomId] || [], msg),
            },
          }));
        });
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
      const res = await instance.get<AppApiResponse<Room[]>>(`/api/v1/rooms/ai-history`, {
        params: { userId }
      });
      if (res.data.result) {
        set({ aiRoomList: res.data.result });
      }
    } catch (e) {
      console.error('Failed to fetch AI room list', e);
    }
  },

  startNewAiChat: async () => {
    const userId = useUserStore.getState().user?.userId;
    if (!userId) throw new Error('User ID is missing');
    try {
      const res = await instance.get<AppApiResponse<Room>>(`/api/v1/rooms/ai-chat-room`, {
        params: { userId, newSession: true }
      });
      const room = res.data.result;
      if (room && room.roomId) {
        await get().selectAiRoom(room.roomId);
        await get().fetchAiRoomList();
      }
    } catch (e) {
      console.error('Failed to start new AI chat:', e);
      throw e;
    }
  },

  selectAiRoom: async (roomId: string) => {
    set({
      activeAiRoomId: roomId,
      aiChatHistory: [],
      isAiInitialMessageSent: false,
      loadingByRoom: { ...get().loadingByRoom, [roomId]: true }
    });

    await get().loadMessages(roomId, 0, 10);

    const messages = get().messagesByRoom[roomId] || [];
    const sortedForAi = [...messages].reverse();

    const aiFormatMessages: AiMessage[] = sortedForAi.map((m) => ({
      id: m.id.chatMessageId,
      role: m.senderId ? 'user' : 'assistant',
      content: m.content || '',
      roomId: roomId,
    }));

    set({
      aiChatHistory: aiFormatMessages,
      loadingByRoom: { ...get().loadingByRoom, [roomId]: false },
      isAiInitialMessageSent: aiFormatMessages.length > 0
    });
  },

  sendAiWelcomeMessage: () => {
    const { activeAiRoomId, aiWsConnected, isAiInitialMessageSent, aiChatHistory } = get();
    // Sửa lỗi 6234: Dùng thuộc tính isConnected thay vì gọi hàm isConnected()
    if (!activeAiRoomId || !aiWsConnected || isAiInitialMessageSent || !pythonAiWsService.isConnected) return;
    const WELCOME_PROMPT = "INITIAL_WELCOME_MESSAGE";
    set({ isAiStreaming: true, isAiInitialMessageSent: true });

    const historyForAi = aiChatHistory.map((m) => ({ role: m.role, content: m.content }));
    pythonAiWsService.sendMessage({
      type: 'chat_request',
      prompt: WELCOME_PROMPT,
      history: historyForAi,
      roomId: activeAiRoomId,
      messageType: 'TEXT',
    });
  },

  loadMessages: async (roomId: string, page = 0, size = 10) => {
    const state = get();
    if (state.loadingByRoom[roomId] && page !== 0) return;

    set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: true } }));

    try {
      const res = await instance.get<AppApiResponse<PageResponse<Message>>>(
        `/api/v1/chat/room/${roomId}/messages`,
        { params: { page, size, sort: 'id.sentAt,desc' } }
      );

      const newMessages = res.data.result?.content || [];
      const totalPages = res.data.result?.totalPages || 0;

      set((currentState) => {
        const currentMsgs = currentState.messagesByRoom[roomId] || [];
        const updatedList = page === 0
          ? newMessages
          : [...currentMsgs, ...newMessages];

        const uniqueList = Array.from(new Map(updatedList.map(item => [item.id.chatMessageId, item])).values());
        uniqueList.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

        let updatedAiHistory = currentState.aiChatHistory;
        if (roomId === currentState.activeAiRoomId) {
          const sortedForAi = [...uniqueList].reverse();
          updatedAiHistory = sortedForAi.map(m => ({
            id: m.id.chatMessageId,
            role: m.senderId ? 'user' : 'assistant',
            content: m.content || '',
            roomId: roomId,
          }));
        }

        return {
          messagesByRoom: { ...currentState.messagesByRoom, [roomId]: uniqueList },
          pageByRoom: { ...currentState.pageByRoom, [roomId]: page },
          hasMoreByRoom: { ...currentState.hasMoreByRoom, [roomId]: page < totalPages - 1 },
          loadingByRoom: { ...currentState.loadingByRoom, [roomId]: false },
          aiChatHistory: updatedAiHistory
        };
      });
    } catch (e) {
      console.error('Load messages failed:', e);
      set((s) => ({ loadingByRoom: { ...s.loadingByRoom, [roomId]: false } }));
    }
  },

  sendMessage: (roomId: string, content: string, type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO', mediaUrl?: string) => {
    if (!stompService.isConnected) return;
    const payload = {
      content: content,
      roomId: roomId,
      messageType: type,
      purpose: 'PRIVATE_CHAT',
      mediaUrl: mediaUrl || null,
    };
    stompService.publish(`/app/chat/room/${roomId}`, payload);
  },

  editMessage: async (roomId: string, messageId: string, newContent: string) => {
    try {
      await instance.put<AppApiResponse<Message>>(`/api/v1/chat/messages/${messageId}`, {
        content: newContent
      });
    } catch (error) {
      console.error("Edit message failed", error);
      throw error;
    }
  },

  deleteMessage: async (roomId: string, messageId: string) => {
    try {
      await instance.delete<AppApiResponse<void>>(`/api/v1/chat/messages/${messageId}`);
      set(state => ({
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: state.messagesByRoom[roomId]?.filter(m => m.id.chatMessageId !== messageId) || []
        }
      }));
    } catch (error) {
      console.error("Delete message failed", error);
      throw error;
    }
  },

  markMessageAsRead: (roomId: string, messageId: string) => {
    if (!stompService.isConnected) return;
    stompService.publish(`/app/chat/message/${messageId}/read`, {});
  },

  sendAiPrompt: (content: string) => {
    const { activeAiRoomId, aiWsConnected } = get();
    if (!activeAiRoomId || !aiWsConnected) return;

    const optimisticMsg: AiMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      roomId: activeAiRoomId,
    };

    set((state) => ({
      aiChatHistory: [...state.aiChatHistory, optimisticMsg],
      isAiStreaming: true,
      isAiInitialMessageSent: true,
    }));

    const history = get().aiChatHistory.map((m) => ({ role: m.role, content: m.content }));
    pythonAiWsService.sendMessage({
      type: 'chat_request',
      prompt: content,
      history: history.slice(0, -1),
      roomId: activeAiRoomId,
      messageType: 'TEXT',
    });
  },

  connectVideoSubtitles: (roomId, targetLang) => {
    const service = new VideoSubtitleService();
    set({ videoSubtitleService: service });
    service.connect(roomId, targetLang, (sub) => {
      set({ currentVideoSubtitles: sub });
    });
  },

  disconnectVideoSubtitles: () => {
    get().videoSubtitleService?.disconnect();
    set({ videoSubtitleService: null, currentVideoSubtitles: null });
  },

  disconnectStomp: () => {
    console.log('🛑 ChatStore: Disconnecting STOMP...');
    stompService.disconnect();
    set({ stompConnected: false });
  },

  disconnectAi: () => {
    console.log('🛑 ChatStore: Disconnecting AI WS...');
    pythonAiWsService.disconnect();
    set({
      aiWsConnected: false,
      aiChatHistory: [],
      isAiInitialMessageSent: false,
      activeAiRoomId: null,
    });
  },

  disconnectAll: () => {
    console.log('🛑 ChatStore: Disconnecting ALL Services...');
    get().disconnectStomp();
    get().disconnectAi();
    get().disconnectVideoSubtitles();
    set({
      activeBubbleRoomId: null,
      isBubbleOpen: false,
      currentVideoSubtitles: null,
      videoSubtitleService: null
    });
  },

  openBubble: (roomId: string) => set({ activeBubbleRoomId: roomId, isBubbleOpen: true }),
  closeBubble: () => set({ activeBubbleRoomId: null, isBubbleOpen: false }),
  minimizeBubble: () => set({ isBubbleOpen: false }),
}));

function upsertMessage(list: Message[], msg: Message): Message[] {
  if (msg.isDeleted) {
    return list.filter(m => m.id.chatMessageId !== msg.id.chatMessageId);
  }

  const exists = list.find((m) => m.id.chatMessageId === msg.id.chatMessageId);
  if (exists) {
    return list.map((m) => (m.id.chatMessageId === msg.id.chatMessageId ? msg : m));
  }
  const newList = [msg, ...list];
  return newList.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}