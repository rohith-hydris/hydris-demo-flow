import { DEMO_SUPPLIER_ID, SUPPLIER_TENANT } from "@/src/data/tenants";
import { suppliers } from "@/src/data/suppliers";
import { canValidateClaims, type Role } from "./roles";
import type { FactoryId, SupplierId } from "./types";

// PRODUCT 2: data scoping. The brand sees all 5 suppliers and 14 factories; the supplier sees SUP5 only.
// Every list and every copilot answer filters through a Scope.

export interface Scope {
  role: Role;
  supplierIds: SupplierId[];
  factoryIds: FactoryId[];
  canValidate: boolean;
  canSeeValidationAgent: boolean;
}

export function scopeFor(role: Role): Scope {
  const visible = role === "brand" ? suppliers : suppliers.filter((s) => s.id === DEMO_SUPPLIER_ID);
  return {
    role,
    supplierIds: visible.map((s) => s.id),
    factoryIds: visible.flatMap((s) => s.factoryIds),
    canValidate: canValidateClaims(role),
    canSeeValidationAgent: role === "brand",
  };
}

export const canSeeFactory = (scope: Scope, factoryId: FactoryId) => scope.factoryIds.includes(factoryId);
export const canSeeSupplier = (scope: Scope, supplierId: SupplierId) => scope.supplierIds.includes(supplierId);

/**
 * The factories in view on Projects: the scope, narrowed to one supplier when a supplier filter is set. Null or "all" keeps the
 * whole scope; an unknown supplier, or one outside the scope, gives an empty list.
 */
export function factoryIdsInView(scope: Scope, supplierId: SupplierId | null): FactoryId[] {
  if (supplierId === null || supplierId === "all") return scope.factoryIds;
  const own = suppliers.find((s) => s.id === supplierId)?.factoryIds ?? [];
  return scope.factoryIds.filter((id) => own.includes(id));
}

/** Keep only the rows whose factory is in scope. */
export const inScope = <T extends { factoryId: FactoryId }>(scope: Scope, rows: T[]): T[] =>
  rows.filter((r) => canSeeFactory(scope, r.factoryId));

/** Copilot reply when a supplier asks about another supplier (PRODUCT 2). */
export const OUT_OF_SCOPE_REPLY = `I can only show data for ${SUPPLIER_TENANT.name}.`;

/** Copilot reply when a supplier selects or asks for the Validation agent (PRODUCT 4.7). */
export const VALIDATION_BRAND_ONLY_REPLY =
  "Claim and report validation is available to brand accounts. You can upload evidence from Claims & Evidence.";
