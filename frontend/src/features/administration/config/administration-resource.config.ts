import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const administrationResourceConfigs = {
  users: {
    title: "Users & roles",
    description: "Manage account access and organization roles.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/users",
    create: "/app/admin/users/new",
    detail: "/app/admin/users",
    columns: columns(
      { key: "name", label: "Name" },
      { key: "email", label: "Work email" },
      { key: "role", label: "Role" },
      { key: "active", label: "Active" },
    ),
  },
  departments: {
    title: "Departments",
    description: "Manage departmental structure and managers.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/departments",
    create: "/app/admin/departments/new",
    columns: columns(
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "active", label: "Active" },
    ),
  },
  "cost-centers": {
    title: "Cost centers",
    description: "Allocate procurement expenses by business unit.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/cost-centers",
    create: "/app/admin/cost-centers/new",
    columns: columns(
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "department.name", label: "Department" },
    ),
  },
  categories: {
    title: "Item categories",
    description: "Group requested goods consistently.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/item-categories",
    create: "/app/admin/categories/new",
    columns: columns({ key: "code", label: "Code" }, { key: "name", label: "Name" }),
  },
  locations: {
    title: "Delivery locations",
    description: "Addresses for goods receiving.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/delivery-locations",
    create: "/app/admin/locations/new",
    columns: columns(
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "address", label: "Address" },
    ),
  },
  periods: {
    title: "Fiscal periods",
    description: "Define budget windows and their status.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/fiscal-periods",
    create: "/app/admin/periods/new",
    columns: columns(
      { key: "code", label: "Code" },
      { key: "startDate", label: "Start", type: "date" },
      { key: "endDate", label: "End", type: "date" },
      { key: "status", label: "Status", type: "status" },
    ),
  },
  policies: {
    title: "Procurement policies",
    description: "Review direct purchase settings and effective versions.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/procurement-policies",
    create: "/app/admin/policies/new",
    columns: columns(
      { key: "version", label: "Version" },
      { key: "directPurchaseThreshold", label: "Direct purchase cap", type: "money" },
      { key: "effectiveFrom", label: "Effective", type: "date" },
    ),
  },
  audit: {
    title: "Audit history",
    description: "Read-only record of significant actions.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/audit-logs",
    columns: columns(
      { key: "action", label: "Action" },
      { key: "resourceType", label: "Resource" },
      { key: "resourceId", label: "Record ID" },
      { key: "createdAt", label: "Occurred", type: "date" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
