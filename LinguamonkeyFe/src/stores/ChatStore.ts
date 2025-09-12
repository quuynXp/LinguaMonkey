import { create } from "zustand";
import { Client, IMessage } from "@stomp/stompjs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import instance from "../api/axiosInstance";

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

type UseChatState = {
  client?: Client | null;
  connected: boolean;
  messages: any[];
  activities: Activity[];
  stats?: ChatStats;
  connect: (token: string) => void;
  disconnect: () => void;
  sendMessage: (roomId: string, payload: any) => void;
  subscribeRoom: (roomId: string) => void;
  setStats: (s: ChatStats) => void;
  updateLastActive: (userId: string) => Promise<void>;
};

export const useChatStore = create<UseChatState>((set, get) => ({
  client: null,
  connected: false,
  messages: [],
  activities: [],
  stats: undefined,

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
        client.subscribe("/user/queue/messages", (msg: IMessage) => {
          const body = JSON.parse(msg.body);
          set((s) => ({ messages: [...s.messages, body] }));
        });
        client.subscribe("/user/queue/activity", (msg: IMessage) => {
          const body = JSON.parse(msg.body);
          set((s) => ({ activities: [body, ...s.activities].slice(0, 50) }));
        });
        client.subscribe("/user/queue/stats", (msg: IMessage) => {
          const body = JSON.parse(msg.body);
          set({ stats: body });
        });
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
    });
  },

  subscribeRoom: (roomId) => {
    const client = get().client;
    if (!client || !client.active) return;
    client.subscribe(`/topic/room/${roomId}`, (msg: IMessage) => {
      const body = JSON.parse(msg.body);
      set((s) => ({ messages: [...s.messages, body] }));
    });
  },

  setStats: (s) => set({ stats: s }),

  updateLastActive: async (userId: string) => {
    try {
      await instance.patch(`/users/${userId}/last-active`);
    } catch (e) {
      console.warn("updateLastActive failed", e);
    }
  }
}));
