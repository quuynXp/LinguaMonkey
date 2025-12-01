// services/stompService.ts
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
      // webSocketFactory is invoked when activate() is called
      webSocketFactory: () => new SockJS(`${KONG_BASE_URL}/ws/`),
      reconnectDelay: 5000,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 10000,
    });

    // attach default handlers to update connected flag
    this.client.onConnect = (frame) => {
      console.log('STOMP client onConnect', frame);
      this.connected = true;
      // process pending subscriptions & publishes
      this.flushPending();
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP error', frame.headers?.message, frame.body);
    };

    this.client.onWebSocketClose = (evt) => {
      console.log('STOMP websocket closed', evt);
      this.connected = false;
      // keep existing subscriptions map cleared — we'll re-subscribe on reconnect if needed
      this.subscriptions.forEach((sub, dest) => {
        try { sub.unsubscribe(); } catch (_) { /* ignore */ }
      });
      this.subscriptions.clear();
    };
  }

  private getTokenHeader() {
    const token = useTokenStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  public connect(onConnected?: StompHook, onError?: (err: any) => void): void {
    if (!useTokenStore.getState().accessToken) {
      console.warn('STOMP: no access token, abort connect');
      return;
    }

    if (this.client.active) {
      console.log('STOMP: client already active');
      onConnected?.(this.client);
      return;
    }

    // configure connect headers fresh each connect attempt
    this.client.configure({
      connectHeaders: this.getTokenHeader(),
      debug: (str) => { /* console.debug('STOMP debug', str); */ },
      onConnect: (frame) => {
        this.connected = true;
        console.log('STOMP connected via Kong:', frame);
        // process the queue
        this.flushPending();
        onConnected?.(this.client);
      },
      onStompError: (frame) => {
        console.error('STOMP error frame:', frame);
        onError?.(frame);
      },
      onDisconnect: () => {
        this.connected = false;
        console.log('STOMP disconnected.');
      },
    });

    this.client.activate();
  }

  public disconnect(): void {
    try {
      this.client.deactivate();
    } catch (e) {
      console.warn('STOMP disconnect error', e);
    }
    this.connected = false;
    this.subscriptions.clear();
    this.pendingPublishes = [];
    this.pendingSubscriptions = [];
  }

  private flushPending() {
    // Subscriptions
    const subs = [...this.pendingSubscriptions];
    this.pendingSubscriptions = [];
    subs.forEach(s => {
      try {
        this.subscribe(s.destination, s.callback);
      } catch (e) {
        console.warn('Failed to flush subscription', s.destination, e);
      }
    });

    // Publishes
    const pubs = [...this.pendingPublishes];
    this.pendingPublishes = [];
    pubs.forEach(p => {
      try {
        this.publish(p.destination, p.body);
      } catch (e) {
        console.warn('Failed to flush publish', p.destination, e);
      }
    });
  }

  public subscribe(destination: string, callback: StompMessageCallback): StompSubscription | null {
    // if already subscribed return existing
    if (this.subscriptions.has(destination)) {
      return this.subscriptions.get(destination)!;
    }

    if (!this.client.active) {
      // queue it
      this.pendingSubscriptions.push({ destination, callback });
      return null;
    }

    const sub = this.client.subscribe(destination, (msg: IMessage) => {
      try {
        const parsed = msg.body ? JSON.parse(msg.body) : null;
        callback(parsed ?? msg.body);
      } catch (e) {
        // If can't parse, still pass raw body
        try { callback(msg.body); } catch (_) { console.error('STOMP subscribe callback error', _); }
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
      } catch (e) { /* ignore */ }
      this.subscriptions.delete(destination);
    } else {
      // also remove from pending queue if queued
      this.pendingSubscriptions = this.pendingSubscriptions.filter(s => s.destination !== destination);
    }
  }

  public publish(destination: string, body: any): void {
    if (!this.client.active) {
      // queue for later
      this.pendingPublishes.push({ destination, body });
      return;
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.warn('STOMP publish error, queueing', e);
      this.pendingPublishes.push({ destination, body });
    }
  }

  public get isConnected(): boolean {
    return this.client.active || this.connected;
  }
}

export const stompService = new StompService();
