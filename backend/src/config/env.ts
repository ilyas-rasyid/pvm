import { config } from "dotenv";
import { resolve } from "node:path";

config();
config({ path: resolve(import.meta.dir, "../../.env") });
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_ORIGIN: z.string().url().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  ATTACHMENT_DIR: z.string().default("./.private-uploads"),
});

export const env = schema.parse(process.env);
if (env.NODE_ENV === "production" && env.COOKIE_SECURE !== "true") {
  throw new Error("Production requires COOKIE_SECURE=true");
}
