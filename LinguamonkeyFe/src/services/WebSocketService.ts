import { AppState, AppStateStatus } from 'react-native';
import { API_BASE_URL } from '../api/apiConfig';

const API_URL = API_BASE_URL;
const KONG_SECURE_WSS_URL = `wss://${API_URL}`;

interface WSMessage {
  type: string;
  data?: any;
  session_id?: string;
  seq?: number;
  timestamp?: number;
  is_last?: boolean;
  roomId?: string;
  content?: string;
}

export type WebSocketCallback = (msg: WSMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectInterval?: ReturnType<typeof setTimeout>;
  private onMessageCallback?: WebSocketCallback;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = false;
  private appStateSubscription: any;

  constructor(path: string, token: string) {
    this.url = `${KONG_SECURE_WSS_URL}${path}`;
    this.token = token;
    this.setupAppStateListener();
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (state: AppStateStatus): void => {
    if (state === 'active' && this.shouldReconnect && !this.isConnected) {
      console.log('♻️ App resumed, reconnecting WebSocket...');
      this.connect(this.onMessageCallback!);
    } else if (state === 'background') {
      console.log('App backgrounded, disconnecting WebSocket');
      this.disconnect();
    }
  };

  public connect(onMessage: WebSocketCallback): void {
    if (this.isConnected || this.isConnecting) {
      console.log('WS: Already connected or connecting');
      return;
    }

    if (!this.token) {
      console.error('WS: No token found');
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;
    this.onMessageCallback = onMessage;

    const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
    console.log(`🔌 WS: Connecting to ${this.url.replace(this.token, '***')}...`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WS connected successfully');
      this.isConnecting = false;
      if (this.reconnectInterval) clearTimeout(this.reconnectInterval);
    };

    this.ws.onmessage = (e) => {
      if (this.onMessageCallback && e.data) {
        try {
          const msg = JSON.parse(e.data) as WSMessage;
          this.onMessageCallback(msg);
        } catch (err) {
          console.error('WS Parse Error:', err);
        }
      }
    };

    this.ws.onerror = (e: any) => {
      console.error('❌ WS Error:', e?.message || 'Unknown error');
      this.isConnecting = false;
    };

    this.ws.onclose = (e) => {
      this.isConnecting = false;
      console.log(`⚠️ WS Closed. Code: ${e.code}, Reason: ${e.reason}`);

      // 1000: Normal Closure
      // 1008: Policy Violation (Auth error)
      // 1011: Internal Error
      if (e.code === 1008) {
        console.error('🛑 WS Auth Failed. Stopping reconnect.');
        this.shouldReconnect = false;
      } else if (this.shouldReconnect) {
        this.reconnect();
      }
    };
  }

  private reconnect(): void {
    if (this.reconnectInterval) clearTimeout(this.reconnectInterval);
    this.reconnectInterval = setTimeout(() => {
      console.log('♻️ Reconnecting WS...');
      if (this.onMessageCallback && this.shouldReconnect) {
        this.connect(this.onMessageCallback);
      }
    }, 5000);
  }

  public send(msg: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('WS: Not connected. Message dropped:', msg);
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