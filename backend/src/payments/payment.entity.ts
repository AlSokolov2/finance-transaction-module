import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "order_id", type: "uuid" })
  orderId: string;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount: number;

  @Index("payments_idempotency_idx")
  @Column({ name: "idempotency_key", type: "varchar", length: 64, unique: true })
  idempotencyKey: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
