import { Elysia } from "elysia";
import { ZodError } from "zod";

import { db } from "./infrastructure/database/prisma-client";
import { AppError } from "./shared/errors/app-error";
import { authRoutes } from "./features/authentication/handler/auth.handler";
import { adminRoutes } from "./features/administration/handler/admin.handler";
import { masterRoutes } from "./features/master-data/handler/master.handler";
import { requestRoutes } from "./features/purchase-requests/handler/request.handler";
import { sourcingRoutes } from "./features/sourcing/handler/sourcing.handler";
import { orderRoutes } from "./features/purchase-orders/handler/order.handler";
import { receivingRoutes } from "./features/receiving/handler/receiving.handler";
import { invoiceRoutes } from "./features/invoices/handler/invoice.handler";
import { budgetsRoutes } from "./features/budgets/handler/budgets.handler";
import { reportsRoutes } from "./features/reports/handler/reports.handler";
import { attachmentRoutes } from "./features/attachments/handler/attachments.handler";
import { notificationRoutes } from "./features/notifications/handler/notifications.handler";

export function createApp() {
  return new Elysia()
    .onError(({ error, set, request }) => {
      const id = crypto.randomUUID();
      set.headers["content-type"] = "application/problem+json";
      set.headers["x-request-id"] = id;
      if (error instanceof AppError) {
        set.status = error.status;
        return {
          type: `urn:pvms:${error.code}`,
          title: error.code,
          status: error.status,
          detail: error.message,
          instance: new URL(request.url).pathname,
          code: error.code,
          requestId: id,
          fieldErrors: error.fieldErrors,
        };
      }
      if (error instanceof ZodError) {
        set.status = 422;
        return {
          type: "urn:pvms:VALIDATION_FAILED",
          title: "Validation failed",
          status: 422,
          detail: "Please correct invalid fields",
          code: "VALIDATION_FAILED",
          fieldErrors: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          requestId: id,
        };
      }
      const code = (
        error as {
          code?: string;
        }
      ).code;
      if (code === "P2002") {
        set.status = 409;
        return {
          type: "urn:pvms:DUPLICATE_RESOURCE",
          title: "Duplicate resource",
          status: 409,
          detail: "Resource already exists",
          code: "DUPLICATE_RESOURCE",
          requestId: id,
        };
      }
      if (code === "P2025") {
        set.status = 404;
        return {
          type: "urn:pvms:NOT_FOUND",
          title: "Not found",
          status: 404,
          detail: "Resource not found",
          code: "NOT_FOUND",
          requestId: id,
        };
      }
      console.error(
        "Unexpected request error",
        id,
        error instanceof Error ? error.message : String(error),
      );
      set.status = 500;
      return {
        type: "about:blank",
        title: "Internal server error",
        status: 500,
        detail: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
        requestId: id,
      };
    })
    .get("/health/live", () => ({ status: "alive" }))
    .get("/health/ready", async ({ set }) => {
      try {
        await db.$queryRaw`SELECT 1`;
        return { status: "ready" };
      } catch {
        set.status = 503;
        return { status: "unavailable" };
      }
    })
    .group("/api/v1", (app) =>
      app
        .use(authRoutes)
        .use(adminRoutes)
        .use(masterRoutes)
        .use(requestRoutes)
        .use(sourcingRoutes)
        .use(orderRoutes)
        .use(receivingRoutes)
        .use(invoiceRoutes)
        .use(budgetsRoutes)
        .use(reportsRoutes)
        .use(attachmentRoutes)
        .use(notificationRoutes),
    );
}
