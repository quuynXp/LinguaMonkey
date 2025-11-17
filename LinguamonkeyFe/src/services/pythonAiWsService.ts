import { AppState } from 'react-native';
import { useTokenStore } from '../stores/tokenStore';

// Lấy URL của Kong từ .env
const KONG_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8000";
// Chuyển đổi http:// thành ws://
const KONG_WS_URL = KONG_BASE_URL.replace(/^http/, 'ws');

// Định nghĩa message cho AI Chat
export interface AiChatMessage {
  type: 'chat_request' | 'chat_response_chunk' | 'chat_response_complete' | 'error';
  prompt?: string;
  history?: { role: 'user' | 'assistant', content: string }[];
  content?: string; // Nội dung của chunk
  is_final?: boolean;
  roomId?: string,
}

export type AiMessageCallback = (message: AiChatMessage) => void;

export class PythonAiWsService {
  private ws: WebSocket | null = null;
  private url: string;
  // private token: string;
  private onMessageCallback?: AiMessageCallback;
  private reconnectInterval?: ReturnType<typeof setTimeout>;

  constructor() {
    // Đây là route ta định nghĩa trong init-kong.sh cho AI chat
    // Sơ đồ của bạn cho thấy FE-WS-Python, nên ta giả định endpoint này
    this.url = `${KONG_WS_URL}/ws/py/chat-stream`;
    // this.token = useTokenStore.getState().accessToken || "";

    AppState.addEventListener('change', this.handleAppStateChange);
  }

  public connect(onMessage: AiMessageCallback): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("AI WS: Already connected.");
      return;
    }

    const token = useTokenStore.getState().accessToken;

    if (!token) {
      console.error("AI WS: No token, connection aborted.");
      return;
    }

    this.onMessageCallback = onMessage;

    const connectUrl = `${this.url}?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(connectUrl);

    this.ws.onopen = () => console.log('✅ AI WS connected via Kong');
    this.ws.onclose = () => this.reconnect();
    this.ws.onerror = (e: any) => console.log('❌ AI WS error', e?.message || e);
    this.ws.onmessage = (e) => {
      if (this.onMessageCallback && e.data) {
        try {
          const msg = JSON.parse(e.data) as AiChatMessage;
          this.onMessageCallback(msg);
        } catch { }
      }
    };
  }

  private reconnect(): void {
    if (this.reconnectInterval) clearTimeout(this.reconnectInterval);
    this.reconnectInterval = setTimeout(() => {
      console.log('♻️ Reconnecting AI WS...');
      if (this.onMessageCallback) {
        this.connect(this.onMessageCallback);
      }
    }, 5000);
  }

  private handleAppStateChange = (state: string): void => {
    if (state === 'active' && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
      if (this.onMessageCallback) {
        this.connect(this.onMessageCallback);
      }
    }
  };

  public sendMessage(msg: AiChatMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn("AI WS: Not connected. Message not sent.");
    }
  }

  public disconnect(): void {
    if (this.reconnectInterval) clearTimeout(this.reconnectInterval);
    this.ws?.close();
    this.ws = null;
  }

  public get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const pythonAiWsService = new PythonAiWsService();