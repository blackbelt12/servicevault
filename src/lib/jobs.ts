// Job creation helpers.
//
// Every page that creates a new job (RoutePage's add/load modals,
// SchedulePage, AddToTargetPicker) goes through `createJobForProperty`
// so the behaviour of "auto-create a baseline line item from the
// property's defaultPrice" lives in exactly one place.

import { db } from "@/db";
import type { Job } from "@/db";

interface NewJobInput {
  clientId: number;
  propertyId: number;
  scheduledDate: string;
  status?: Job["status"];
  notes?: string;
}

// Create a scheduled job for a property and seed a baseline line item
// from the property's `defaultPrice` (when set). Returns the new job id.
export async function createJobForProperty(input: NewJobInput): Promise<number> {
  const now = new Date();
  const property = await db.properties.get(input.propertyId);

  return db.transaction("rw", db.jobs, db.jobLineItems, async () => {
    const jobId = (await db.jobs.add({
      clientId: input.clientId,
      propertyId: input.propertyId,
      status: input.status ?? "scheduled",
      scheduledDate: input.scheduledDate,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    })) as number;

    // Only seed a line item when the property actually has a price set.
    // A 0 or undefined defaultPrice means "no baseline" — the user will
    // add charges manually or leave the job priceless (e.g. a quote).
    if (property?.defaultPrice && property.defaultPrice > 0) {
      await db.jobLineItems.add({
        jobId,
        // serviceItemId = 0 is our sentinel for "not tied to a catalog
        // item" — these seeded line items represent the lawn's base
        // price, not a service from the ServiceItems catalog.
        serviceItemId: 0,
        description: "Lawn service",
        quantity: 1,
        unitPrice: property.defaultPrice,
      });
    }

    return jobId;
  });
}
