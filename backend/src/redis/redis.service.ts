import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly IDEMPOTENCY_PREFIX = "idem:";
  private readonly DEFAULT_TTL = 86400; // 24 hours

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  }

  async getIdempotencyResult(key: string): Promise<string | null> {
    return this.redis.get(`${this.IDEMPOTENCY_PREFIX}${key}`);
  }

  async setIdempotencyResult(
    key: string,
    value: Record<string, unknown>
  ): Promise<void> {
    await this.redis.set(
      `${this.IDEMPOTENCY_PREFIX}${key}`,
      JSON.stringify(value),
      "EX",
      this.DEFAULT_TTL
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
