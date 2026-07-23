export interface OrderReportRow {
  orderId: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: string;
}

export interface OrderReportDto {
  orders: OrderReportRow[];
  totals: {
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  };
}
