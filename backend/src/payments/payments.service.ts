import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { PaymentsRepository } from "./payments.repository";
import { OrdersRepository } from "../orders/orders.repository";
import { RedisService } from "../redis/redis.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentResponseDto } from "./dto/payment-response.dto";
import { OverpaymentException } from "../common/exceptions/overpayment.exception";
import { IdempotencyConflictException } from "../common/exceptions/idempotency-conflict.exception";

/**
 * Core payment processing service.
 *
 * ## Concurrency strategy: Pessimistic Locking
 *
 * Uses `SELECT ... FOR UPDATE` to serialize concurrent payments on the same order.
 * This guarantees no overpayment without client-side retry logic.
 *
 * **Why pessimistic, not optimistic:**
 * - Financial correctness > throughput. Overpaying a customer is worse than 50ms of latency.
 * - Optimistic locking requires retry logic on the client — error-prone for payment flows.
 * - `FOR UPDATE` guarantees the order row reflects all prior payments before we validate.
 *
 * ## Idempotency: Two-level defense
 *
 * | Level | Mechanism | Purpose |
 * |-------|-----------|---------|
 * | 1 (fast) | Redis cache, TTL 24h | Catch 90%+ of replays without touching the DB |
 * | 2 (reliable)| PostgreSQL UNIQUE on `idempotency_key` | Ultimate guard — even if Redis is flushed |
 *
 * Same key + same payload → 200 (idempotent replay, returns original `payment_id`).
 * Same key + different payload → 409 (conflict, prevents key reuse).
 *
 * ## Transaction atomicity
 *
 * All steps run in a single ACID transaction:
 * 1. Lock order row (`FOR UPDATE`)
 * 2. Check idempotency in DB
 * 3. Validate remaining balance
 * 4. INSERT payment
 * 5. UPDATE order (paid_amount + status)
 * 6. Cache result in Redis (outside transaction — cache failure must not roll back payment)
 *
 * If any step 1-5 fails, the entire transaction rolls back.
 * Step 6 (Redis cache) is outside the transaction intentionally:
 * a cache miss is recoverable (DB check catches it), but a payment rollback is not.
 */
@Injectable()
export class PaymentsService {
  constructor(
    @InjectDataSource()
    private readonly ds: DataSource,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly ordersRepo: OrdersRepository,
    private readonly redisService: RedisService
  ) {}

  /**
   * Processes a payment for an order.
   *
   * @throws {NotFoundException} — order does not exist
   * @throws {OverpaymentException} (409) — amount exceeds remaining balance
   * @throws {IdempotencyConflictException} (409) — key reused with different payload
   * @returns PaymentResponseDto with new status and remaining balance
   */
  async addPayment(dto: CreatePaymentDto): Promise<PaymentResponseDto> {
    // ── Step 1: Fast-path idempotency check in Redis ──
    // Avoids DB round-trip for 90%+ of idempotent replays.
    const cached = await this.redisService.getIdempotencyResult(
      dto.idempotencyKey
    );
    if (cached !== null) {
      const parsed = JSON.parse(cached) as PaymentResponseDto;
      // Verify payload matches — reject if same key but different data
      if (parsed.orderId !== dto.orderId || parsed.amount !== dto.amount) {
        throw new IdempotencyConflictException();
      }
      return parsed;
    }

    // ── Step 2: Execute payment within an ACID transaction ──
    // All DB mutations happen atomically. If anything throws, everything rolls back.
    const result = await this.ds.transaction(async (manager) => {
      const qr = { manager };

      // 2a. Acquire pessimistic lock on the order row.
      // This serializes concurrent payments: while this transaction holds the lock,
      // any other payment on the same order waits here.
      const order = await this.ordersRepo.findByIdForUpdate(qr, dto.orderId);
      if (!order) {
        throw new NotFoundException(`Order ${dto.orderId} not found`);
      }

      // 2b. DB-level idempotency check — the ultimate guard.
      // Even if Redis was flushed, the UNIQUE constraint on idempotency_key
      // guarantees at most one payment per key.
      const existingPayment = await this.paymentsRepo.findByIdempotencyKey(
        qr,
        dto.idempotencyKey
      );
      if (existingPayment) {
        if (
          existingPayment.orderId === dto.orderId &&
          existingPayment.amount === dto.amount
        ) {
          // Idempotent replay: same key, same payload → original result
          return PaymentResponseDto.from(
            existingPayment.id,
            existingPayment.orderId,
            existingPayment.amount,
            order.status,
            order.totalAmount - order.paidAmount
          );
        }
        // Same key, different payload → reject (prevents key reuse attacks)
        throw new IdempotencyConflictException();
      }

      // 2c. Validate overpayment.
      // By this point, FOR UPDATE guarantees we see the true paid_amount.
      const remaining = order.totalAmount - order.paidAmount;
      if (dto.amount > remaining) {
        throw new OverpaymentException(remaining);
      }

      // 2d. Insert immutable payment record.
      const payment = await this.paymentsRepo.create(
        qr,
        dto.orderId,
        dto.amount,
        dto.idempotencyKey
      );

      // 2e. Update order denormalized fields atomically.
      const newPaidAmount = order.paidAmount + dto.amount;
      const newStatus =
        newPaidAmount >= order.totalAmount
          ? "paid"
          : newPaidAmount > 0
            ? "partially_paid"
            : "pending";
      const newRemaining = order.totalAmount - newPaidAmount;

      await this.ordersRepo.updatePaymentStatus(
        qr,
        dto.orderId,
        newPaidAmount,
        order.totalAmount
      );

      // 2f. Return computed values (not DB result) for type-safety.
      return PaymentResponseDto.from(
        payment.id,
        dto.orderId,
        dto.amount,
        newStatus,
        newRemaining
      );
    });

    // ── Step 3: Cache successful result in Redis (outside transaction) ──
    // Intentionally outside the transaction: a cache write failure must not
    // roll back a committed payment. The DB idempotency check (step 2b) is
    // the source of truth; Redis is an optimization.
    await this.redisService.setIdempotencyResult(
      dto.idempotencyKey,
      result as unknown as Record<string, unknown>
    );

    return result;
  }
}
