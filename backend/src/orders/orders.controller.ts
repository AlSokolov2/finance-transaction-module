import { Controller, Get } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrderReportDto } from "./dto/report.dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("report")
  async getReport(): Promise<OrderReportDto> {
    return this.ordersService.getReport();
  }
}
