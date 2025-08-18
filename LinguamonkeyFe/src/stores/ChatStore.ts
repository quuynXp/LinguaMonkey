import { create } from 'zustand';
import type { Room, ChatMessage } from '../types/api';

interface ChatState {
  currentRoom: Room | null;
  messages: ChatMessage[];
  unreadCount: number;

  setCurrentRoom: (room: Room | null) => void;
  addMessage: (message: ChatMessage) => void;
  setUnreadCount: (count: number) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  currentRoom: null,
  messages: [],
  unreadCount: 0,

  setCurrentRoom: (room) => set({ currentRoom: room }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  clearChat: () => set({ currentRoom: null, messages: [], unreadCount: 0 }),
}));