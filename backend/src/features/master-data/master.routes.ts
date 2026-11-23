import { Elysia } from "elysia";
import { z } from "zod";
import { db } from "../../infrastructure/database/prisma-client";
import { secureActor } from "../../security/session";
import { response, collection, pageParams } from "../../shared/http/context";
import { command, event } from "../../shared/transactions/transaction";
import { assert } from "../../shared/errors/app-error";
import { dec } from "../../shared/finance/money";

const vendorSchema = z
  .object({
    code: z.string().min(2),
    name: z.string().min(2),
    email: z.email().nullable().optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    taxIdentifier: z.string().nullable().optional(),
  })
  .strict();
const contactSchema = z
  .object({
    name: z.string().min(2),
    email: z.email().nullable().optional(),
    phone: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    primary: z.boolean().default(false),
  })
  .strict();
const simple = z.object({ code: z.string().min(2), name: z.string().min(2) }).strict();
const cost = z
  .object({ code: z.string().min(2), name: z.string().min(2), departmentId: z.uuid() })
  .strict();
const period = z
  .object({ code: z.string().min(2), startDate: z.iso.date(), endDate: z.iso.date() })
  .strict();

export const masterRoutes = new Elysia()
  .get("/vendors", async (ctx) => {
    await secureActor(ctx, undefined, false);
    const p = pageParams(ctx.request);
    const where = {
      ...(p.search ? { name: { contains: p.search, mode: "insensitive" as const } } : {}),
    };
    const [data, total] = await Promise.all([
      db.vendor.findMany({ where, skip: p.skip, take: p.take, orderBy: { name: "asc" } }),
      db.vendor.count({ where }),
    ]);
    return collection(data, total, p.page, p.pageSize);
  })
  .get("/vendors/:id", async (ctx) => {
    await secureActor(ctx, undefined, false);
    return response(
      await db.vendor.findUniqueOrThrow({
        where: { id: ctx.params.id },
        include: { contacts: true },
      }),
    );
  })
  .post("/vendors", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN", "PROCUREMENT_OFFICER"]);
    const form = vendorSchema.parse(ctx.body);
    return response(
      await command(ctx, actor, "vendor.create", async (tx) => {
        const v = await tx.vendor.create({ data: form });
        await event(tx, actor, "VENDOR_CREATED", "Vendor", v.id);
        return v;
      }),
    );
  })
  .patch("/vendors/:id", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN", "PROCUREMENT_OFFICER"]);
    const form = vendorSchema.partial().parse(ctx.body);
    return response(
      await command(ctx, actor, `vendor.update.${ctx.params.id}`, async (tx) => {
        const v = await tx.vendor.update({ where: { id: ctx.params.id }, data: form });
        await event(tx, actor, "VENDOR_UPDATED", "Vendor", v.id);
        return v;
      }),
    );
  })
  .post("/vendors/:id/:action", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN", "PROCUREMENT_OFFICER"]);
    assert(
      ["deactivate", "reactivate"].includes(ctx.params.action),
      "INVALID_ACTION",
      "Unknown action",
      404,
    );
    return response(
      await command(ctx, actor, `vendor.${ctx.params.action}.${ctx.params.id}`, async (tx) => {
        const v = await tx.vendor.update({
          where: { id: ctx.params.id },
          data: { active: ctx.params.action === "reactivate" },
        });
        await event(tx, actor, "VENDOR_STATUS", "Vendor", v.id);
        return v;
      }),
    );
  })
  .get("/vendors/:id/contacts", async (ctx) => {
    await secureActor(ctx, undefined, false);
    return response(
      await db.vendorContact.findMany({
        where: { vendorId: ctx.params.id, active: true },
        orderBy: { name: "asc" },
      }),
    );
  })
  .post("/vendors/:id/contacts", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN", "PROCUREMENT_OFFICER"]);
    const form = contactSchema.parse(ctx.body);
    return response(
      await command(ctx, actor, `vendor.contact.create.${ctx.params.id}`, async (tx) => {
        if (form.primary)
          await tx.vendorContact.updateMany({
            where: { vendorId: ctx.params.id },
            data: { primary: false },
          });
        const c = await tx.vendorContact.create({ data: { vendorId: ctx.params.id, ...form } });
        await event(tx, actor, "VENDOR_CONTACT_CREATED", "VendorContact", c.id);
        return c;
      }),
    );
  })
  .patch("/vendors/:id/contacts/:contactId", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN", "PROCUREMENT_OFFICER"]);
    const form = contactSchema.partial().parse(ctx.body);
    return response(
      await command(ctx, actor, `vendor.contact.update.${ctx.params.contactId}`, async (tx) => {
        if (form.primary)
          await tx.vendorContact.updateMany({
            where: { vendorId: ctx.params.id },
            data: { primary: false },
          });
        const c = await tx.vendorContact.update({
          where: { id: ctx.params.contactId, vendorId: ctx.params.id },
          data: form,
        });
        await event(tx, actor, "VENDOR_CONTACT_UPDATED", "VendorContact", c.id);
        return c;
      }),
    );
  })
  .delete("/vendors/:id/contacts/:contactId", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN", "PROCUREMENT_OFFICER"]);
    return response(
      await command(ctx, actor, `vendor.contact.delete.${ctx.params.contactId}`, async (tx) => {
        const c = await tx.vendorContact.update({
          where: { id: ctx.params.contactId, vendorId: ctx.params.id },
          data: { active: false },
        });
        await event(tx, actor, "VENDOR_CONTACT_DEACTIVATED", "VendorContact", c.id);
        return c;
      }),
    );
  })
  .get("/admin/cost-centers", async (ctx) => {
    await secureActor(ctx, undefined, false);
    return response(
      await db.costCenter.findMany({ include: { department: true }, orderBy: { name: "asc" } }),
    );
  })
  .post("/admin/cost-centers", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN"]);
    const form = cost.parse(ctx.body);
    return response(
      await command(ctx, actor, "cost.center.create", async (tx) => {
        const x = await tx.costCenter.create({ data: form });
        await event(tx, actor, "COST_CENTER_CREATED", "CostCenter", x.id);
        return x;
      }),
    );
  })
  .get("/admin/item-categories", async (ctx) => {
    await secureActor(ctx, undefined, false);
    return response(await db.itemCategory.findMany({ orderBy: { name: "asc" } }));
  })
  .post("/admin/item-categories", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN"]);
    const form = simple.parse(ctx.body);
    return response(
      await command(ctx, actor, "category.create", async (tx) => {
        const x = await tx.itemCategory.create({ data: form });
        await event(tx, actor, "CATEGORY_CREATED", "ItemCategory", x.id);
        return x;
      }),
    );
  })
  .get("/admin/delivery-locations", async (ctx) => {
    await secureActor(ctx, undefined, false);
    return response(await db.deliveryLocation.findMany({ orderBy: { name: "asc" } }));
  })
  .post("/admin/delivery-locations", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN"]);
    const form = simple.extend({ address: z.string().optional() }).parse(ctx.body);
    return response(
      await command(ctx, actor, "location.create", async (tx) => {
        const x = await tx.deliveryLocation.create({ data: form });
        await event(tx, actor, "LOCATION_CREATED", "DeliveryLocation", x.id);
        return x;
      }),
    );
  })
  .get("/admin/fiscal-periods", async (ctx) => {
    await secureActor(ctx, undefined, false);
    return response(await db.fiscalPeriod.findMany({ orderBy: { startDate: "desc" } }));
  })
  .post("/admin/fiscal-periods", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN"]);
    const form = period.parse(ctx.body);
    assert(
      new Date(form.endDate) > new Date(form.startDate),
      "INVALID_PERIOD",
      "End date must be after start date",
      422,
    );
    return response(
      await command(ctx, actor, "period.create", async (tx) => {
        const x = await tx.fiscalPeriod.create({
          data: {
            code: form.code,
            startDate: new Date(form.startDate),
            endDate: new Date(form.endDate),
          },
        });
        await event(tx, actor, "PERIOD_CREATED", "FiscalPeriod", x.id);
        return x;
      }),
    );
  })
  .get("/admin/procurement-policies", async (ctx) => {
    await secureActor(ctx, undefined, false);
    return response(await db.procurementPolicy.findMany({ orderBy: { version: "desc" } }));
  })
  .post("/admin/procurement-policies", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN"]);
    const form = z
      .object({ directPurchaseEnabled: z.boolean(), directPurchaseThreshold: z.string() })
      .strict()
      .parse(ctx.body);
    assert(
      dec(form.directPurchaseThreshold).gte(0),
      "INVALID_THRESHOLD",
      "Threshold must be nonnegative",
      422,
    );
    return response(
      await command(ctx, actor, "policy.create", async (tx) => {
        const last = await tx.procurementPolicy.findFirst({ orderBy: { version: "desc" } });
        const x = await tx.procurementPolicy.create({
          data: { version: (last?.version || 0) + 1, ...form },
        });
        await event(tx, actor, "POLICY_CREATED", "ProcurementPolicy", x.id);
        return x;
      }),
    );
  })
  .get("/reference/departments", async (ctx) => {
    await secureActor(ctx, undefined, false);
    return response(
      await db.department.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true, managerId: true },
      }),
    );
  });
