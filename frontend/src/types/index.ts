export type OrderStatus = "pending" | "partially_paid" | "paid";

export interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  idempotencyKey: string;
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  orderStatus: OrderStatus;
  remainingBalance: number;
}

export interface OrderReportRow {
  orderId: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: OrderStatus;
}

export interface OrderReport {
  orders: OrderReportRow[];
  totals: {
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  };
}
