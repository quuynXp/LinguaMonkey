import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { Platform } from 'react-native';
import { WebSocketService } from './WebSocketService';
import { SessionStore } from './SessionStore';

export class VoiceStreamService {
  private recorder = new (AudioRecorderPlayer as any);
  private ws: WebSocketService;
  private isRecording = false;
  private seq = 0;
  private sessionId: string;

  constructor(ws: WebSocketService, sessionId: string) {
    this.ws = ws;
    this.sessionId = sessionId;
    SessionStore.setSession(sessionId);
  }

  async startRecording() {
    if (this.isRecording) return;
    this.isRecording = true;
    const path = Platform.select({
      ios: 'voice.m4a',
      android: '/sdcard/voice.mp4',
    });

    await this.recorder.startRecorder(path);
    console.log("Start recording...")

    this.recorder.addRecordBackListener((e) => {
      if (!this.isRecording) return;

      const amplitude = e.currentMetering || 0;
      const chunk = this.floatToBase64(e.currentMetering || 0);
      this.ws.send({
        type: 'voice_chunk',
        session_id: this.sessionId,
        seq: this.seq++,
        data: chunk,
        timestamp: Date.now(),
      });
    });
  }

  async stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    await this.recorder.stopRecorder();
    this.recorder.removeRecordBackListener();
    this.ws.send({
      type: 'voice_chunk',
      session_id: this.sessionId,
      seq: this.seq,
      is_last: true,
      timestamp: Date.now(),
    });

    console.log("Stop recording")
  }

  private floatToBase64(value: number): string {
    const buffer = new ArrayBuffer(4);
    new Float32Array(buffer)[0] = value;
    return Buffer.from(buffer).toString('base64');
  }
}
