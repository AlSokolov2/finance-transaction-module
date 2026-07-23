import { DataSource } from "typeorm";
import { Order } from "../../orders/order.entity";
import { Payment } from "../../payments/payment.entity";

const SEED_ORDERS = [
  { totalAmount: 15000.0 },
  { totalAmount: 8500.0 },
  { totalAmount: 22000.0 },
  { totalAmount: 5700.0 },
  { totalAmount: 31000.0 },
  { totalAmount: 12500.0 },
  { totalAmount: 9900.0 },
  { totalAmount: 45000.0 },
  { totalAmount: 6750.0 },
  { totalAmount: 18300.0 },
  { totalAmount: 2750.0 },
  { totalAmount: 38900.0 },
];

async function seed() {
  const ds = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    username: process.env.DATABASE_USER || "finance_user",
    password: process.env.DATABASE_PASSWORD || "finance_pass",
    database: process.env.DATABASE_NAME || "finance",
    entities: [Order, Payment],
    synchronize: true,
  });

  await ds.initialize();
  const repo = ds.getRepository(Order);

  const existing = await repo.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} orders, skipping seed.`);
    await ds.destroy();
    return;
  }

  for (const o of SEED_ORDERS) {
    await repo.save(repo.create({ totalAmount: o.totalAmount }));
  }

  console.log(`Seeded ${SEED_ORDERS.length} orders.`);
  await ds.destroy();
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
