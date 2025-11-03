import { create } from "zustand";
import { Client, IMessage } from "@stomp/stompjs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import instance from "../api/axiosInstance";
import { useTokenStore } from "./tokenStore"; // Import tokenStore

type Activity = {
  id?: string;
  type: string;
  title: string;
  description?: string;
  createdAt?: string;
};

type ChatStats = {
  totalMessages: number;
  translationsUsed: number;
  videoCalls: number;
  lastActiveAt?: string;
  online?: boolean;
  level?: number;
  exp?: number;
  streak?: number;
};

// --- MỚI THÊM ---
type TypingStatus = {
  roomId: string;
  userId: string;
  isTyping: boolean;
};
// --- KẾT THÚC THÊM MỚI ---

type UseChatState = {
  client?: Client | null;
  connected: boolean;
  messages: any[];
  activities: Activity[];
  stats?: ChatStats;
  typingStatus: { [roomId: string]: TypingStatus }; // Thay đổi: Hỗ trợ nhiều phòng
  connect: (token: string) => void;
  disconnect: () => void;
  sendMessage: (roomId: string, payload: any) => void;
  subscribeRoom: (roomId: string) => void;
  setStats: (s: ChatStats) => void;
  updateLastActive: (userId: string) => Promise<void>;
  // --- MỚI THÊM ---
  reactToMessage: (messageId: string, reaction: string) => void;
  markMessageAsRead: (messageId: string) => void;
  sendTypingStatus: (roomId: string, isTyping: boolean) => void;
  // --- KẾT THÚC THÊM MỚI ---
};

// --- MỚI: Helper function để lấy auth header ---
const getAuthHeaders = () => {
  const token = useTokenStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- MỚI: Helper function để cập nhật hoặc thêm tin nhắn ---
const upsertMessage = (existingMessages: any[], newMessage: any) => {
  const messageIdKey = newMessage.chatMessageId || newMessage.id;
  const index = existingMessages.findIndex(m => (m.chatMessageId || m.id) === messageIdKey);
  if (index > -1) {
    // Cập nhật tin nhắn đã có (ví dụ: reaction, read status)
    const updatedMessages = [...existingMessages];
    updatedMessages[index] = { ...updatedMessages[index], ...newMessage };
    return updatedMessages;
  }
  // Thêm tin nhắn mới
  return [...existingMessages, newMessage];
};

export const useChatStore = create<UseChatState>((set, get) => ({
  client: null,
  connected: false,
  messages: [],
  activities: [],
  stats: undefined,
  typingStatus: {}, // Thay đổi: Khởi tạo là object rỗng

  connect: (token: string) => {
    if (get().client && get().connected) return;
    const client = new Client({
      brokerURL: `${process.env.EXPO_PUBLIC_WS_BASE_URL || "wss://192.168.2.60:8080/ws"}`,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: (frame) => {
        console.log("STOMP connected", frame);
        set({ connected: true });

        // Kênh cho tin nhắn private/AI, hoặc các cập nhật (reaction/read) cho user
        client.subscribe("/user/queue/messages", (msg: IMessage) => {
          const body = JSON.parse(msg.body);
          set((s) => ({ messages: upsertMessage(s.messages, body) })); // Dùng helper
        });

        client.subscribe("/user/queue/activity", (msg: IMessage) => {
          const body = JSON.parse(msg.body);
          set((s) => ({ activities: [body, ...s.activities].slice(0, 50) }));
        });

        client.subscribe("/user/queue/stats", (msg: IMessage) => {
          const body = JSON.parse(msg.body);
          set({ stats: body });
        });

        // --- MỚI: Đăng ký kênh typing private/AI ---
        client.subscribe("/user/queue/typing", (msg: IMessage) => {
          const body: TypingStatus = JSON.parse(msg.body);
          set((s) => ({
            typingStatus: {
              ...s.typingStatus,
              [body.roomId]: body,
            },
          }));
        });
        // --- KẾT THÚC MỚI ---
      },
      onStompError: (frame) => {
        console.error("STOMP error", frame);
      },
      onDisconnect: () => {
        console.log("STOMP disconnected");
        set({ connected: false });
      }
    });
    client.activate();
    set({ client });
  },

  disconnect: () => {
    const client = get().client;
    if (client && client.active) client.deactivate();
    set({ client: null, connected: false });
  },

  sendMessage: (roomId, payload) => {
    const client = get().client;
    if (!client || !client.active) throw new Error("STOMP not connected");
    client.publish({
      destination: `/app/chat/room/${roomId}`,
      body: JSON.stringify(payload),
      headers: getAuthHeaders(), // Thêm header
    });
  },

  subscribeRoom: (roomId) => {
    const client = get().client;
    if (!client || !client.active) return;

    // --- MỚI: Đăng ký kênh tin nhắn/updates của group ---
    client.subscribe(`/topic/room/${roomId}`, (msg: IMessage) => {
      const body = JSON.parse(msg.body);
      set((s) => ({ messages: upsertMessage(s.messages, body) })); // Dùng helper
    });
    // --- KẾT THÚC MỚI ---

    // Kênh dịch (đã có)
    client.subscribe(`/topic/room/${roomId}/translations`, (msg: IMessage) => {
      const body = JSON.parse(msg.body); // { messageId, targetLang, translatedText, provider }
      set((s) => ({
        messages: s.messages.map(m =>
          (m.id || m.chatMessageId) === body.messageId ? { ...m, translatedText: body.translatedText, translatedLang: body.targetLang } : m)
      }));
    });

    // --- MỚI: Đăng ký kênh typing của group ---
    client.subscribe(`/topic/room/${roomId}/typing`, (msg: IMessage) => {
      const body: TypingStatus = JSON.parse(msg.body);
      set((s) => ({
        typingStatus: {
          ...s.typingStatus,
          [body.roomId]: body,
        },
      }));
    });
    // --- KẾT THÚC MỚI ---
  },

  setStats: (s) => set({ stats: s }),

  updateLastActive: async (userId: string) => {
    try {
      await instance.patch(`/users/${userId}/last-active`);
    } catch (e) {
      console.warn("updateLastActive failed", e);
    }
  },

  // --- MỚI: Các hàm actions ---
  reactToMessage: (messageId, reaction) => {
    const client = get().client;
    if (!client || !client.active) throw new Error("STOMP not connected");
    client.publish({
      destination: `/app/chat/message/${messageId}/react`,
      body: reaction, // BE chỉ cần payload là string
      headers: getAuthHeaders(),
    });
  },

  markMessageAsRead: (messageId) => {
    const client = get().client;
    if (!client || !client.active) throw new Error("STOMP not connected");
    client.publish({
      destination: `/app/chat/message/${messageId}/read`,
      body: "", // Không cần body
      headers: getAuthHeaders(),
    });
  },

  sendTypingStatus: (roomId, isTyping) => {
    const client = get().client;
    if (!client || !client.active) throw new Error("STOMP not connected");
    client.publish({
      destination: `/app/chat/room/${roomId}/typing`,
      body: JSON.stringify({ isTyping }), // BE cần object TypingStatusRequest
      headers: getAuthHeaders(),
    });
  },
  // --- KẾT THÚC MỚI ---
}));