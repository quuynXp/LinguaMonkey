import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useTokenStore } from '../stores/tokenStore'; // Giả sử bạn có store này
import { API_BASE_URL } from '../api/apiConfig';


const KONG_BASE_URL = API_BASE_URL;

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
        // SỬA: Dùng KONG_BASE_URL/ws/ để gọi qua Kong.
        // SockJS sẽ tự động chọn WebSocket hoặc fallback.
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
      // Gửi Authorization Header trong STOMP CONNECT frame
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
      // KHÔNG CẦN GỬI HEADER NÀY KHI PUBLISH VÌ ĐÃ CÓ PRINCIPAL TỪ CONNECT
      // headers: {
      //   Authorization: `Bearer ${token}`
      // }
    });
  }

  public get isConnected(): boolean {
    return this.client.active;
  }
}

// Xuất ra một instance duy nhất (Singleton)
export const stompService = new StompService();