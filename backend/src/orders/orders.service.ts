import { Injectable } from "@nestjs/common";
import { OrdersRepository } from "./orders.repository";
import { OrderReportDto, OrderReportRow } from "./dto/report.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepo: OrdersRepository) {}

  async getReport(): Promise<OrderReportDto> {
    const [orders, totals] = await Promise.all([
      this.ordersRepo.findAll(),
      this.ordersRepo.getAggregateTotals(),
    ]);

    const rows: OrderReportRow[] = orders.map((o) => ({
      orderId: o.id,
      totalAmount: o.totalAmount,
      paidAmount: o.paidAmount,
      remaining: o.totalAmount - o.paidAmount,
      status: o.status,
    }));

    return { orders: rows, totals };
  }
}
