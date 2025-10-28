// services/WebSocketService.ts
import { AppState } from 'react-native';

interface WSMessage {
  type: string;
  data?: any;
  session_id?: string;
  seq?: number;
  timestamp?: number;
  is_last?: boolean;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectInterval?: ReturnType<typeof setTimeout>;
  private onMessageCallback?: (msg: WSMessage) => void;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
    this.connect();
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private connect() {
    this.ws = new WebSocket(`${this.url}?token=${encodeURIComponent(this.token)}`);

    this.ws.onopen = () => console.log('✅ WS connected');
    this.ws.onclose = () => this.reconnect();
    this.ws.onerror = (e: any) => console.log('❌ WS error', e?.message || e);
    this.ws.onmessage = (e) => {
      if (this.onMessageCallback && e.data) {
        try {
          const msg = JSON.parse(e.data);
          this.onMessageCallback(msg);
        } catch {}
      }
    };
  }

  private reconnect() {
    clearTimeout(this.reconnectInterval);
    this.reconnectInterval = setTimeout(() => {
      console.log('♻️ Reconnecting WS...');
      this.connect();
    }, 3000);
  }

  private handleAppStateChange = (state: string) => {
    if (state === 'active' && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
      this.connect();
    }
  };

  send(msg: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(callback: (msg: WSMessage) => void) {
    this.onMessageCallback = callback;
  }

  close() {
    clearTimeout(this.reconnectInterval);
    this.ws?.close();
  }
}
