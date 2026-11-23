import { createApp } from "./app";
import { env } from "./config/env";
import { db } from "./infrastructure/database/prisma-client";

const app = createApp().listen(env.PORT);
console.log(`PVMS API listening on http://localhost:${env.PORT}`);
const shutdown = async () => {
  app.stop();
  await db.$disconnect();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
