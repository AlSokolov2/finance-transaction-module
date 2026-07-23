import { OrderStatus } from "../../orders/order.entity";

export class PaymentResponseDto {
  paymentId: string;
  orderId: string;
  amount: number;
  orderStatus: OrderStatus;
  remainingBalance: number;

  static from(
    paymentId: string,
    orderId: string,
    amount: number,
    status: OrderStatus,
    remaining: number
  ): PaymentResponseDto {
    return {
      paymentId,
      orderId,
      amount,
      orderStatus: status,
      remainingBalance: remaining,
    };
  }
}
