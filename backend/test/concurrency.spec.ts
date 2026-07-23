/**
 * Concurrency tests for the Payments module.
 *
 * These tests verify:
 * 1. No overpayment under concurrent requests
 * 2. Idempotent replay returns original result
 * 3. Idempotency key reused with different payload is rejected
 *
 * Requires running PostgreSQL and Redis.
 * Run: DATABASE_HOST=localhost REDIS_HOST=localhost npm test
 */
import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import axios, { AxiosInstance } from "axios";
import { DataSource } from "typeorm";
import { Order } from "../src/orders/order.entity";
import { Payment } from "../src/payments/payment.entity";
import { v4 as uuidv4 } from "uuid";

const API_URL = "http://localhost:3000/api/v1";

let api: AxiosInstance;
let ds: DataSource;
let testOrderId: string;

beforeAll(async () => {
  api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
  });

  // Connect to DB and ensure tables exist
  ds = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    username: process.env.DATABASE_USER || "finance_user",
    password: process.env.DATABASE_PASSWORD || "finance_pass",
    database: process.env.DATABASE_NAME || "finance",
    entities: [Order, Payment],
    synchronize: false, // tables already exist from backend
  });
  await ds.initialize();

  // Create a fresh test order
  const repo = ds.getRepository(Order);
  const order = repo.create({ totalAmount: 10000.0, status: "pending", paidAmount: 0.0 });
  const saved = await repo.save(order);
  testOrderId = saved.id;

  console.log(`Test order created: ${testOrderId}`);
}, 30000);

afterAll(async () => {
  // Clean up test data
  if (ds && ds.isInitialized) {
    await ds.getRepository(Payment).delete({ orderId: testOrderId });
    await ds.getRepository(Order).delete({ id: testOrderId });
    await ds.destroy();
  }
});

describe("POST /api/v1/payments — Concurrency", () => {
  /**
   * Test 1: Concurrent payments on the same order must not overpay.
   *
   * Scenario: 5 parallel requests, each paying 4000 on a 10000 order.
   * Expected: only 2 full payments succeed (4000+4000=8000),
   *           third succeeds for remaining 2000,
   *           remaining 2 fail with 409 (overpayment).
   *           Total paid_amount ≤ total_amount.
   */
  it("prevents overpayment under concurrent requests", async () => {
    const PAYMENT_AMOUNT = 4000;
    const CONCURRENCY = 5;

    const requests = Array.from({ length: CONCURRENCY }, () =>
      api
        .post("/payments", {
          orderId: testOrderId,
          amount: PAYMENT_AMOUNT,
          idempotencyKey: uuidv4(),
        })
        .then((r) => ({ status: "fulfilled", data: r.data }))
        .catch((e) => ({
          status: "rejected",
          message: e.response?.data?.message || e.message,
          httpStatus: e.response?.status,
        }))
    );

    const results = await Promise.all(requests);

    // Count successes vs failures
    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    console.log(
      `Successes: ${successes.length}, Failures: ${failures.length}`
    );

    // Verify: total paid across successful payments ≤ 10000
    const totalPaid = successes.reduce(
      (sum, r) => sum + (r as { data: { amount: number } }).data.amount,
      0
    );
    expect(totalPaid).toBeLessThanOrEqual(10000);

    // Verify: failures are 409 Conflict (overpayment)
    failures.forEach((f) => {
      expect(f.httpStatus).toBe(409);
    });

    // Verify database state
    const order = await ds.getRepository(Order).findOneBy({ id: testOrderId });
    expect(order).not.toBeNull();
    expect(Number(order!.paidAmount)).toBe(totalPaid);
    expect(Number(order!.paidAmount)).toBeLessThanOrEqual(
      Number(order!.totalAmount)
    );
  }, 20000);

  /**
   * Test 2: Same idempotency key replayed returns the original result.
   *
   * Scenario: Send payment with key X, then send the SAME request again.
   * Expected: Both return 200, identical payment_id, no duplicate INSERT.
   */
  it("replays idempotent request and returns original result", async () => {
    // First create a fresh order to isolate this test
    const repo = ds.getRepository(Order);
    const freshOrder = repo.create({
      totalAmount: 5000.0,
      status: "pending",
      paidAmount: 0.0,
    });
    const saved = await repo.save(freshOrder);
    const orderId = saved.id;

    const idemKey = uuidv4();
    const payload = { orderId, amount: 2000, idempotencyKey: idemKey };

    try {
      // First request
      const res1 = await api.post("/payments", payload);
      expect(res1.status).toBe(200);
      expect(res1.data.paymentId).toBeTruthy();

      // Second request — same idempotency key, same payload
      const res2 = await api.post("/payments", payload);
      expect(res2.status).toBe(200);

      // Must return the SAME payment_id
      expect(res2.data.paymentId).toBe(res1.data.paymentId);
      expect(res2.data.amount).toBe(res1.data.amount);
      expect(res2.data.orderStatus).toBe(res1.data.orderStatus);

      // Verify no duplicate in DB
      const payments = await ds.getRepository(Payment).findBy({
        idempotencyKey: idemKey,
      });
      expect(payments.length).toBe(1);
    } finally {
      await ds.getRepository(Payment).delete({ orderId });
      await ds.getRepository(Order).delete({ id: orderId });
    }
  }, 15000);

  /**
   * Test 3: Idempotency key reused with DIFFERENT payload is rejected.
   *
   * Scenario: Send payment with key X and amount 1000,
   *           then send payment with same key X but different amount.
   * Expected: Second request returns 409 Conflict.
   */
  it("rejects idempotency key reused with different payload", async () => {
    const repo = ds.getRepository(Order);
    const freshOrder = repo.create({
      totalAmount: 8000.0,
      status: "pending",
      paidAmount: 0.0,
    });
    const saved = await repo.save(freshOrder);
    const orderId = saved.id;

    const idemKey = uuidv4();

    try {
      // First request
      const res1 = await api.post("/payments", {
        orderId,
        amount: 1000,
        idempotencyKey: idemKey,
      });
      expect(res1.status).toBe(200);

      // Second request — same key, DIFFERENT amount
      try {
        await api.post("/payments", {
          orderId,
          amount: 2000, // different!
          idempotencyKey: idemKey,
        });
        // Should not reach here
        expect.unreachable("Expected 409 Conflict, but request succeeded");
      } catch (e: unknown) {
        const axiosErr = e as { response?: { status: number; data: { message: string } } };
        expect(axiosErr.response?.status).toBe(409);
        expect(axiosErr.response?.data?.message).toContain(
          "Idempotency key already used with different payload"
        );
      }

      // Verify only ONE payment exists
      const payments = await ds.getRepository(Payment).findBy({
        idempotencyKey: idemKey,
      });
      expect(payments.length).toBe(1);
    } finally {
      await ds.getRepository(Payment).delete({ orderId });
      await ds.getRepository(Order).delete({ id: orderId });
    }
  }, 15000);
});
