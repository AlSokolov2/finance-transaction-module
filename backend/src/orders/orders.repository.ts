import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Order } from "./order.entity";

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectDataSource()
    private readonly ds: DataSource
  ) {}

  /**
   * Acquires a pessimistic lock on the order row.
   * Must be called within an active transaction.
   */
  async findByIdForUpdate(
    queryRunner: { manager: { query: (sql: string, params: unknown[]) => Promise<unknown[]> } },
    orderId: string
  ): Promise<Order | null> {
    const rows = await queryRunner.manager.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  /**
   * Updates order paid_amount and status atomically.
   * Must be called within an active transaction.
   */
  async updatePaymentStatus(
    queryRunner: { manager: { query: (sql: string, params: unknown[]) => Promise<unknown[]> } },
    orderId: string,
    newPaidAmount: number,
    totalAmount: number
  ): Promise<Order> {
    const newStatus =
      newPaidAmount >= totalAmount
        ? "paid"
        : newPaidAmount > 0
          ? "partially_paid"
          : "pending";

    const rows = await queryRunner.manager.query(
      `UPDATE orders
       SET paid_amount = $1, status = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newPaidAmount, newStatus, orderId]
    );
    return this.mapRow(rows[0]);
  }

  async findAll(): Promise<Order[]> {
    const rows = (await this.ds.query(`SELECT * FROM orders ORDER BY created_at`)) as unknown[];
    return rows.map((r) => this.mapRow(r));
  }

  async findById(orderId: string): Promise<Order | null> {
    const rows = (await this.ds.query(`SELECT * FROM orders WHERE id = $1`, [orderId])) as unknown[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async getAggregateTotals(): Promise<{
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  }> {
    const rows = (await this.ds.query(
      `SELECT
         COALESCE(SUM(total_amount), 0)::float AS total_amount,
         COALESCE(SUM(paid_amount), 0)::float   AS total_paid
       FROM orders`
    )) as unknown[];
    const r = rows[0] as Record<string, unknown>;
    const totalAmount = r["total_amount"] as number;
    const totalPaid = r["total_paid"] as number;
    return {
      totalAmount,
      totalPaid,
      totalRemaining: totalAmount - totalPaid,
    };
  }

  private mapRow(r: unknown): Order {
    const row = r as Record<string, unknown>;
    return {
      id: row["id"] as string,
      totalAmount: parseFloat(row["total_amount"] as string),
      status: row["status"] as Order["status"],
      paidAmount: parseFloat(row["paid_amount"] as string),
      createdAt: new Date(row["created_at"] as string),
      updatedAt: new Date(row["updated_at"] as string),
      payments: [],
    } as Order;
  }
}
