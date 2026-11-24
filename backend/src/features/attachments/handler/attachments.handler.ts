import { Elysia } from "elysia";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";

import { db } from "../../../infrastructure/database/prisma-client";
import { env } from "../../../config/env";
import { secureActor } from "../../../security/session";
import { assert } from "../../../shared/errors/app-error";
import { response } from "../../../shared/http/context";

const root = resolve(env.ATTACHMENT_DIR);
const allowed = new Set(["application/pdf", "image/png", "image/jpeg"]);
async function authorized(
  parentType: string,
  parentId: string,
  actor: {
    role: string;
    id: string;
  },
) {
  if (parentType === "VendorInvoice") {
    assert(
      ["FINANCE_OFFICER", "ADMIN"].includes(actor.role),
      "ACCESS_DENIED",
      "Finance access required",
      403,
    );
    return !!(await db.vendorInvoice.findUnique({ where: { id: parentId }, select: { id: true } }));
  }
  if (parentType === "GoodsReceipt") {
    assert(
      ["RECEIVING_OFFICER", "FINANCE_OFFICER", "ADMIN"].includes(actor.role),
      "ACCESS_DENIED",
      "Receiving access required",
      403,
    );
    return !!(await db.goodsReceipt.findUnique({ where: { id: parentId }, select: { id: true } }));
  }
  if (parentType === "Quotation") {
    assert(
      ["PROCUREMENT_OFFICER", "ADMIN"].includes(actor.role),
      "ACCESS_DENIED",
      "Procurement access required",
      403,
    );
    return !!(await db.quotation.findUnique({ where: { id: parentId }, select: { id: true } }));
  }
  return false;
}
export const attachmentRoutes = new Elysia({ prefix: "/attachments" })
  .post("/", async (ctx) => {
    const a = await secureActor(ctx);
    const form = await ctx.request.formData();
    const parentType = String(form.get("parentType") || "");
    const parentId = String(form.get("parentId") || "");
    const file = form.get("file");
    assert(
      await authorized(parentType, parentId, a),
      "ACCESS_DENIED",
      "Invalid parent/permission",
      403,
    );
    assert(file instanceof File, "FILE_REQUIRED", "Select an attachment", 422);
    assert(
      file.size > 0 && file.size <= 10 * 1024 * 1024,
      "ATTACHMENT_TOO_LARGE",
      "File must be 1 byte to 10MB",
      413,
    );
    assert(allowed.has(file.type), "ATTACHMENT_TYPE_NOT_ALLOWED", "PDF, PNG or JPEG only", 415);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid =
      file.type === "application/pdf"
        ? new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-"
        : file.type === "image/png"
          ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
          : bytes[0] === 255 && bytes[1] === 216;
    assert(valid, "ATTACHMENT_TYPE_NOT_ALLOWED", "Content does not match file type", 415);
    const key = randomUUID();
    const checksum = createHash("sha256").update(bytes).digest("hex");
    await mkdir(root, { recursive: true, mode: 0o700 });
    await writeFile(join(root, key), bytes, { flag: "wx", mode: 0o600 });
    const result = await db.attachment.create({
      data: {
        parentType,
        parentId,
        uploadedBy: a.id,
        versions: {
          create: {
            number: 1,
            storageKey: key,
            originalName: file.name.slice(0, 200),
            mimeType: file.type,
            sizeBytes: file.size,
            checksum,
          },
        },
      },
      include: { versions: true },
    });
    return response(result);
  })
  .get("/:id", async (ctx) => {
    const a = await secureActor(ctx, undefined, false);
    const x = await db.attachment.findUniqueOrThrow({
      where: { id: ctx.params.id },
      include: { versions: true },
    });
    assert(
      await authorized(x.parentType, x.parentId, a),
      "ACCESS_DENIED",
      "Document access denied",
      403,
    );
    return response(x);
  })
  .get("/:id/download", async (ctx) => {
    const a = await secureActor(ctx, undefined, false);
    const x = await db.attachment.findUniqueOrThrow({
      where: { id: ctx.params.id },
      include: { versions: { orderBy: { number: "desc" }, take: 1 } },
    });
    assert(
      await authorized(x.parentType, x.parentId, a),
      "ACCESS_DENIED",
      "Document access denied",
      403,
    );
    const current = x.versions[0];
    assert(current, "FILE_MISSING", "File version not found", 404);
    const bytes = await readFile(join(root, current.storageKey));
    return new Response(bytes, {
      headers: {
        "Content-Type": current.mimeType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(current.originalName)}`,
      },
    });
  });
