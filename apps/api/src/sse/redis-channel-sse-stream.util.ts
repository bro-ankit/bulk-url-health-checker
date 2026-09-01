import type { MessageEvent } from '@nestjs/common';
import type Redis from 'ioredis';
import { Observable } from 'rxjs';

export type SseEnvelope<T extends object> = { id: string; data: T };

export type RedisChannelSseStreamOptions<T extends object> = {
  redis: Redis;
  channel: string;
  lastEventId?: string;
  getFullSnapshot: () => Promise<SseEnvelope<T>>;
  getUpdatesSince: (cursor: string) => Promise<SseEnvelope<T>[]>;
  parseMessage: (raw: string) => Promise<SseEnvelope<T>>;
};

export class RedisChannelSseStreamUtil {
  static build<T extends object>(options: RedisChannelSseStreamOptions<T>): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const subscriberClient = options.redis.duplicate();
      const seenIds = new Set<string>();
      let replaying = true;
      let buffered: SseEnvelope<T>[] = [];

      const emit = (envelope: SseEnvelope<T>) => {
        if (seenIds.has(envelope.id)) return;
        seenIds.add(envelope.id);
        subscriber.next({
          id: envelope.id,
          type: 'update',
          data: envelope.data,
        });
      };

      const onMessage = (_channel: string, message: string) => {
        options
          .parseMessage(message)
          .then((envelope) => {
            if (replaying) buffered.push(envelope);
            else emit(envelope);
          })
          .catch(() => undefined);
      };

      subscriberClient.on('message', onMessage);

      this.subscribeThenReplay(subscriberClient, options)
        .then((replayEnvelopes) => {
          replayEnvelopes.forEach(emit);
          replaying = false;
          buffered.forEach(emit);
          buffered = [];
        })
        .catch((error: unknown) => subscriber.error(error));

      return () => {
        subscriberClient.off('message', onMessage);
        subscriberClient.unsubscribe(options.channel).catch(() => undefined);
        subscriberClient.quit().catch(() => undefined);
      };
    });
  }

  private static async subscribeThenReplay<T extends object>(
    subscriberClient: Redis,
    options: RedisChannelSseStreamOptions<T>,
  ): Promise<SseEnvelope<T>[]> {
    await subscriberClient.subscribe(options.channel);

    return options.lastEventId ? options.getUpdatesSince(options.lastEventId) : [await options.getFullSnapshot()];
  }
}
