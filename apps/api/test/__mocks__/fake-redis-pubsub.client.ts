type MessageHandler = (channel: string, message: string) => void;

export class FakeRedisPubSubClient {
  subscribedChannels: string[] = [];
  private handlers: MessageHandler[] = [];

  duplicate = (): FakeRedisPubSubClient => this;

  subscribe = vi.fn(async (channel: string): Promise<void> => {
    this.subscribedChannels.push(channel);
  });

  unsubscribe = vi.fn(async (): Promise<void> => undefined);

  quit = vi.fn(async (): Promise<void> => undefined);

  on = vi.fn((event: string, handler: MessageHandler): void => {
    if (event === 'message') this.handlers.push(handler);
  });

  off = vi.fn((event: string, handler: MessageHandler): void => {
    if (event === 'message') this.handlers = this.handlers.filter((h) => h !== handler);
  });

  publish(channel: string, message: string): void {
    this.handlers.forEach((handler) => handler(channel, message));
  }
}
