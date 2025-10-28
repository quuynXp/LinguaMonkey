// VoiceStreamService.ts
import { Audio } from "expo-audio";
import { encode } from "base64-arraybuffer";
import WebSocketService from "./WebSocketService";

class VoiceStreamService {
  private recording: Audio.Recording | null = null;
  private streamInterval: NodeJS.Timeout | null = null;

  async startRecording() {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") throw new Error("Microphone permission denied");

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    console.log("🎤 Start recording...");
    this.recording = new Audio.Recording();
    await this.recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    await this.recording.startAsync();

    this.streamInterval = setInterval(async () => {
      if (!this.recording) return;
      const uri = this.recording.getURI();
      if (!uri) return;

      const response = await fetch(uri);
      const buffer = await response.arrayBuffer();
      const base64Chunk = encode(buffer.slice(-10000)); // gửi phần mới
      WebSocketService.sendChunk(base64Chunk);
    }, 1000);
  }

  async stopRecording() {
    if (!this.recording) return;

    console.log("🛑 Stop recording...");
    await this.recording.stopAndUnloadAsync();

    if (this.streamInterval) clearInterval(this.streamInterval);
    WebSocketService.sendChunk("", true);
  }
}

export default new VoiceStreamService();
