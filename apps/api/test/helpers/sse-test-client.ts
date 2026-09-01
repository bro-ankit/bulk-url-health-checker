import * as http from 'node:http';
import type { IncomingMessage } from 'node:http';

export type ParsedSseEvent = { id?: string; event?: string; data: unknown };

export class SseTestClient {
  private buffer = '';
  private events: ParsedSseEvent[] = [];
  private waiters: { count: number; resolve: () => void }[] = [];
  private req?: http.ClientRequest;
  private res?: IncomingMessage;

  connect(url: string, headers: Record<string, string> = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      this.req = http.get(url, { headers }, (res) => {
        this.res = res;
        res.on('data', (chunk: Buffer) => this.onChunk(chunk.toString('utf8')));
        res.on('error', reject);
        resolve();
      });
      this.req.on('error', reject);
    });
  }

  waitForEvents(count: number, timeoutMs = 3000): Promise<ParsedSseEvent[]> {
    if (this.events.length >= count) return Promise.resolve(this.events.slice(0, count));

    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for ${count} SSE event(s), got ${this.events.length}`)),
        timeoutMs,
      );
      this.waiters.push({
        count,
        resolve: () => {
          clearTimeout(timer);
          resolve(this.events.slice(0, count));
        },
      });
    });
  }

  waitForClose(timeoutMs = 3000): Promise<void> {
    if (!this.res || this.res.destroyed) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Timed out waiting for the server to close the stream')),
        timeoutMs,
      );
      this.res?.once('end', () => {
        clearTimeout(timer);
        resolve();
      });
      this.res?.once('close', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  close(): void {
    this.res?.destroy();
    this.req?.destroy();
  }

  private onChunk(chunk: string): void {
    this.buffer += chunk;

    let separatorIndex: number;
    while ((separatorIndex = this.buffer.indexOf('\n\n')) !== -1) {
      const raw = this.buffer.slice(0, separatorIndex);
      this.buffer = this.buffer.slice(separatorIndex + 2);

      const event = this.parseEvent(raw);
      if (event) {
        this.events.push(event);
        this.notifyWaiters();
      }
    }
  }

  private parseEvent(raw: string): ParsedSseEvent | null {
    const dataLines: string[] = [];
    let id: string | undefined;
    let eventType: string | undefined;

    for (const line of raw.split('\n')) {
      if (line.startsWith('id:')) id = line.slice(3).trim();
      else if (line.startsWith('event:')) eventType = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }

    if (dataLines.length === 0) return null;

    const rawData = dataLines.join('\n');
    try {
      return { id, event: eventType, data: JSON.parse(rawData) };
    } catch {
      return { id, event: eventType, data: rawData };
    }
  }

  private notifyWaiters(): void {
    this.waiters = this.waiters.filter((waiter) => {
      if (this.events.length < waiter.count) return true;
      waiter.resolve();
      return false;
    });
  }
}
