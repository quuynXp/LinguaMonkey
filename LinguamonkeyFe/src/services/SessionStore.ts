export class SessionStore {
  static currentSessionId: string | null = null;
  static pendingChunks: any[] = [];

  static setSession(id: string) {
    this.currentSessionId = id;
  }

  static getSession() {
    return this.currentSessionId;
  }

  static addPending(chunk: any) {
    this.pendingChunks.push(chunk);
  }

  static drainPending() {
    const chunks = [...this.pendingChunks];
    this.pendingChunks = [];
    return chunks;
  }
}
