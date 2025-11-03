import { useTokenStore } from '../stores/tokenStore';

const KONG_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8000";
const KONG_WS_URL = KONG_BASE_URL.replace(/^http/, 'ws');

export interface DualSubtitle {
  original: string;
  originalLang: string;
  translated: string;
  translatedLang: string;
  speakerId?: string;
}

interface SubtitleWsMessage {
  type: 'config' | 'subtitle_chunk';
  data: DualSubtitle | { targetLang: string };
}

export type SubtitleCallback = (subtitle: DualSubtitle) => void;

export class VideoSubtitleService {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;

  constructor() {
    // Giả định endpoint này cho phụ đề video call, trỏ tới Python ASR
    this.url = `${KONG_WS_URL}/ws/py/video-subtitle`; 
    this.token = useTokenStore.getState().accessToken || "";
  }

  public connect(roomId: string, targetLang: string, onSubtitle: SubtitleCallback): void {
    if (!this.token) {
      console.error("Subtitle WS: No token, connection aborted.");
      return;
    }
    
    // Gửi token, roomId và ngôn ngữ đích qua query param
    const connectUrl = `${this.url}/${roomId}?token=${encodeURIComponent(this.token)}&targetLang=${targetLang}`;
    this.ws = new WebSocket(connectUrl);

    this.ws.onopen = () => console.log('✅ Subtitle WS connected');
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as SubtitleWsMessage;
        if (msg.type === 'subtitle_chunk') {
          onSubtitle(msg.data as DualSubtitle);
        }
      } catch {}
    };
    this.ws.onerror = (e: any) => console.log('❌ Subtitle WS error', e?.message || e);
    this.ws.onclose = () => console.log('Subtitle WS disconnected');
  }

  public updateTargetLanguage(lang: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'config',
        data: { targetLang: lang }
      }));
    }
  }

  public disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}

