-- PVMS initial migration: generated from approved 47-model schema.
CREATE TABLE "GoodsReceipt" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "reference" TEXT NOT NULL UNIQUE,
  "orderId" TEXT NOT NULL,
  "officerId" TEXT NOT NULL,
  "deliveryReference" TEXT NOT NULL,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "note" TEXT,
  "postedAt" TIMESTAMPTZ,
  "voidedAt" TIMESTAMPTZ,
  "voidReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "GoodsReceiptLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "receiptId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "deliveredQty" INTEGER NOT NULL,
  "acceptedQty" INTEGER NOT NULL,
  "rejectedQty" INTEGER NOT NULL,
  "note" TEXT
);

CREATE TABLE "VendorInvoice" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "normalizedNumber" TEXT NOT NULL,
  "invoiceDate" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "submittedAt" TIMESTAMPTZ,
  "matchedAt" TIMESTAMPTZ,
  "readyAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "VendorInvoiceLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "price" DECIMAL(18,2) NOT NULL,
  "taxRate" DECIMAL(9,6) NOT NULL,
  "total" DECIMAL(18,2) NOT NULL
);

CREATE TABLE "InvoiceReceiptAllocation" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "invoiceLineId" TEXT NOT NULL,
  "receiptLineId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMPTZ
);

CREATE TABLE "InvoiceMatchAttempt" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "summary" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "InvoiceDiscrepancy" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "attemptId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "invoiceLineId" TEXT,
  "expected" TEXT,
  "actual" TEXT
);

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Makassar',
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Department" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "managerId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "departmentId" TEXT,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "csrfTokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idleExpiresAt" TIMESTAMPTZ NOT NULL,
  "absoluteExpiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ
);

CREATE TABLE "CostCenter" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "departmentId" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "DeliveryLocation" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "ItemCategory" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "ProcurementPolicy" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "version" INTEGER NOT NULL UNIQUE,
  "directPurchaseEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "directPurchaseThreshold" DECIMAL(18,2) NOT NULL,
  "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "FiscalPeriod" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE "BudgetAccount" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "costCenterId" TEXT NOT NULL,
  "fiscalPeriodId" TEXT NOT NULL,
  "allocated" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "committed" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "verified" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "BudgetMovement" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "budgetAccountId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL UNIQUE,
  "kind" TEXT NOT NULL,
  "deltaAllocated" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "deltaCommitted" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "deltaVerified" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "sourceId" TEXT NOT NULL,
  "actorId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "BudgetAdjustment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "budgetAccountId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "parentType" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AttachmentVersion" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "attachmentId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL UNIQUE,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PurchaseOrder" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "reference" TEXT NOT NULL UNIQUE,
  "requestId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "costCenterId" TEXT NOT NULL,
  "fiscalPeriodId" TEXT NOT NULL,
  "deliveryLocationId" TEXT,
  "directExceptionId" TEXT,
  "sourcingMode" TEXT NOT NULL DEFAULT 'DIRECT',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "committed" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "expectedAt" TIMESTAMPTZ,
  "issuedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PurchaseOrderLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "requestLineId" TEXT NOT NULL,
  "awardLineId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "acceptedQty" INTEGER NOT NULL DEFAULT 0,
  "invoicedQty" INTEGER NOT NULL DEFAULT 0,
  "price" DECIMAL(18,2) NOT NULL,
  "taxRate" DECIMAL(9,6) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL
);

CREATE TABLE "PurchaseOrderVersion" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "total" DECIMAL(18,2) NOT NULL,
  "vendorSnapshot" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PurchaseOrderVersionLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "versionId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "price" DECIMAL(18,2) NOT NULL,
  "taxRate" DECIMAL(9,6) NOT NULL,
  "total" DECIMAL(18,2) NOT NULL
);

CREATE TABLE "PurchaseOrderAmendment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "payload" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL,
  "appliedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PrQuantityAllocation" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "requestLineId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "releasedQty" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "recipientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "reason" TEXT,
  "before" JSONB,
  "after" JSONB,
  "requestId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMMITTED',
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "DocumentSequence" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "prefix" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "Rfq" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "reference" TEXT NOT NULL UNIQUE,
  "requestId" TEXT NOT NULL,
  "officerId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "deadline" TIMESTAMPTZ,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RfqLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "rfqId" TEXT NOT NULL,
  "requestLineId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL
);

CREATE TABLE "RfqInvitation" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "rfqId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECORDED'
);

CREATE TABLE "Quotation" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "rfqId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "QuotationRevision" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "quotationId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "validUntil" TIMESTAMPTZ,
  "leadDays" INTEGER NOT NULL DEFAULT 7,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "QuotationRevisionLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "revisionId" TEXT NOT NULL,
  "rfqLineId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "price" DECIMAL(18,2) NOT NULL,
  "taxRate" DECIMAL(9,6) NOT NULL DEFAULT 0
);

CREATE TABLE "RfqAward" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "rfqId" TEXT NOT NULL UNIQUE,
  "reason" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RfqAwardLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "awardId" TEXT NOT NULL,
  "rfqLineId" TEXT NOT NULL,
  "quotationLineId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "issuedQty" INTEGER NOT NULL DEFAULT 0,
  "releasedQty" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "DirectPurchaseException" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "policyVersion" INTEGER NOT NULL,
  "threshold" DECIMAL(18,2) NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Vendor" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "taxIdentifier" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "VendorContact" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "vendorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "title" TEXT,
  "primary" BOOLEAN NOT NULL DEFAULT FALSE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "PurchaseRequest" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "reference" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "costCenterId" TEXT NOT NULL,
  "neededBy" DATE NOT NULL,
  "justification" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "estimatedTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "submittedAt" TIMESTAMPTZ,
  "approvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PurchaseRequestLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "categoryId" TEXT,
  "description" TEXT NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'UNIT',
  "quantity" INTEGER NOT NULL,
  "approvedQty" INTEGER NOT NULL DEFAULT 0,
  "awardedQty" INTEGER NOT NULL DEFAULT 0,
  "issuedQty" INTEGER NOT NULL DEFAULT 0,
  "estimatedPrice" DECIMAL(18,2) NOT NULL,
  "lineTotal" DECIMAL(18,2) NOT NULL
);

CREATE TABLE "PurchaseRequestApproval" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ApprovalException" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX "GoodsReceipt_orderId_status_index" ON "GoodsReceipt" ("orderId", "status");
CREATE UNIQUE INDEX "VendorInvoice_vendorId_normalizedNumber_unique" ON "VendorInvoice" ("vendorId", "normalizedNumber");
CREATE INDEX "VendorInvoice_status_createdAt_index" ON "VendorInvoice" ("status", "createdAt");
CREATE UNIQUE INDEX "InvoiceReceiptAllocation_invoiceLineId_receiptLineId_unique" ON "InvoiceReceiptAllocation" ("invoiceLineId", "receiptLineId");
CREATE INDEX "AuthSession_userId_revokedAt_index" ON "AuthSession" ("userId", "revokedAt");
CREATE UNIQUE INDEX "BudgetAccount_costCenterId_fiscalPeriodId_unique" ON "BudgetAccount" ("costCenterId", "fiscalPeriodId");
CREATE INDEX "BudgetMovement_budgetAccountId_createdAt_index" ON "BudgetMovement" ("budgetAccountId", "createdAt");
CREATE INDEX "Attachment_parentType_parentId_index" ON "Attachment" ("parentType", "parentId");
CREATE UNIQUE INDEX "AttachmentVersion_attachmentId_number_unique" ON "AttachmentVersion" ("attachmentId", "number");
CREATE INDEX "PurchaseOrder_vendorId_status_index" ON "PurchaseOrder" ("vendorId", "status");
CREATE INDEX "PurchaseOrder_costCenterId_status_index" ON "PurchaseOrder" ("costCenterId", "status");
CREATE INDEX "PurchaseOrderLine_requestLineId_index" ON "PurchaseOrderLine" ("requestLineId");
CREATE UNIQUE INDEX "PurchaseOrderVersion_orderId_number_unique" ON "PurchaseOrderVersion" ("orderId", "number");
CREATE UNIQUE INDEX "PrQuantityAllocation_requestLineId_orderLineId_unique" ON "PrQuantityAllocation" ("requestLineId", "orderLineId");
CREATE INDEX "Notification_recipientId_readAt_index" ON "Notification" ("recipientId", "readAt");
CREATE INDEX "AuditLog_resourceType_resourceId_createdAt_index" ON "AuditLog" ("resourceType", "resourceId", "createdAt");
CREATE INDEX "OutboxEvent_status_availableAt_index" ON "OutboxEvent" ("status", "availableAt");
CREATE UNIQUE INDEX "IdempotencyRecord_actorId_scope_key_unique" ON "IdempotencyRecord" ("actorId", "scope", "key");
CREATE UNIQUE INDEX "DocumentSequence_prefix_year_unique" ON "DocumentSequence" ("prefix", "year");
CREATE UNIQUE INDEX "RfqInvitation_rfqId_vendorId_unique" ON "RfqInvitation" ("rfqId", "vendorId");
CREATE UNIQUE INDEX "Quotation_rfqId_vendorId_reference_unique" ON "Quotation" ("rfqId", "vendorId", "reference");
CREATE UNIQUE INDEX "QuotationRevision_quotationId_number_unique" ON "QuotationRevision" ("quotationId", "number");
CREATE UNIQUE INDEX "QuotationRevisionLine_revisionId_rfqLineId_unique" ON "QuotationRevisionLine" ("revisionId", "rfqLineId");
CREATE INDEX "PurchaseRequest_departmentId_status_index" ON "PurchaseRequest" ("departmentId", "status");
CREATE INDEX "PurchaseRequest_requesterId_createdAt_index" ON "PurchaseRequest" ("requesterId", "createdAt");
CREATE UNIQUE INDEX "PurchaseRequestApproval_requestId_unique" ON "PurchaseRequestApproval" ("requestId");

-- Foreign keys and guards
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "fk_GoodsReceipt_orderId" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "fk_GoodsReceipt_officerId" FOREIGN KEY ("officerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "fk_GoodsReceiptLine_receiptId" FOREIGN KEY ("receiptId") REFERENCES "GoodsReceipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "fk_GoodsReceiptLine_orderLineId" FOREIGN KEY ("orderLineId") REFERENCES "PurchaseOrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "fk_VendorInvoice_orderId" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "fk_VendorInvoice_vendorId" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "fk_VendorInvoice_actorId" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorInvoiceLine" ADD CONSTRAINT "fk_VendorInvoiceLine_invoiceId" FOREIGN KEY ("invoiceId") REFERENCES "VendorInvoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorInvoiceLine" ADD CONSTRAINT "fk_VendorInvoiceLine_orderLineId" FOREIGN KEY ("orderLineId") REFERENCES "PurchaseOrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceReceiptAllocation" ADD CONSTRAINT "fk_InvoiceReceiptAllocation_invoiceLineId" FOREIGN KEY ("invoiceLineId") REFERENCES "VendorInvoiceLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceReceiptAllocation" ADD CONSTRAINT "fk_InvoiceReceiptAllocation_receiptLineId" FOREIGN KEY ("receiptLineId") REFERENCES "GoodsReceiptLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceReceiptAllocation" ADD CONSTRAINT "fk_InvoiceReceiptAllocation_orderLineId" FOREIGN KEY ("orderLineId") REFERENCES "PurchaseOrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceMatchAttempt" ADD CONSTRAINT "fk_InvoiceMatchAttempt_invoiceId" FOREIGN KEY ("invoiceId") REFERENCES "VendorInvoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceDiscrepancy" ADD CONSTRAINT "fk_InvoiceDiscrepancy_attemptId" FOREIGN KEY ("attemptId") REFERENCES "InvoiceMatchAttempt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "fk_Department_organizationId" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "fk_Department_managerId" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "fk_User_organizationId" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "fk_User_departmentId" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthSession" ADD CONSTRAINT "fk_AuthSession_userId" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CostCenter" ADD CONSTRAINT "fk_CostCenter_departmentId" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetAccount" ADD CONSTRAINT "fk_BudgetAccount_costCenterId" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetAccount" ADD CONSTRAINT "fk_BudgetAccount_fiscalPeriodId" FOREIGN KEY ("fiscalPeriodId") REFERENCES "FiscalPeriod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetMovement" ADD CONSTRAINT "fk_BudgetMovement_budgetAccountId" FOREIGN KEY ("budgetAccountId") REFERENCES "BudgetAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetAdjustment" ADD CONSTRAINT "fk_BudgetAdjustment_budgetAccountId" FOREIGN KEY ("budgetAccountId") REFERENCES "BudgetAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttachmentVersion" ADD CONSTRAINT "fk_AttachmentVersion_attachmentId" FOREIGN KEY ("attachmentId") REFERENCES "Attachment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "fk_PurchaseOrder_requestId" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "fk_PurchaseOrder_vendorId" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "fk_PurchaseOrder_costCenterId" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "fk_PurchaseOrder_fiscalPeriodId" FOREIGN KEY ("fiscalPeriodId") REFERENCES "FiscalPeriod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "fk_PurchaseOrder_deliveryLocationId" FOREIGN KEY ("deliveryLocationId") REFERENCES "DeliveryLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "fk_PurchaseOrder_directExceptionId" FOREIGN KEY ("directExceptionId") REFERENCES "DirectPurchaseException" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "fk_PurchaseOrderLine_orderId" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "fk_PurchaseOrderLine_requestLineId" FOREIGN KEY ("requestLineId") REFERENCES "PurchaseRequestLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "fk_PurchaseOrderLine_awardLineId" FOREIGN KEY ("awardLineId") REFERENCES "RfqAwardLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderVersion" ADD CONSTRAINT "fk_PurchaseOrderVersion_orderId" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderVersionLine" ADD CONSTRAINT "fk_PurchaseOrderVersionLine_versionId" FOREIGN KEY ("versionId") REFERENCES "PurchaseOrderVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderVersionLine" ADD CONSTRAINT "fk_PurchaseOrderVersionLine_orderLineId" FOREIGN KEY ("orderLineId") REFERENCES "PurchaseOrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderAmendment" ADD CONSTRAINT "fk_PurchaseOrderAmendment_orderId" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrQuantityAllocation" ADD CONSTRAINT "fk_PrQuantityAllocation_requestLineId" FOREIGN KEY ("requestLineId") REFERENCES "PurchaseRequestLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrQuantityAllocation" ADD CONSTRAINT "fk_PrQuantityAllocation_orderLineId" FOREIGN KEY ("orderLineId") REFERENCES "PurchaseOrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "fk_Notification_recipientId" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "fk_AuditLog_actorId" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Rfq" ADD CONSTRAINT "fk_Rfq_requestId" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RfqLine" ADD CONSTRAINT "fk_RfqLine_rfqId" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RfqLine" ADD CONSTRAINT "fk_RfqLine_requestLineId" FOREIGN KEY ("requestLineId") REFERENCES "PurchaseRequestLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RfqInvitation" ADD CONSTRAINT "fk_RfqInvitation_rfqId" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "fk_Quotation_rfqId" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "fk_Quotation_vendorId" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuotationRevision" ADD CONSTRAINT "fk_QuotationRevision_quotationId" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuotationRevisionLine" ADD CONSTRAINT "fk_QuotationRevisionLine_revisionId" FOREIGN KEY ("revisionId") REFERENCES "QuotationRevision" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuotationRevisionLine" ADD CONSTRAINT "fk_QuotationRevisionLine_rfqLineId" FOREIGN KEY ("rfqLineId") REFERENCES "RfqLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RfqAward" ADD CONSTRAINT "fk_RfqAward_rfqId" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RfqAwardLine" ADD CONSTRAINT "fk_RfqAwardLine_awardId" FOREIGN KEY ("awardId") REFERENCES "RfqAward" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RfqAwardLine" ADD CONSTRAINT "fk_RfqAwardLine_rfqLineId" FOREIGN KEY ("rfqLineId") REFERENCES "RfqLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RfqAwardLine" ADD CONSTRAINT "fk_RfqAwardLine_quotationLineId" FOREIGN KEY ("quotationLineId") REFERENCES "QuotationRevisionLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorContact" ADD CONSTRAINT "fk_VendorContact_vendorId" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "fk_PurchaseRequest_requesterId" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "fk_PurchaseRequest_departmentId" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "fk_PurchaseRequest_costCenterId" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequestLine" ADD CONSTRAINT "fk_PurchaseRequestLine_requestId" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequestLine" ADD CONSTRAINT "fk_PurchaseRequestLine_categoryId" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequestApproval" ADD CONSTRAINT "fk_PurchaseRequestApproval_requestId" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequestApproval" ADD CONSTRAINT "fk_PurchaseRequestApproval_actorId" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "ck_GoodsReceiptLine_integrity" CHECK ("deliveredQty" > 0 AND "acceptedQty" >= 0 AND "rejectedQty" >= 0 AND "deliveredQty" = "acceptedQty" + "rejectedQty");
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "ck_PurchaseOrderLine_integrity" CHECK ("quantity" > 0 AND "acceptedQty" >= 0 AND "invoicedQty" >= 0 AND "invoicedQty" <= "acceptedQty" AND "acceptedQty" <= "quantity");
ALTER TABLE "PurchaseRequestLine" ADD CONSTRAINT "ck_PurchaseRequestLine_integrity" CHECK ("quantity" > 0 AND "approvedQty" >= 0 AND "issuedQty" >= 0 AND "awardedQty" >= 0 AND "issuedQty" + "awardedQty" <= "approvedQty");
ALTER TABLE "BudgetAccount" ADD CONSTRAINT "ck_BudgetAccount_integrity" CHECK ("allocated" >= 0 AND "committed" >= 0 AND "verified" >= 0 AND "allocated" >= "committed" + "verified");
ALTER TABLE "VendorInvoiceLine" ADD CONSTRAINT "ck_VendorInvoiceLine_integrity" CHECK ("quantity" > 0 AND "price" >= 0);
ALTER TABLE "InvoiceReceiptAllocation" ADD CONSTRAINT "ck_InvoiceReceiptAllocation_integrity" CHECK ("quantity" > 0);
ALTER TABLE "RfqAwardLine" ADD CONSTRAINT "ck_RfqAwardLine_integrity" CHECK ("quantity" > 0 AND "issuedQty" >= 0 AND "releasedQty" >= 0 AND "issuedQty" + "releasedQty" <= "quantity");
ALTER TABLE "PrQuantityAllocation" ADD CONSTRAINT "ck_PrQuantityAllocation_integrity" CHECK ("quantity" > 0 AND "releasedQty" >= 0 AND "releasedQty" <= "quantity");
