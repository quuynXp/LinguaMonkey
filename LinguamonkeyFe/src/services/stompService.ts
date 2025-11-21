import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useTokenStore } from '../stores/tokenStore'; // Giả sử bạn có store này

// Lấy URL của Kong từ .env
const KONG_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8000";
// Chuyển đổi http:// thành ws:// (hoặc https:// thành wss://)
const KONG_WS_URL = KONG_BASE_URL.replace(/^http/, 'ws');

// Định nghĩa các kiểu callback
export type StompMessageCallback = (message: any) => void;
export type StompHook = (client: Client) => void;

export class StompService {
  private client: Client;
  private subscriptions: Map<string, StompSubscription> = new Map();

  constructor() {
    this.client = new Client({
      // Dùng SockJS vì BE Java (WebSocketConfig) đang dùng .withSockJS()
      webSocketFactory: () => {
        // Trỏ đến route /ws/ của Kong mà ta đã cấu hình
        return new SockJS(`${KONG_BASE_URL}/ws/`);
      },
      reconnectDelay: 10000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });
  }

  public connect(onConnected?: StompHook): void {
    const token = useTokenStore.getState().accessToken;
    if (!token) {
      console.error("STOMP: No token, connection aborted.");
      return;
    }

    if (this.client.active) {
      console.log("STOMP: Already connected.");
      return;
    }

    this.client.configure({
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: (frame) => {
        console.log('✅ STOMP connected via Kong:', frame);
        onConnected?.(this.client);
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message'], frame.body);
      },
      onDisconnect: () => {
        console.log('STOMP disconnected.');
      },
    });

    this.client.activate();
  }

  public disconnect(): void {
    this.client.deactivate();
    this.subscriptions.clear();
  }

  public subscribe(destination: string, callback: StompMessageCallback): StompSubscription | null {
    if (!this.client.active) {
      console.warn("STOMP: Client not active. Cannot subscribe.");
      return null;
    }

    if (this.subscriptions.has(destination)) {
      console.log(`STOMP: Already subscribed to ${destination}`);
      return this.subscriptions.get(destination)!;
    }

    const sub = this.client.subscribe(destination, (msg: IMessage) => {
      try {
        callback(JSON.parse(msg.body));
      } catch (e) {
        console.error("STOMP: Failed to parse JSON message", e);
      }
    });

    this.subscriptions.set(destination, sub);
    return sub;
  }

  public unsubscribe(destination: string): void {
    const sub = this.subscriptions.get(destination);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  public publish(destination: string, body: any): void {
    if (!this.client.active) {
      console.warn("STOMP: Client not active. Cannot publish.");
      return;
    }

    const token = useTokenStore.getState().accessToken;
    this.client.publish({
      destination,
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  public get isConnected(): boolean {
    return this.client.active;
  }
}

// Xuất ra một instance duy nhất (Singleton)
export const stompService = new StompService();