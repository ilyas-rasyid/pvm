import { db } from "../../../infrastructure/database/prisma-client";

export const masterDataRepository = {
  costCenters: () => db.costCenter.findMany({ include: { department: true }, orderBy: { name: "asc" } }),
  itemCategories: () => db.itemCategory.findMany({ orderBy: { name: "asc" } }),
  deliveryLocations: () => db.deliveryLocation.findMany({ orderBy: { name: "asc" } }),
  fiscalPeriods: () => db.fiscalPeriod.findMany({ orderBy: { startDate: "desc" } }),
  procurementPolicies: () => db.procurementPolicy.findMany({ orderBy: { version: "desc" } }),
  activeDepartments: () => db.department.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, managerId: true },
  }),
};
