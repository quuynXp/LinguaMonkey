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
  initChatService: () => void;
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

  connectVideoSubtitles: (roomId: string, targetLang: string) => void;
  disconnectVideoSubtitles: () => void;
  disconnect: () => void;

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

  initChatService: () => {
    if (!stompService.isConnected) {
      console.log('🚀 ChatStore: Initiating STOMP Connection...');
      stompService.connect(() => {
        set({ stompConnected: true });
        console.log('✅ ChatStore: STOMP Connected');
      });
    }

    if (!pythonAiWsService.isConnected) {
      console.log('🚀 ChatStore: Initiating AI WS Connection...');
      pythonAiWsService.connect((msg) => {
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
      });
      set({ aiWsConnected: true });
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

    // Load initial 10 messages (Page 0)
    await get().loadMessages(roomId, 0, 10);

    // Convert loaded messages to AI Format
    const messages = get().messagesByRoom[roomId] || [];
    // messages are [Newest ... Oldest]. For AI History display (Bottom-up), we need [Oldest ... Newest]
    // BUT, the View handles this based on display logic. 
    // To sync with 'aiChatHistory' state used by streaming:
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
    if (!activeAiRoomId || !aiWsConnected || isAiInitialMessageSent) return;
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
        { params: { page, size, sort: 'createdAt,desc' } }
      );

      const newMessages = res.data.result?.content || [];
      const totalPages = res.data.result?.totalPages || 0;

      set((currentState) => {
        const currentMsgs = currentState.messagesByRoom[roomId] || [];

        // Since backend sorts DESC (Newest First), newMessages are [New1, New2, ...].
        // If Page 0, replace. If Page > 0, append to the end of existing list (which is Newest -> Oldest).
        const updatedList = page === 0
          ? newMessages
          : [...currentMsgs, ...newMessages];

        const uniqueList = Array.from(new Map(updatedList.map(item => [item.id.chatMessageId, item])).values());

        // Sort Newest -> Oldest (Critical for Inverted List)
        uniqueList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Also update aiChatHistory if this is the active room
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

  disconnect: () => {
    console.log('🛑 ChatStore: Disconnecting Services...');
    stompService.disconnect();
    pythonAiWsService.disconnect();
    get().disconnectVideoSubtitles();
    set({
      stompConnected: false,
      aiWsConnected: false,
      aiChatHistory: [],
      isAiInitialMessageSent: false,
      videoSubtitleService: null,
      currentVideoSubtitles: null,
      activeBubbleRoomId: null,
      isBubbleOpen: false,
      activeAiRoomId: null,
    });
  },

  openBubble: (roomId: string) => set({ activeBubbleRoomId: roomId, isBubbleOpen: true }),
  closeBubble: () => set({ activeBubbleRoomId: null, isBubbleOpen: false }),
  minimizeBubble: () => set({ isBubbleOpen: false }),
}));

function upsertMessage(list: Message[], msg: Message): Message[] {
  const exists = list.find((m) => m.id.chatMessageId === msg.id.chatMessageId);
  if (exists) {
    return list.map((m) => (m.id.chatMessageId === msg.id.chatMessageId ? msg : m));
  }
  const newList = [msg, ...list];
  return newList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}