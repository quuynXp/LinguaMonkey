import { v4 as uuidv4 } from "uuid";

export interface VoiceChunkPayload {
  session_id: string;
  seq: number;
  is_last: boolean;
  timestamp: number;
  audio_chunk: string;
}

export interface ServerResponse {
  seq: number;
  text: string;
  detected_lang?: string;
  translated_text?: string;
}

type OnMessageCallback = (data: ServerResponse) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId = uuidv4();
  private seq = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect(jwtToken: string, onMessage: OnMessageCallback) {
    const wsUrl = `wss://your-python-server/ws/voice?token=${jwtToken}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => console.log("✅ WebSocket connected");

    this.ws.onmessage = (event: WebSocketMessageEvent) => {
      try {
        const data: ServerResponse = JSON.parse(event.data);
        onMessage?.(data);
      } catch (err) {
        console.error("⚠️ Invalid WS message:", err);
      }
    };

    this.ws.onclose = () => {
      console.warn("⚠️ WebSocket closed, retrying in 3s...");
      this.reconnectTimeout = setTimeout(
        () => this.connect(jwtToken, onMessage),
        3000
      );
    };
  }

  sendChunk(base64Chunk: string, isLast = false) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const payload: VoiceChunkPayload = {
      session_id: this.sessionId,
      seq: this.seq++,
      is_last: isLast,
      timestamp: Date.now(),
      audio_chunk: base64Chunk,
    };

    this.ws.send(JSON.stringify(payload));
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws?.close();
  }
}

export default new WebSocketService();