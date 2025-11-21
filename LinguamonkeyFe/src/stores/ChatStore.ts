// import { create } from 'zustand';
// import { stompService } from '../services/stompService';
// import {
//   pythonAiWsService,
//   AiMessageCallback,
// } from '../services/pythonAiWsService';
// import {
//   VideoSubtitleService,
//   DualSubtitle,
// } from '../services/videoSubtitleService';
// import instance from '../api/axiosInstance'; // axiosInstance của bạn
// import {
//   ChatMessage as Message,
//   Room, // Import type Room từ api.ts
//   ApiResponse, // Import type ApiResponse từ api.ts
// } from '../types/api';
// import { NavigationProp } from '@react-navigation/native';
// import { useUserStore } from './UserStore';


// type RoomPurpose =
//   | 'QUIZ_TEAM'
//   | 'CALL'
//   | 'PRIVATE_CHAT'
//   | 'GROUP_CHAT'
//   | 'AI_CHAT';

// type RoomRequest = {
//   roomName: string;
//   creatorId: string;
//   description?: string; // RoomRequest.java có, nhưng DB/api.ts Room không có. Gửi null
//   maxMembers: number;
//   purpose: RoomPurpose;
//   roomType: 'PUBLIC' | 'PRIVATE';
// };

// type AiMessage = {
//   id: string;
//   role: 'user' | 'assistant';
//   content: string;
//   isStreaming?: boolean;
//   roomId: string;
// };

// type TypingStatus = {
//   roomId: string;
//   userId: string;
//   isTyping: boolean;
// };

// // Định nghĩa State của store
// type UseChatState = {
//   // --- State chung ---
//   stompConnected: boolean;
//   aiWsConnected: boolean;

//   // --- State cho Flow 2: User/Group Chat (Java) ---
//   rooms: { [roomId: string]: Room }; // State lưu thông tin phòng
//   messagesByRoom: { [roomId: string]: Message[] };
//   typingStatusByRoom: { [roomId: string]: TypingStatus };
//   isLoadingMessages: { [roomId: string]: boolean };
//   isCreatingRoom: boolean; // State loading tạo phòng

//   // --- State cho Flow 1: AI Chat (Python) ---
//   aiChatHistory: AiMessage[];
//   isAiStreaming: boolean;

//   // --- State cho Flow 3: Video Call Subtitles ---
//   videoSubtitleService: VideoSubtitleService | null;
//   currentVideoSubtitles: DualSubtitle | null;

//   // --- ACTIONS ---

//   // --- Actions chung ---
//   connectAllServices: () => void;
//   disconnectAllServices: () => void;

//   // --- Actions cho Flow 2 (Java) ---
//   createAndNavigateToRoom: (
//     // Payload không cần creatorId, store sẽ tự lấy
//     payload: Omit<RoomRequest, 'creatorId' | 'description'>,
//     navigation: NavigationProp<any>,
//   ) => Promise<void>;
//   loadAndSubscribeToRoom: (roomId: string) => Promise<void>;
//   unsubscribeFromRoom: (roomId: string) => void;
//   sendGroupMessage: (
//     roomId: string,
//     payload: { content: string; purpose: 'GROUP_CHAT' | 'PRIVATE_CHAT' | 'AI_CHAT' },
//   ) => void;
//   sendTypingStatus: (roomId: string, isTyping: boolean) => void;
//   reactToMessage: (messageId: string, reaction: string) => void;

//   // --- Actions cho Flow 1 (Python) ---
//   sendAiMessage: (prompt: string, roomId: string) => void;

//   // --- Actions cho Flow 3 (Video) ---
//   connectVideoSubtitles: (roomId: string, targetLang: string) => void;
//   updateSubtitleLanguage: (lang: string) => void;
//   disconnectVideoSubtitles: () => void;
// };

// export const useChatStore = create<UseChatState>((set, get) => ({
//   // --- State ---
//   stompConnected: false,
//   aiWsConnected: false,
//   rooms: {}, // Khởi tạo
//   messagesByRoom: {},
//   typingStatusByRoom: {},
//   isLoadingMessages: {},
//   isCreatingRoom: false, // Khởi tạo
//   aiChatHistory: [],
//   isAiStreaming: false,
//   videoSubtitleService: null,
//   currentVideoSubtitles: null,

//   // --- ACTIONS ---

//   // --- Actions chung ---
//   connectAllServices: () => {
//     // 1. Kết nối STOMP (Java)
//     if (!stompService.isConnected) {
//       stompService.connect((client) => {
//         set({ stompConnected: true });

//         // Đăng ký các kênh /user/queue cá nhân
//         stompService.subscribe('/user/queue/messages', (msg) => {
//           // Xử lý tin nhắn private hoặc update (reaction, read)
//           const message = msg as Message;
//           set((state) => ({
//             messagesByRoom: {
//               ...state.messagesByRoom,
//               [message.roomId]: upsertMessage(
//                 state.messagesByRoom[message.roomId] || [],
//                 message,
//               ),
//             },
//           }));
//         });

//         stompService.subscribe('/user/queue/typing', (msg) => {
//           const typing = msg as TypingStatus;
//           set((state) => ({
//             typingStatusByRoom: {
//               ...state.typingStatusByRoom,
//               [typing.roomId]: typing,
//             },
//           }));
//         });
//       });
//     }

//     // 2. Kết nối WebSocket (Python AI Chat)
//     if (!pythonAiWsService.isConnected) {
//       const onAiMessage: AiMessageCallback = (msg) => {
//         if (msg.type === 'chat_response_chunk') {
//           set((state) => {
//             const lastMessage =
//               state.aiChatHistory[state.aiChatHistory.length - 1];
//             if (
//               lastMessage &&
//               lastMessage.role === 'assistant' &&
//               lastMessage.isStreaming
//             ) {
//               // Nối chunk vào tin nhắn cuối cùng
//               lastMessage.content += msg.content || '';
//               return { aiChatHistory: [...state.aiChatHistory] };
//             } else {
//               // Bắt đầu một tin nhắn streaming mới
//               return {
//                 isAiStreaming: true,
//                 aiChatHistory: [
//                   ...state.aiChatHistory,
//                   {
//                     id: Date.now().toString(),
//                     role: 'assistant',
//                     content: msg.content || '',
//                     isStreaming: true,
//                     roomId: msg.roomId, // Giả định msg có roomId
//                   },
//                 ],
//               };
//             }
//           });
//         } else if (msg.type === 'chat_response_complete') {
//           set((state) => {
//             const lastMessage =
//               state.aiChatHistory[state.aiChatHistory.length - 1];
//             if (lastMessage && lastMessage.isStreaming) {
//               lastMessage.isStreaming = false;
//             }
//             return {
//               isAiStreaming: false,
//               aiChatHistory: [...state.aiChatHistory],
//             };
//           });
//         }
//       };
//       pythonAiWsService.connect(onAiMessage);
//       set({ aiWsConnected: true });
//     }
//   },

//   disconnectAllServices: () => {
//     stompService.disconnect();
//     pythonAiWsService.disconnect();
//     get().disconnectVideoSubtitles(); // Gọi action nội bộ
//     set({ stompConnected: false, aiWsConnected: false });
//   },

//   // --- Actions cho Flow 2 (Java) ---
//   createAndNavigateToRoom: async (payload, navigation) => {
//     set({ isCreatingRoom: true });
//     try {
//       // **GIẢ ĐỊNH:** Lấy userId từ useTokenStore
//       // Thay đổi `userInfo.userId` cho đúng với cấu trúc state của bạn
//       const { user } = useUserStore.getState();
//       const creatorId = user?.userId;

//       if (!creatorId) {
//         throw new Error('User not authenticated. Cannot get creatorId.');
//       }

//       // Xây dựng payload đầy đủ khớp với RoomRequest.java
//       const fullPayload: RoomRequest = {
//         ...payload,
//         creatorId: creatorId,
//         description: null, // Gửi null vì DB không có cột này
//       };

//       // 1. Gọi API backend để tạo phòng
//       // Sử dụng `Room` từ api.ts làm kiểu trả về
//       const response = await instance.post<ApiResponse<Room>>(
//         '/api/v1/rooms',
//         fullPayload,
//       );

//       const newRoom = response.data.result;

//       if (!newRoom || !newRoom.roomId) {
//         throw new Error('Invalid room data received from server');
//       }

//       // 2. Thêm phòng mới vào state
//       set((state) => ({
//         rooms: {
//           ...state.rooms,
//           [newRoom.roomId]: newRoom,
//         },
//         isCreatingRoom: false,
//       }));

//       // 3. Điều hướng đến màn hình chat với phòng mới
//       navigation.navigate('UserChat', { room: newRoom });
//     } catch (error) {
//       console.error('Failed to create room:', error);
//       set({ isCreatingRoom: false });
//       // Ném lỗi ra để component có thể bắt và hiển thị Alert
//       throw error;
//     }
//   },

//   loadAndSubscribeToRoom: async (roomId: string) => {
//     if (get().isLoadingMessages[roomId] || get().messagesByRoom[roomId]) {
//       // Đã load hoặc đang load
//       return;
//     }

//     set((state) => ({
//       isLoadingMessages: { ...state.isLoadingMessages, [roomId]: true },
//     }));

//     try {
//       // 1. Gọi REST để lấy lịch sử tin nhắn
//       const response = await instance.get(
//         `/api/v1/chat/room/${roomId}/messages`,
//       );
//       const messages = response.data.result.content.reverse(); // API trả về phân trang (mới nhất trước)

//       set((state) => ({
//         messagesByRoom: { ...state.messagesByRoom, [roomId]: messages },
//       }));

//       // 2. Subscribe STOMP để nhận tin nhắn mới
//       stompService.subscribe(`/topic/room/${roomId}`, (msg) => {
//         const message = msg as Message;
//         set((state) => ({
//           messagesByRoom: {
//             ...state.messagesByRoom,
//             [roomId]: upsertMessage(state.messagesByRoom[roomId] || [], message),
//           },
//         }));
//       });

//       stompService.subscribe(`/topic/room/${roomId}/typing`, (msg) => {
//         const typing = msg as TypingStatus;
//         set((state) => ({
//           typingStatusByRoom: {
//             ...state.typingStatusByRoom,
//             [typing.roomId]: typing,
//           },
//         }));
//       });
//     } catch (e) {
//       console.error('Failed to load messages for room', roomId, e);
//     } finally {
//       set((state) => ({
//         isLoadingMessages: { ...state.isLoadingMessages, [roomId]: false },
//       }));
//     }
//   },

//   unsubscribeFromRoom: (roomId: string) => {
//     stompService.unsubscribe(`/topic/room/${roomId}`);
//     stompService.unsubscribe(`/topic/room/${roomId}/typing`);
//     // Giữ lại tin nhắn trong state, không xóa
//   },

//   sendGroupMessage: async (roomId: string | null, payload: { content: string; purpose: 'GROUP_CHAT' | 'PRIVATE_CHAT' | 'AI_CHAT', targetUserId?: string }) => {
//     let activeRoomId = roomId;

//     // 1. Nếu chưa có roomId, phải tạo phòng trước
//     if (!activeRoomId) {
//       if (!payload.targetUserId) {
//         console.error("Cannot create room without targetUserId");
//         return;
//       }

//       try {
//         // Giả định bạn đã có action createAndNavigateToRoom hoặc gọi API trực tiếp
//         // Đây là logic tạo phòng "ngầm"
//         const newRoom = await get().createRoomInternal({
//           roomName: "Private Chat", // Tên tạm
//           maxMembers: 2,
//           purpose: payload.purpose,
//           roomType: "PRIVATE",
//           // creatorId tự lấy từ token ở backend hoặc store user
//         }, payload.targetUserId); // Cần truyền thêm targetUserId để add member

//         activeRoomId = newRoom.roomId;

//         // Update state rooms
//         set((state) => ({
//           rooms: { ...state.rooms, [activeRoomId!]: newRoom }
//         }));
//       } catch (e) {
//         console.error("Failed to create room automatically:", e);
//         return;
//       }
//     }

//     // 2. Gửi tin nhắn khi đã chắc chắn có roomId
//     if (stompService.isConnected && activeRoomId) {
//       // Payload gửi lên Java phải khớp với ChatMessageRequest.java
//       const msgPayload = {
//         roomId: activeRoomId, // <--- Java cần cái này
//         content: payload.content,
//         messageType: "TEXT"
//       };
//       stompService.publish(`/app/chat/room/${activeRoomId}`, msgPayload);
//     } else {
//       console.warn("STOMP not connected or Room ID missing");
//     }
//   },

//   // Action phụ trợ để tạo phòng (cần implement nếu chưa có)
//   createRoomInternal: async (roomRequest: any, targetMemberId: string): Promise<Room> => {
//     // Gọi API POST /api/v1/rooms
//     // Sau đó gọi API POST /api/v1/rooms/{id}/members để add đối phương vào
//     // Trả về object Room đầy đủ
//     // ... (Code gọi API của bạn)
//     // Ví dụ mock:
//     return {} as Room;
//   },

//   sendTypingStatus: (roomId, isTyping) => {
//     stompService.publish(`/app/chat/room/${roomId}/typing`, { isTyping });
//   },

//   reactToMessage: (messageId, reaction) => {
//     stompService.publish(`/app/chat/message/${messageId}/react`, reaction); // BE Java nhận String
//   },

//   // --- Actions cho Flow 1 (Python) ---
//   sendAiMessage: (prompt: string, roomId: string) => {
//     if (!get().aiWsConnected) {
//       console.warn('AI WS not connected. Cannot send message.');
//       return;
//     }

//     // Thêm tin nhắn của user vào lịch sử
//     const userMessage: AiMessage = {
//       id: Date.now().toString(),
//       role: 'user',
//       content: prompt,
//       roomId,
//     };
//     set((state) => ({
//       aiChatHistory: [...state.aiChatHistory, userMessage],
//       isAiStreaming: true,
//     }));

//     // Lấy lịch sử để gửi
//     const history = get().aiChatHistory.map((m) => ({
//       role: m.role,
//       content: m.content,
//     }));

//     // Gửi qua WebSocket (Python)
//     pythonAiWsService.sendMessage({
//       type: 'chat_request',
//       prompt: prompt,
//       history: history.slice(0, -1),
//       roomId: roomId,
//     });
//   },

//   // --- Actions cho Flow 3 (Video) ---
//   connectVideoSubtitles: (roomId: string, targetLang: string) => {
//     const service = new VideoSubtitleService();
//     set({ videoSubtitleService: service, currentVideoSubtitles: null });

//     service.connect(roomId, targetLang, (subtitle) => {
//       set({ currentVideoSubtitles: subtitle });
//     });
//   },

//   updateSubtitleLanguage: (lang: string) => {
//     get().videoSubtitleService?.updateTargetLanguage(lang);
//   },

//   disconnectVideoSubtitles: () => {
//     get().videoSubtitleService?.disconnect();
//     set({ videoSubtitleService: null, currentVideoSubtitles: null });
//   },
// }));

// // --- Helper ---
// function upsertMessage(
//   existingMessages: Message[],
//   newMessage: Message,
// ): Message[] {
//   const index = existingMessages.findIndex(
//     (m) => m.chatMessageId === newMessage.chatMessageId,
//   );
//   if (index > -1) {
//     // Cập nhật (reaction, read status, edit,...)
//     const updated = [...existingMessages];
//     updated[index] = { ...updated[index], ...newMessage };
//     return updated;
//   }
//   // Thêm mới
//   return [...existingMessages, newMessage];
// }

import { create } from 'zustand';
import { stompService } from '../services/stompService';
import {
  pythonAiWsService,
  AiMessageCallback,
  AiChatMessage
} from '../services/pythonAiWsService';
import {
  VideoSubtitleService,
  DualSubtitle,
} from '../services/videoSubtitleService';
import instance from '../api/axiosInstance';
import {
  ChatMessage as Message,
  Room,
  ApiResponse,
} from '../types/api';
import { useUserStore } from './UserStore';

type TypingStatus = {
  roomId: string;
  userId: string;
  isTyping: boolean;
};

// AiMessage cho UI
type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  roomId: string;
};

type UseChatState = {
  // --- State ---
  stompConnected: boolean;
  aiWsConnected: boolean;

  rooms: { [roomId: string]: Room };
  messagesByRoom: { [roomId: string]: Message[] };

  // AI State
  aiChatHistory: AiMessage[];
  isAiStreaming: boolean;
  activeAiRoomId: string | null;

  // Video State
  videoSubtitleService: VideoSubtitleService | null;
  currentVideoSubtitles: DualSubtitle | null;

  // --- Actions ---
  initChatService: () => void;

  // Chat Logic
  startPrivateChat: (targetUserId: string) => Promise<Room | null>;
  startAiChat: () => Promise<void>;

  loadMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string, type: 'TEXT' | 'IMAGE') => void;
  sendAiPrompt: (content: string) => void;

  // Video Logic
  connectVideoSubtitles: (roomId: string, targetLang: string) => void;
  disconnectVideoSubtitles: () => void;
};

export const useChatStore = create<UseChatState>((set, get) => ({
  stompConnected: false,
  aiWsConnected: false,
  rooms: {},
  messagesByRoom: {},
  aiChatHistory: [],
  isAiStreaming: false,
  activeAiRoomId: null,
  videoSubtitleService: null,
  currentVideoSubtitles: null,

  initChatService: () => {
    // 1. Connect STOMP (Java)
    if (!stompService.isConnected) {
      stompService.connect(() => {
        set({ stompConnected: true });
        console.log("🔵 ChatStore: STOMP Connected");
      });
    }

    // 2. Connect Python WS (AI)
    // Lưu ý: Chỉ connect khi thực sự vào màn hình AI Chat để tiết kiệm resource, 
    // hoặc connect global tùy nhu cầu. Ở đây ta connect global.
    if (!pythonAiWsService.isConnected) {
      pythonAiWsService.connect((msg) => {
        const state = get();

        if (msg.type === 'chat_response_chunk') {
          // Logic nối chuỗi streaming
          const lastMsg = state.aiChatHistory[state.aiChatHistory.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
            lastMsg.content += msg.content;
            set({ aiChatHistory: [...state.aiChatHistory] });
          } else {
            // New assistant message
            set({
              aiChatHistory: [...state.aiChatHistory, {
                id: Date.now().toString(),
                role: 'assistant',
                content: msg.content || '',
                isStreaming: true,
                roomId: msg.roomId || state.activeAiRoomId || ''
              }]
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

  // === FLOW 1: CHAT 1-1 (Private) ===
  startPrivateChat: async (targetUserId: string) => {
    try {
      // Gọi API Java để tìm hoặc tạo phòng
      const res = await instance.post<ApiResponse<Room>>(`/api/v1/rooms/private?targetUserId=${targetUserId}`);
      const room = res.data.result;

      if (room && room.roomId) {
        // Lưu thông tin phòng
        set(state => ({ rooms: { ...state.rooms, [room.roomId]: room } }));

        // Subscribe topic realtime của phòng này
        stompService.subscribe(`/topic/room/${room.roomId}`, (rawMsg) => {
          const msg = rawMsg as Message;
          set(state => ({
            messagesByRoom: {
              ...state.messagesByRoom,
              [room.roomId]: upsertMessage(state.messagesByRoom[room.roomId] || [], msg)
            }
          }));
        });

        return room;
      }
      return null;
    } catch (error) {
      console.error("Failed to start private chat:", error);
      return null;
    }
  },

  // === FLOW 2: AI CHAT ===
  startAiChat: async () => {
    try {
      // Gọi API Java để lấy AI Room của user hiện tại
      const res = await instance.get<ApiResponse<Room>>(`/api/v1/rooms/ai-chat-room`);
      const room = res.data.result;

      if (room) {
        set({ activeAiRoomId: room.roomId });
        // Load lịch sử cũ từ Java nếu cần
        await get().loadMessages(room.roomId);

        // Map tin nhắn từ DB sang format UI AI
        const dbMessages = get().messagesByRoom[room.roomId] || [];
        const aiFormatMessages: AiMessage[] = dbMessages.map(m => ({
          id: m.chatMessageId,
          role: m.senderId ? 'user' : 'assistant', // Giả sử AI senderId là null
          content: m.content,
          roomId: room.roomId
        }));
        set({ aiChatHistory: aiFormatMessages });
      }
    } catch (e) {
      console.error("Failed to start AI chat:", e);
    }
  },

  // === COMMON: Load History ===
  loadMessages: async (roomId: string) => {
    try {
      const res = await instance.get<ApiResponse<{ content: Message[] }>>(`/api/v1/chat/room/${roomId}/messages`);
      const messages = res.data.result.content.reverse(); // Đảo ngược để tin mới nhất ở dưới
      set(state => ({
        messagesByRoom: { ...state.messagesByRoom, [roomId]: messages }
      }));
    } catch (e) {
      console.error("Load messages failed:", e);
    }
  },

  // === COMMON: Send Message (User -> Java/User) ===
  sendMessage: (roomId: string, content: string, type: 'TEXT' | 'IMAGE') => {
    if (!stompService.isConnected) {
      console.warn("STOMP not connected");
      return;
    }

    const payload = {
      content: content,
      roomId: roomId,     // <--- Quan trọng: Java cần cái này
      messageType: type,
      purpose: 'PRIVATE_CHAT' // Hoặc GROUP_CHAT tùy context (cần xử lý kỹ hơn ở component)
    };

    // Java Controller: @MessageMapping("/chat/room/{roomId}")
    stompService.publish(`/app/chat/room/${roomId}`, payload);
  },

  // === AI: Send Message (User -> Python) ===
  sendAiPrompt: (content: string) => {
    const { activeAiRoomId, aiWsConnected } = get();
    if (!activeAiRoomId || !aiWsConnected) {
      console.error("AI not ready");
      return;
    }

    // UI Optimistic Update
    set(state => ({
      aiChatHistory: [...state.aiChatHistory, {
        id: Date.now().toString(),
        role: 'user',
        content: content,
        roomId: activeAiRoomId
      }],
      isAiStreaming: true
    }));

    // Send to Python via WS
    const history = get().aiChatHistory.map(m => ({ role: m.role, content: m.content }));

    pythonAiWsService.sendMessage({
      type: 'chat_request',
      prompt: content,
      history: history.slice(0, -1), // Lịch sử trừ tin nhắn mới nhất vừa push
      roomId: activeAiRoomId, // <--- Python cần cái này để push về Kafka -> Java
      messageType: 'TEXT'
    });
  },

  // === VIDEO SUBTITLES ===
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
  }

}));

// Helper
function upsertMessage(list: Message[], msg: Message): Message[] {
  const exists = list.find(m => m.chatMessageId === msg.chatMessageId);
  if (exists) return list.map(m => m.chatMessageId === msg.chatMessageId ? msg : m);
  return [...list, msg];
}