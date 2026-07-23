import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type OrderStatus = "pending" | "partially_paid" | "paid";

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "decimal", precision: 15, scale: 2, name: "total_amount" })
  totalAmount: number;

  @Column({
    type: "varchar",
    length: 20,
    default: "pending",
  })
  status: OrderStatus;

  @Column({ type: "decimal", precision: 15, scale: 2, name: "paid_amount", default: 0.0 })
  paidAmount: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
