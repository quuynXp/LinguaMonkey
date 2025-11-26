// import { create } from 'zustand';
// import { stompService } from '../services/stompService';
// import { pythonAiWsService, AiMessageCallback } from '../services/pythonAiWsService';
// import { VideoSubtitleService, DualSubtitle } from '../services/videoSubtitleService';
// import instance from '../api/axiosClient';
// import type { ChatMessage as Message, Room } from '../types/entity';
// import type { AppApiResponse, PageResponse } from '../types/dto';
// import { useUserStore } from "./UserStore";

// // Local types for UI
// type AiMessage = {
//   id: string;
//   role: 'user' | 'assistant';
//   content: string;
//   isStreaming?: boolean;
//   roomId: string;
// };

// interface UseChatState {
//   // Connection State
//   stompConnected: boolean;
//   aiWsConnected: boolean;

//   // Chat State
//   rooms: { [roomId: string]: Room };
//   messagesByRoom: { [roomId: string]: Message[] };

//   // AI State
//   aiChatHistory: AiMessage[];
//   isAiStreaming: boolean;
//   activeAiRoomId: string | null;
//   isAiInitialMessageSent: boolean; // Trạng thái mới: Đã gửi tin nhắn chào ban đầu chưa

//   // Video State
//   videoSubtitleService: VideoSubtitleService | null;
//   currentVideoSubtitles: DualSubtitle | null;

//   // Actions
//   initChatService: () => void;
//   startPrivateChat: (targetUserId: string) => Promise<Room | null>;
//   startAiChat: () => Promise<void>;
//   loadMessages: (roomId: string) => Promise<void>;
//   sendMessage: (roomId: string, content: string, type: 'TEXT' | 'IMAGE') => void;
//   sendAiPrompt: (content: string) => void;
//   sendAiWelcomeMessage: () => void;
//   connectVideoSubtitles: (roomId: string, targetLang: string) => void;
//   disconnectVideoSubtitles: () => void;
//   disconnect: () => void;
// }

// export const useChatStore = create<UseChatState>((set, get) => ({
//   stompConnected: false,
//   aiWsConnected: false,
//   rooms: {},
//   messagesByRoom: {},
//   aiChatHistory: [],
//   isAiStreaming: false,
//   activeAiRoomId: null,
//   isAiInitialMessageSent: false,

//   // FIX: Khởi tạo các thuộc tính bị thiếu
//   videoSubtitleService: null,
//   currentVideoSubtitles: null,

//   initChatService: () => {
//     // 1. Connect STOMP (Java backend)
//     if (!stompService.isConnected) {
//       stompService.connect(() => {
//         set({ stompConnected: true });
//         console.log('✅ ChatStore: STOMP Connected');
//       });
//     }

//     // 2. Connect Python AI WS
//     if (!pythonAiWsService.isConnected) {
//       pythonAiWsService.connect((msg) => {
//         const state = get();

//         if (msg.type === 'chat_response_chunk') {
//           const lastMsg = state.aiChatHistory[state.aiChatHistory.length - 1];
//           if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
//             lastMsg.content += msg.content || '';
//             set({ aiChatHistory: [...state.aiChatHistory] });
//           } else {
//             set({
//               aiChatHistory: [
//                 ...state.aiChatHistory,
//                 {
//                   id: Date.now().toString(),
//                   role: 'assistant',
//                   content: msg.content || '',
//                   isStreaming: true,
//                   roomId: msg.roomId || state.activeAiRoomId || '',
//                 },
//               ],
//               isAiInitialMessageSent: true,
//             });
//           }
//         } else if (msg.type === 'chat_response_complete') {
//           set({ isAiStreaming: false });
//           const lastMsg = state.aiChatHistory[state.aiChatHistory.length - 1];
//           if (lastMsg) lastMsg.isStreaming = false;
//         }
//       });
//       set({ aiWsConnected: true });
//     }
//   },

//   startPrivateChat: async (targetUserId: string) => {
//     try {
//       const res = await instance.post<AppApiResponse<Room>>(
//         `/api/v1/rooms/private`,
//         {},
//         { params: { targetUserId } }
//       );
//       const room = res.data.result;

//       if (room?.roomId) {
//         set((state) => ({ rooms: { ...state.rooms, [room.roomId]: room } }));

//         // Subscribe to room topic
//         stompService.subscribe(`/topic/room/${room.roomId}`, (rawMsg) => {
//           const msg = rawMsg as Message;
//           set((state) => ({
//             messagesByRoom: {
//               ...state.messagesByRoom,
//               [room.roomId]: upsertMessage(state.messagesByRoom[room.roomId] || [], msg),
//             },
//           }));
//         });

//         return room;
//       }
//       return null;
//     } catch (error) {
//       console.error('Failed to start private chat:', error);
//       return null;
//     }
//   },

//   startAiChat: async () => {
//     const userId = useUserStore.getState().user?.userId;
//     if (!userId) {
//       console.error('Failed to start AI chat: User ID is missing.');
//       throw new Error('User ID is missing for AI chat initialization.');
//     }

//     try {
//       const res = await instance.get<AppApiResponse<Room>>(`/api/v1/rooms/ai-chat-room`, {
//         params: { userId }
//       });
//       const room = res.data.result;

//       if (room && room.roomId) {
//         // Đảm bảo cờ isAiInitialMessageSent được reset khi vào chat
//         set({ activeAiRoomId: room.roomId, isAiInitialMessageSent: false });

//         await get().loadMessages(room.roomId);

//         const dbMessages = get().messagesByRoom[room.roomId] || [];
//         const aiFormatMessages: AiMessage[] = dbMessages.map((m) => ({
//           id: m.id.chatMessageId,
//           role: m.senderId ? 'user' : 'assistant',
//           content: m.content || '',
//           roomId: room.roomId,
//         }));

//         const validAiFormatMessages = aiFormatMessages.filter(m => m.content.trim() !== '');

//         set({ aiChatHistory: validAiFormatMessages });

//       } else {
//         throw new Error("AI Room API returned missing room ID.");
//       }
//     } catch (e) {
//       console.error('Failed to start AI chat:', e);
//       throw e;
//     }
//   },

//   // HÀNH ĐỘNG GỬI TIN NHẮN CHÀO ĐẦU TIÊN
//   sendAiWelcomeMessage: () => {
//     const { activeAiRoomId, aiWsConnected, isAiInitialMessageSent, aiChatHistory } = get();

//     if (!activeAiRoomId || !aiWsConnected || isAiInitialMessageSent) {
//       console.log('Skipping AI welcome message: Room not ready, WS not connected, or message already sent.');
//       return;
//     }

//     // Prompt đặc biệt
//     const WELCOME_PROMPT = "INITIAL_WELCOME_MESSAGE";

//     set({
//       isAiStreaming: true,
//       // Đánh dấu đã gửi ngay lập tức để ngăn chặn việc gọi lại
//       isAiInitialMessageSent: true,
//     });

//     // Gửi prompt đặc biệt tới Python service. Python service sẽ nhận diện và tạo tin chào.
//     // Quan trọng: Gửi cả lịch sử trò chuyện (aiChatHistory) để AI có thể cá nhân hóa lời chào.
//     const historyForAi = aiChatHistory.map((m) => ({ role: m.role, content: m.content }));

//     pythonAiWsService.sendMessage({
//       type: 'chat_request',
//       prompt: WELCOME_PROMPT,
//       history: historyForAi,
//       roomId: activeAiRoomId,
//       messageType: 'TEXT',
//     });
//   },

//   loadMessages: async (roomId: string) => {
//     try {
//       const res = await instance.get<AppApiResponse<PageResponse<Message>>>(
//         `/api/v1/chat/room/${roomId}/messages`
//       );

//       const messages = (res.data.result?.content || []).reverse();

//       set((state) => ({
//         messagesByRoom: { ...state.messagesByRoom, [roomId]: messages },
//       }));
//     } catch (e) {
//       console.error('Load messages failed:', e);
//     }
//   },

//   sendMessage: (roomId: string, content: string, type: 'TEXT' | 'IMAGE') => {
//     if (!stompService.isConnected) {
//       console.warn('STOMP not connected');
//       return;
//     }

//     const payload = {
//       content: content,
//       roomId: roomId,
//       messageType: type,
//       purpose: 'PRIVATE_CHAT',
//     };

//     stompService.publish(`/app/chat/room/${roomId}`, payload);
//   },

//   sendAiPrompt: (content: string) => {
//     const { activeAiRoomId, aiWsConnected } = get();
//     if (!activeAiRoomId || !aiWsConnected) {
//       console.error('AI not ready');
//       return;
//     }

//     set((state) => ({
//       aiChatHistory: [
//         ...state.aiChatHistory,
//         {
//           id: Date.now().toString(),
//           role: 'user',
//           content: content,
//           roomId: activeAiRoomId,
//         },
//       ],
//       isAiStreaming: true,
//       isAiInitialMessageSent: true,
//     }));

//     const history = get().aiChatHistory.map((m) => ({ role: m.role, content: m.content }));

//     pythonAiWsService.sendMessage({
//       type: 'chat_request',
//       prompt: content,
//       history: history.slice(0, -1),
//       roomId: activeAiRoomId,
//       messageType: 'TEXT',
//     });
//   },

//   connectVideoSubtitles: (roomId, targetLang) => {
//     const service = new VideoSubtitleService();
//     set({ videoSubtitleService: service });
//     service.connect(roomId, targetLang, (sub) => {
//       set({ currentVideoSubtitles: sub });
//     });
//   },

//   disconnectVideoSubtitles: () => {
//     get().videoSubtitleService?.disconnect();
//     set({ videoSubtitleService: null, currentVideoSubtitles: null });
//   },

//   disconnect: () => {
//     stompService.disconnect?.();
//     pythonAiWsService.disconnect();
//     get().disconnectVideoSubtitles();
//     set({
//       stompConnected: false,
//       aiWsConnected: false,
//       rooms: {},
//       messagesByRoom: {},
//       aiChatHistory: [],
//       isAiInitialMessageSent: false,
//       videoSubtitleService: null,
//       currentVideoSubtitles: null,
//     });
//   },
// }));

// // Helper function
// function upsertMessage(list: Message[], msg: Message): Message[] {
//   const exists = list.find((m) => m.id.chatMessageId === msg.id.chatMessageId);
//   if (exists) {
//     return list.map((m) => (m.id.chatMessageId === msg.id.chatMessageId ? msg : m));
//   }
//   return [...list, msg];
// }

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
  rooms: { [roomId: string]: Room };
  messagesByRoom: { [roomId: string]: Message[] };
  aiChatHistory: AiMessage[];
  isAiStreaming: boolean;
  activeAiRoomId: string | null;
  isAiInitialMessageSent: boolean;
  videoSubtitleService: VideoSubtitleService | null;
  currentVideoSubtitles: DualSubtitle | null;

  // Bubble State
  activeBubbleRoomId: string | null;
  isBubbleOpen: boolean;

  initChatService: () => void;
  startPrivateChat: (targetUserId: string) => Promise<Room | null>;
  startAiChat: () => Promise<void>;
  loadMessages: (roomId: string) => Promise<void>;

  // Updated to support mediaUrl
  sendMessage: (roomId: string, content: string, type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO', mediaUrl?: string) => void;

  sendAiPrompt: (content: string) => void;
  sendAiWelcomeMessage: () => void;
  connectVideoSubtitles: (roomId: string, targetLang: string) => void;
  disconnectVideoSubtitles: () => void;
  disconnect: () => void;

  // Bubble Actions
  openBubble: (roomId: string) => void;
  closeBubble: () => void;
  minimizeBubble: () => void;
}

export const useChatStore = create<UseChatState>((set, get) => ({
  stompConnected: false,
  aiWsConnected: false,
  rooms: {},
  messagesByRoom: {},
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
      stompService.connect(() => {
        set({ stompConnected: true });
        console.log('✅ ChatStore: STOMP Connected');
      });
    }
    if (!pythonAiWsService.isConnected) {
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

  startAiChat: async () => {
    const userId = useUserStore.getState().user?.userId;
    if (!userId) throw new Error('User ID is missing for AI chat initialization.');
    try {
      const res = await instance.get<AppApiResponse<Room>>(`/api/v1/rooms/ai-chat-room`, {
        params: { userId }
      });
      const room = res.data.result;
      if (room && room.roomId) {
        set({ activeAiRoomId: room.roomId, isAiInitialMessageSent: false });
        await get().loadMessages(room.roomId);
        const dbMessages = get().messagesByRoom[room.roomId] || [];
        const aiFormatMessages: AiMessage[] = dbMessages.map((m) => ({
          id: m.id.chatMessageId,
          role: m.senderId ? 'user' : 'assistant',
          content: m.content || '',
          roomId: room.roomId,
        }));
        const validAiFormatMessages = aiFormatMessages.filter(m => m.content.trim() !== '');
        set({ aiChatHistory: validAiFormatMessages });
      }
    } catch (e) {
      console.error('Failed to start AI chat:', e);
      throw e;
    }
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

  loadMessages: async (roomId: string) => {
    try {
      const res = await instance.get<AppApiResponse<PageResponse<Message>>>(
        `/api/v1/chat/room/${roomId}/messages`
      );
      const messages = (res.data.result?.content || []).reverse();
      set((state) => ({
        messagesByRoom: { ...state.messagesByRoom, [roomId]: messages },
      }));
    } catch (e) {
      console.error('Load messages failed:', e);
    }
  },

  sendMessage: (roomId: string, content: string, type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO', mediaUrl?: string) => {
    if (!stompService.isConnected) {
      console.warn('STOMP not connected');
      return;
    }
    const payload = {
      content: content,
      roomId: roomId,
      messageType: type,
      purpose: 'PRIVATE_CHAT',
      mediaUrl: mediaUrl || null, // Updated payload
    };
    stompService.publish(`/app/chat/room/${roomId}`, payload);
  },

  sendAiPrompt: (content: string) => {
    const { activeAiRoomId, aiWsConnected } = get();
    if (!activeAiRoomId || !aiWsConnected) return;
    set((state) => ({
      aiChatHistory: [
        ...state.aiChatHistory,
        {
          id: Date.now().toString(),
          role: 'user',
          content: content,
          roomId: activeAiRoomId,
        },
      ],
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
    stompService.disconnect?.();
    pythonAiWsService.disconnect();
    get().disconnectVideoSubtitles();
    set({
      stompConnected: false,
      aiWsConnected: false,
      rooms: {},
      messagesByRoom: {},
      aiChatHistory: [],
      isAiInitialMessageSent: false,
      videoSubtitleService: null,
      currentVideoSubtitles: null,
      activeBubbleRoomId: null,
      isBubbleOpen: false,
    });
  },

  // Bubble Actions
  openBubble: (roomId: string) => set({ activeBubbleRoomId: roomId, isBubbleOpen: true }),
  closeBubble: () => set({ activeBubbleRoomId: null, isBubbleOpen: false }),
  minimizeBubble: () => set({ isBubbleOpen: false }), // Keeps roomId but hides window
}));

function upsertMessage(list: Message[], msg: Message): Message[] {
  const exists = list.find((m) => m.id.chatMessageId === msg.id.chatMessageId);
  if (exists) {
    return list.map((m) => (m.id.chatMessageId === msg.id.chatMessageId ? msg : m));
  }
  return [...list, msg];
}