import { Injectable } from "@nestjs/common";
import { Payment } from "./payment.entity";

@Injectable()
export class PaymentsRepository {

  /**
   * Checks if an idempotency key already exists in the payments table.
   * This is the ultimate guard — DB UNIQUE constraint backs it up.
   */
  async findByIdempotencyKey(
    queryRunner: { manager: { query: (sql: string, params: unknown[]) => Promise<unknown[]> } },
    key: string
  ): Promise<Payment | null> {
    const rows = await queryRunner.manager.query(
      `SELECT * FROM payments WHERE idempotency_key = $1`,
      [key]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  /**
   * Inserts a new payment. Must be called within an active transaction.
   * DB UNIQUE constraint on idempotency_key is the final guard.
   */
  async create(
    queryRunner: { manager: { query: (sql: string, params: unknown[]) => Promise<unknown[]> } },
    orderId: string,
    amount: number,
    idempotencyKey: string
  ): Promise<Payment> {
    const rows = await queryRunner.manager.query(
      `INSERT INTO payments (order_id, amount, idempotency_key)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [orderId, amount, idempotencyKey]
    );
    return this.mapRow(rows[0]);
  }

  private mapRow(r: unknown): Payment {
    const row = r as Record<string, unknown>;
    return {
      id: row["id"] as string,
      orderId: row["order_id"] as string,
      amount: parseFloat(row["amount"] as string),
      idempotencyKey: row["idempotency_key"] as string,
      createdAt: new Date(row["created_at"] as string),
    } as Payment;
  }
}
