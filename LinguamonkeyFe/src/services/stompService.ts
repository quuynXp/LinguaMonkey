import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useTokenStore } from '../stores/tokenStore';
import { API_BASE_URL } from '../api/apiConfig';

const KONG_BASE_URL = API_BASE_URL;

export type StompMessageCallback = (message: any) => void;
export type StompHook = (client?: Client) => void;

export class StompService {
  private client: Client;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private pendingSubscriptions: { destination: string, callback: StompMessageCallback }[] = [];
  private pendingPublishes: { destination: string, body: any }[] = [];
  private connected = false;

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${KONG_BASE_URL}/ws/`),
      reconnectDelay: 5000,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 10000,
    });

    this.client.onConnect = (frame) => {
      console.log('✅ [STOMP] Connected', frame);
      this.connected = true;
      this.flushPending();
    };

    this.client.onStompError = (frame) => {
      console.error('❌ [STOMP] Error', frame.headers?.message, frame.body);
    };

    this.client.onWebSocketClose = (evt) => {
      console.log('🔌 [STOMP] WebSocket closed', evt);
      this.connected = false;
      this.subscriptions.forEach((sub, dest) => {
        try { sub.unsubscribe(); } catch (_) { }
      });
      this.subscriptions.clear();
    };
  }

  private getTokenHeader() {
    const token = useTokenStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  public connect(onConnected?: StompHook, onError?: (err: any) => void): void {
    const token = useTokenStore.getState().accessToken;

    if (!token) {
      console.warn('⚠️ [STOMP] No access token, aborting connect');
      return;
    }

    if (this.client.active) {
      console.log('ℹ️ [STOMP] Already active');
      onConnected?.(this.client);
      return;
    }

    console.log('🔄 [STOMP] Connecting with token:', token.substring(0, 20) + '...');

    this.client.configure({
      connectHeaders: this.getTokenHeader(),
      debug: (str) => {
        // Uncomment for deep debugging
        // console.debug('🐛 [STOMP]', str); 
      },
      onConnect: (frame) => {
        this.connected = true;
        console.log('✅ [STOMP] Connected successfully');
        this.flushPending();
        onConnected?.(this.client);
      },
      onStompError: (frame) => {
        console.error('❌ [STOMP] Error frame:', frame);
        onError?.(frame);
      },
      onDisconnect: () => {
        this.connected = false;
        console.log('🔌 [STOMP] Disconnected');
      },
    });

    this.client.activate();
  }

  public disconnect(): void {
    try {
      this.client.deactivate();
    } catch (e) {
      console.warn('⚠️ [STOMP] Disconnect error', e);
    }
    this.connected = false;
    this.subscriptions.clear();
    this.pendingPublishes = [];
    this.pendingSubscriptions = [];
  }

  private flushPending() {
    console.log(`📋 [STOMP] Flushing ${this.pendingSubscriptions.length} subscriptions, ${this.pendingPublishes.length} publishes`);

    const subs = [...this.pendingSubscriptions];
    this.pendingSubscriptions = [];
    subs.forEach(s => {
      try {
        this.subscribe(s.destination, s.callback);
      } catch (e) {
        console.warn('⚠️ [STOMP] Failed to flush subscription', s.destination, e);
      }
    });

    const pubs = [...this.pendingPublishes];
    this.pendingPublishes = [];
    pubs.forEach(p => {
      try {
        this.publish(p.destination, p.body);
      } catch (e) {
        console.warn('⚠️ [STOMP] Failed to flush publish', p.destination, e);
      }
    });
  }

  public subscribe(destination: string, callback: StompMessageCallback): StompSubscription | null {
    if (this.subscriptions.has(destination)) {
      console.log(`ℹ️ [STOMP] Already subscribed to ${destination}`);
      return this.subscriptions.get(destination)!;
    }

    if (!this.client.active) {
      console.log(`📋 [STOMP] Queueing subscription to ${destination}`);
      this.pendingSubscriptions.push({ destination, callback });
      return null;
    }

    console.log(`📥 [STOMP] Subscribing to ${destination}`);

    const sub = this.client.subscribe(destination, (msg: IMessage) => {
      try {
        const parsed = msg.body ? JSON.parse(msg.body) : null;
        callback(parsed ?? msg.body);
      } catch (e) {
        try { callback(msg.body); }
        catch (_) { console.error('❌ [STOMP] Callback error', _); }
      }
    });

    this.subscriptions.set(destination, sub);
    return sub;
  }

  public unsubscribe(destination: string): void {
    const sub = this.subscriptions.get(destination);
    if (sub) {
      try {
        sub.unsubscribe();
        console.log(`🔕 [STOMP] Unsubscribed from ${destination}`);
      } catch (e) { }
      this.subscriptions.delete(destination);
    } else {
      this.pendingSubscriptions = this.pendingSubscriptions.filter(s => s.destination !== destination);
    }
  }

  public publish(destination: string, body: any): void {
    if (!this.client.active) {
      console.warn(`⚠️ [STOMP] Not connected, queueing publish to ${destination}`);
      this.pendingPublishes.push({ destination, body });
      return;
    }

    try {
      const jsonBody = JSON.stringify(body);

      console.log(`📤 [STOMP] Publishing to: ${destination}`);
      console.log(`📦 [STOMP] Payload senderId: ${body.senderId}`);
      console.log(`📦 [STOMP] Payload content length: ${body.content?.length || 0}`);
      console.log(`📦 [STOMP] Has E2EE fields: senderEphemeralKey=${!!body.senderEphemeralKey}, selfContent=${!!body.selfContent}`);
      console.log(`📄 [STOMP] JSON preview (200 chars):`, jsonBody.substring(0, 200) + '...');
      console.log(`📏 [STOMP] JSON total length: ${jsonBody.length} bytes`);

      // ✅ CRITICAL FIX: ADD HEADERS
      const headers: any = {
        'content-type': 'application/json',
        ...this.getTokenHeader()
      };

      console.log(`🔐 [STOMP] Headers:`, Object.keys(headers));

      this.client.publish({
        destination,
        body: jsonBody,
        headers: headers
      });

      console.log('✅ [STOMP] Publish completed successfully');

    } catch (e) {
      console.error('❌ [STOMP] Publish exception:', e);
      console.log('📋 [STOMP] Queueing failed publish for retry');
      this.pendingPublishes.push({ destination, body });
    }
  }

  public get isConnected(): boolean {
    return this.client.active && this.connected;
  }
}

export const stompService = new StompService();