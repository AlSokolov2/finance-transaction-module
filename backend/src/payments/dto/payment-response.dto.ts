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
    const dto = new PaymentResponseDto();
    dto.paymentId = paymentId;
    dto.orderId = orderId;
    dto.amount = amount;
    dto.orderStatus = status;
    dto.remainingBalance = remaining;
    return dto;
  }
}
