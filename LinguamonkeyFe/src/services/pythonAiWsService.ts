import { AppState, AppStateStatus, StyleSheet } from 'react-native';
import { useTokenStore } from '../stores/tokenStore';
import { API_BASE_URL } from '../api/apiConfig';

interface AiChatMessage {
  type: 'chat_request' | 'chat_response_chunk' | 'chat_response_complete' | 'error';
  prompt?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  content?: string;
  is_final?: boolean;
  roomId?: string;
  messageType?: string;
}

export type AiMessageCallback = (message: AiChatMessage) => void;

// === FIX: URL HANDLING ===
// Loại bỏ http:// hoặc https:// nếu có trong API_BASE_URL để tránh lỗi "double protocol"
const CLEAN_BASE_URL = API_BASE_URL.replace(/^https?:\/\//, '');
// Nếu chạy local/dev qua Kong port 8000, dùng ws://. Nếu prod có SSL, dùng wss://
const WS_PROTOCOL = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';
const KONG_WS_URL = `${WS_PROTOCOL}${CLEAN_BASE_URL}`;

export class PythonAiWsService {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback?: AiMessageCallback;
  private reconnectInterval?: ReturnType<typeof setTimeout>;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;
  private appStateSubscription: any;

  constructor() {
    // Kong route: /ws/py/ -> Python Service: /
    // Endpoint tại Python: @app.websocket("/chat-stream")
    // Client cần gọi: /ws/py/chat-stream
    this.url = `${KONG_WS_URL}/ws/py/chat-stream`;
    this.setupAppStateListener();
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  public connect(onMessage: AiMessageCallback): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('🤖 AI WS: Already connected or connecting');
      return;
    }

    const token = useTokenStore.getState().accessToken;
    if (!token) {
      console.error('🤖 AI WS: No token found');
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;
    this.onMessageCallback = onMessage;

    const connectUrl = `${this.url}?token=${encodeURIComponent(token)}`;
    console.log(`🤖 AI WS: Connecting to ${this.url}...`); // Log URL để debug

    this.ws = new WebSocket(connectUrl);

    this.ws.onopen = () => {
      console.log('✅ AI WS connected successfully');
      this.isConnecting = false;
      if (this.reconnectInterval) clearTimeout(this.reconnectInterval);
    };

    this.ws.onmessage = (e) => {
      if (this.onMessageCallback && e.data) {
        try {
          const msg = JSON.parse(e.data) as AiChatMessage;
          this.onMessageCallback(msg);
        } catch (err) {
          console.error('🤖 AI WS Parse Error:', err);
        }
      }
    };

    this.ws.onerror = (e: any) => {
      // Log chi tiết lỗi hơn
      console.log('❌ AI WS Error:', e?.message || JSON.stringify(e));
      this.isConnecting = false;
    };

    this.ws.onclose = (e) => {
      this.isConnecting = false;
      console.log(`⚠️ AI WS Closed. Code: ${e.code}, Reason: ${e.reason}`);

      if (e.code === 1008) {
        console.error('🛑 AI WS Auth Failed. Stopping reconnect.');
        this.shouldReconnect = false;
      } else if (this.shouldReconnect) {
        this.reconnect();
      }
    };
  }

  private reconnect(): void {
    if (this.reconnectInterval) clearTimeout(this.reconnectInterval);
    this.reconnectInterval = setTimeout(() => {
      console.log('♻️ AI WS: Reconnecting...');
      if (this.onMessageCallback && this.shouldReconnect) {
        this.connect(this.onMessageCallback);
      }
    }, 5000);
  }

  private handleAppStateChange = (state: AppStateStatus): void => {
    if (state === 'active' && this.shouldReconnect && !this.isConnected) {
      console.log('♻️ App resumed, reconnecting AI WS...');
      if (this.onMessageCallback) {
        this.connect(this.onMessageCallback);
      }
    } else if (state === 'background') {
      console.log('App backgrounded, disconnecting AI WS');
      this.disconnect();
    }
  };

  public sendMessage(msg: AiChatMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('🤖 AI WS: Not connected. Message dropped:', msg);
      if (this.onMessageCallback && this.shouldReconnect) {
        this.connect(this.onMessageCallback);
      }
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectInterval) clearTimeout(this.reconnectInterval);
    this.ws?.close();
    this.ws = null;
    this.isConnecting = false;
  }

  public destroy(): void {
    this.disconnect();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }

  public get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const pythonAiWsService = new PythonAiWsService();