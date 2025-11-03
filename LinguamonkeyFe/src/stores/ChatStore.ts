import { create } from "zustand";
import { stompService, StompMessageCallback } from "../services/stompService";
import { pythonAiWsService, AiChatMessage, AiMessageCallback } from "../services/pythonAiWsService";
import { VideoSubtitleService, DualSubtitle } from "../services/videoSubtitleService";
import instance from "../api/axiosInstance"; // axiosInstance của bạn
import { useTokenStore } from "./tokenStore";
import { ChatMessage as Message } from "../types/api";


type AiMessage = {
  id: string; // Dùng Date.now() hoặc uuid
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
};

type TypingStatus = {
  roomId: string;
  userId: string;
  isTyping: boolean;
};

// Định nghĩa State của store
type UseChatState = {
  // --- State chung ---
  stompConnected: boolean;
  aiWsConnected: boolean;

  // --- State cho Flow 2: User/Group Chat (Java) ---
  messagesByRoom: { [roomId: string]: Message[] };
  typingStatusByRoom: { [roomId: string]: TypingStatus };
  isLoadingMessages: { [roomId: string]: boolean };

  // --- State cho Flow 1: AI Chat (Python) ---
  aiChatHistory: AiMessage[];
  isAiStreaming: boolean;

  // --- State cho Flow 3: Video Call Subtitles ---
  videoSubtitleService: VideoSubtitleService | null;
  currentVideoSubtitles: DualSubtitle | null;
  
  // --- ACTIONS ---
  
  // --- Actions chung ---
  connectAllServices: () => void;
  disconnectAllServices: () => void;

  // --- Actions cho Flow 2 (Java) ---
  loadAndSubscribeToRoom: (roomId: string) => Promise<void>;
  unsubscribeFromRoom: (roomId: string) => void;
  sendGroupMessage: (roomId: string, payload: { content: string; purpose: 'GROUP_CHAT' | 'PRIVATE_CHAT' | 'AI_CHAT' }) => void;
  sendTypingStatus: (roomId: string, isTyping: boolean) => void;
  reactToMessage: (messageId: string, reaction: string) => void;
  
  // --- Actions cho Flow 1 (Python) ---
  sendAiMessage: (prompt: string) => void;

  // --- Actions cho Flow 3 (Video) ---
  connectVideoSubtitles: (roomId: string, targetLang: string) => void;
  updateSubtitleLanguage: (lang: string) => void;
  disconnectVideoSubtitles: () => void;
};

export const useChatStore = create<UseChatState>((set, get) => ({
  // --- State ---
  stompConnected: false,
  aiWsConnected: false,
  messagesByRoom: {},
  typingStatusByRoom: {},
  isLoadingMessages: {},
  aiChatHistory: [],
  isAiStreaming: false,
  videoSubtitleService: null,
  currentVideoSubtitles: null,

  // --- ACTIONS ---

  // --- Actions chung ---
  connectAllServices: () => {
    // 1. Kết nối STOMP (Java)
    if (!stompService.isConnected) {
      stompService.connect((client) => {
        set({ stompConnected: true });
        
        // Đăng ký các kênh /user/queue cá nhân
        stompService.subscribe("/user/queue/messages", (msg) => {
          // Xử lý tin nhắn private hoặc update (reaction, read)
          const message = msg as Message;
          set((state) => ({
            messagesByRoom: {
              ...state.messagesByRoom,
              [message.roomId]: upsertMessage(state.messagesByRoom[message.roomId] || [], message),
            },
          }));
        });
        
        stompService.subscribe("/user/queue/typing", (msg) => {
           const typing = msg as TypingStatus;
           set(state => ({
             typingStatusByRoom: { ...state.typingStatusByRoom, [typing.roomId]: typing }
           }));
        });
      });
    }

    // 2. Kết nối WebSocket (Python AI Chat)
    if (!pythonAiWsService.isConnected) {
      const onAiMessage: AiMessageCallback = (msg) => {
        if (msg.type === 'chat_response_chunk') {
          set((state) => {
            const lastMessage = state.aiChatHistory[state.aiChatHistory.length - 1];
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
              // Nối chunk vào tin nhắn cuối cùng
              lastMessage.content += msg.content || "";
              return { aiChatHistory: [...state.aiChatHistory] };
            } else {
              // Bắt đầu một tin nhắn streaming mới
              return {
                isAiStreaming: true,
                aiChatHistory: [
                  ...state.aiChatHistory,
                  { id: Date.now().toString(), role: 'assistant', content: msg.content || "", isStreaming: true }
                ]
              };
            }
          });
        } else if (msg.type === 'chat_response_complete') {
          set((state) => {
             const lastMessage = state.aiChatHistory[state.aiChatHistory.length - 1];
             if(lastMessage && lastMessage.isStreaming) {
                lastMessage.isStreaming = false;
             }
             return { isAiStreaming: false, aiChatHistory: [...state.aiChatHistory] };
          });
        }
      };
      pythonAiWsService.connect(onAiMessage);
      set({ aiWsConnected: true });
    }
  },

  disconnectAllServices: () => {
    stompService.disconnect();
    pythonAiWsService.disconnect();
    get().disconnectVideoSubtitles(); // Gọi action nội bộ
    set({ stompConnected: false, aiWsConnected: false });
  },

  // --- Actions cho Flow 2 (Java) ---
  loadAndSubscribeToRoom: async (roomId: string) => {
    if (get().isLoadingMessages[roomId] || get().messagesByRoom[roomId]) {
      // Đã load hoặc đang load
      return;
    }

    set(state => ({ isLoadingMessages: { ...state.isLoadingMessages, [roomId]: true }}));

    try {
      // 1. Gọi REST để lấy lịch sử tin nhắn
      const response = await instance.get(`/api/v1/chat/room/${roomId}/messages`);
      const messages = response.data.result.content.reverse(); // API trả về phân trang (mới nhất trước)
      
      set((state) => ({
        messagesByRoom: { ...state.messagesByRoom, [roomId]: messages },
      }));

      // 2. Subscribe STOMP để nhận tin nhắn mới
      if (get().stompConnected) {
        stompService.subscribe(`/topic/room/${roomId}`, (msg) => {
          const message = msg as Message;
          set((state) => ({
            messagesByRoom: {
              ...state.messagesByRoom,
              [roomId]: upsertMessage(state.messagesByRoom[roomId] || [], message),
            },
          }));
        });
        
        stompService.subscribe(`/topic/room/${roomId}/typing`, (msg) => {
           const typing = msg as TypingStatus;
           set(state => ({
             typingStatusByRoom: { ...state.typingStatusByRoom, [typing.roomId]: typing }
           }));
        });
      }
    } catch (e) {
      console.error("Failed to load messages for room", roomId, e);
    } finally {
      set(state => ({ isLoadingMessages: { ...state.isLoadingMessages, [roomId]: false }}));
    }
  },

  unsubscribeFromRoom: (roomId: string) => {
    stompService.unsubscribe(`/topic/room/${roomId}`);
    stompService.unsubscribe(`/topic/room/${roomId}/typing`);
    // Giữ lại tin nhắn trong state, không xóa
  },
  
  sendGroupMessage: (roomId, payload) => {
    // Gửi qua STOMP (Java)
    stompService.publish(`/app/chat/room/${roomId}`, payload);
  },

  sendTypingStatus: (roomId, isTyping) => {
    stompService.publish(`/app/chat/room/${roomId}/typing`, { isTyping });
  },

  reactToMessage: (messageId, reaction) => {
    stompService.publish(`/app/chat/message/${messageId}/react`, reaction); // BE Java nhận String
  },

  // --- Actions cho Flow 1 (Python) ---
  sendAiMessage: (prompt: string) => {
    if (!get().aiWsConnected) {
      console.warn("AI WS not connected. Cannot send message.");
      return;
    }
    
    // Thêm tin nhắn của user vào lịch sử
    const userMessage: AiMessage = { id: Date.now().toString(), role: 'user', content: prompt };
    set(state => ({ 
      aiChatHistory: [...state.aiChatHistory, userMessage],
      isAiStreaming: true,
    }));
    
    // Lấy lịch sử để gửi
    const history = get().aiChatHistory.map(m => ({ role: m.role, content: m.content }));
    
    // Gửi qua WebSocket (Python)
    pythonAiWsService.sendMessage({
      type: 'chat_request',
      prompt: prompt,
      history: history.slice(0, -1) // Gửi lịch sử *trước* tin nhắn này
    });
  },

  // --- Actions cho Flow 3 (Video) ---
  connectVideoSubtitles: (roomId: string, targetLang: string) => {
    const service = new VideoSubtitleService();
    set({ videoSubtitleService: service, currentVideoSubtitles: null });

    service.connect(roomId, targetLang, (subtitle) => {
      set({ currentVideoSubtitles: subtitle });
    });
  },

  updateSubtitleLanguage: (lang: string) => {
    get().videoSubtitleService?.updateTargetLanguage(lang);
  },

  disconnectVideoSubtitles: () => {
    get().videoSubtitleService?.disconnect();
    set({ videoSubtitleService: null, currentVideoSubtitles: null });
  },
}));

// --- Helper ---
function upsertMessage(existingMessages: Message[], newMessage: Message): Message[] {
  const index = existingMessages.findIndex(m => m.chatMessageId === newMessage.chatMessageId);
  if (index > -1) {
    // Cập nhật (reaction, read status, edit,...)
    const updated = [...existingMessages];
    updated[index] = { ...updated[index], ...newMessage };
    return updated;
  }
  // Thêm mới
  return [...existingMessages, newMessage];
}