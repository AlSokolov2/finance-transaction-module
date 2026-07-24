import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseModule } from "./database/database.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST || "localhost",
      port: parseInt(process.env.DATABASE_PORT || "5432", 10),
      username: process.env.DATABASE_USER || "finance_user",
      password: process.env.DATABASE_PASSWORD || "finance_pass",
      database: process.env.DATABASE_NAME || "finance",
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== "production",
      logging: false,
    }),
    DatabaseModule,
    RedisModule,
    OrdersModule,
    PaymentsModule,
  ],
})
export class AppModule {}
