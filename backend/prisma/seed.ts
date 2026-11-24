import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo seed is not permitted in production");
}
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 15) {
  throw new Error("Set DEMO_PASSWORD to a non-production password with at least 15 characters");
}
const url = process.env.DATABASE_URL;
if (!url || !url.includes("pvms_dev")) {
  throw new Error("Refusing seed outside pvms_dev");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const org = await db.organization.upsert({
  where: { code: "PVMS_DEMO" },
  update: {},
  create: { code: "PVMS_DEMO", name: "Meridian Operations (Demo)", timezone: "Asia/Makassar" },
});
const dept = await db.department.upsert({
  where: { code: "OPS" },
  update: {},
  create: { code: "OPS", name: "Operations", organizationId: org.id },
});
const roles = [
  "EMPLOYEE",
  "DEPARTMENT_MANAGER",
  "PROCUREMENT_OFFICER",
  "RECEIVING_OFFICER",
  "FINANCE_OFFICER",
  "ADMIN",
];
const hash = await Bun.password.hash(password, {
  algorithm: "argon2id",
  memoryCost: 19456,
  timeCost: 2,
});
const people = [];
for (const role of roles) {
  const email = `${role.toLowerCase().replaceAll("_", "-")}@pvms.demo`;
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      organizationId: org.id,
      departmentId: dept.id,
      email,
      name: role
        .toLowerCase()
        .split("_")
        .map((x) => x[0].toUpperCase() + x.slice(1))
        .join(" "),
      role,
      passwordHash: hash,
      mustChangePassword: false,
    },
  });
  people.push(user);
}
const manager = people.find((u) => u.role === "DEPARTMENT_MANAGER")!;
await db.department.update({ where: { id: dept.id }, data: { managerId: manager.id } });
const cc = await db.costCenter.upsert({
  where: { code: "OPS-001" },
  update: {},
  create: { code: "OPS-001", name: "Operations General", departmentId: dept.id },
});
const period = await db.fiscalPeriod.upsert({
  where: { code: "FY2026" },
  update: {},
  create: { code: "FY2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
});
const budget = await db.budgetAccount.upsert({
  where: { costCenterId_fiscalPeriodId: { costCenterId: cc.id, fiscalPeriodId: period.id } },
  update: { allocated: "10000000000.00" },
  create: {
    costCenterId: cc.id,
    fiscalPeriodId: period.id,
    allocated: "10000000000.00",
  },
});
await db.budgetMovement.upsert({
  where: { eventKey: `budget.seed.${budget.id}` },
  update: { deltaAllocated: "10000000000.00" },
  create: {
    budgetAccountId: budget.id,
    eventKey: `budget.seed.${budget.id}`,
    kind: "INITIAL_ALLOCATION",
    sourceId: budget.id,
    deltaAllocated: "10000000000.00",
    deltaCommitted: "0",
    deltaVerified: "0",
    actorId: people.find((x) => x.role === "ADMIN")!.id,
  },
});
await db.vendor.upsert({
  where: { code: "VN-001" },
  update: {},
  create: {
    code: "VN-001",
    name: "Nusantara Office Supplies",
    email: "vendor@example.test",
    active: true,
  },
});
await db.vendor.upsert({
  where: { code: "VN-002" },
  update: {},
  create: {
    code: "VN-002",
    name: "Pacific Tech Solutions",
    email: "quotes@example.test",
    active: true,
  },
});
await db.itemCategory.upsert({
  where: { code: "EQUIPMENT" },
  update: {},
  create: { code: "EQUIPMENT", name: "Office Equipment" },
});
await db.deliveryLocation.upsert({
  where: { code: "HQ" },
  update: {},
  create: { code: "HQ", name: "Head Office", address: "Demo warehouse — not a real address" },
});
await db.procurementPolicy.upsert({
  where: { version: 1 },
  update: {},
  create: { version: 1, directPurchaseThreshold: "5000000.00", directPurchaseEnabled: true },
});
console.log("Demo environment seeded.");
console.log("Demo role emails:");
for (const x of people) {
  console.log(`  ${x.email} (${x.role})`);
}
console.log("Use the DEMO_PASSWORD environment variable; password is never printed.");
await db.$disconnect();
