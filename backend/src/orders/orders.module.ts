import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "./order.entity";
import { OrdersRepository } from "./orders.repository";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [OrdersRepository, OrdersService],
  controllers: [OrdersController],
  exports: [OrdersRepository, OrdersService],
})
export class OrdersModule {}
