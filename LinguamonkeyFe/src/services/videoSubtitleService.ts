import { useTokenStore } from "../stores/tokenStore";
import { API_BASE_URL } from "../api/apiConfig";

const KONG_BASE_URL = API_BASE_URL;
const WS_URL = KONG_BASE_URL.replace(/^http/, 'ws');

export interface DualSubtitle {
  original: string;
  translated: string;
  originalLang: string;
  translatedLang: string;
}

export class VideoSubtitleService {
  private ws: WebSocket | null = null;
  private onSubtitle?: (subtitle: DualSubtitle) => void;

  public connect(
    roomId: string,
    targetLang: string,
    onSubtitle: (sub: DualSubtitle) => void
  ) {
    const token = useTokenStore.getState().accessToken;
    if (!token) return;

    // Connect tới endpoint Python: /ws/live-subtitles
    // (Lưu ý: route này phải được define trong main.py của Python)
    const url = `${WS_URL}/ws/py/live-subtitles?token=${encodeURIComponent(token)}&roomId=${roomId}&nativeLang=${targetLang}`;

    this.ws = new WebSocket(url);
    this.onSubtitle = onSubtitle;

    this.ws.onopen = () => console.log("🎙️ Subtitle WS Connected");

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'subtitle' && this.onSubtitle) {
          this.onSubtitle({
            original: data.original,
            translated: data.translated,
            originalLang: data.originalLang,
            translatedLang: data.translatedLang
          });
        }
      } catch (e) {
        console.error("Subtitle parse error", e);
      }
    };

    this.ws.onerror = (e) => console.error("Subtitle WS Error", e);
  }

  public sendAudioChunk(base64Audio: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ audio_chunk: base64Audio }));
    }
  }

  public updateTargetLanguage(lang: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'config', targetLang: lang }));
    }
  }

  public disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}