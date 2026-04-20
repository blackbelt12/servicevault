import Dexie, { type EntityTable } from "dexie";

// The schema version the app currently runs on. Bump this alongside the
// newest `this.version(N).stores(...)` call in ServiceVaultDB below, and
// consumers (e.g. the backup/restore layer) will pick it up automatically.
export const CURRENT_DB_VERSION = 9;

export interface ClientList {
  id?: number;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface ClientListMember {
  id?: number;
  listId: number;
  propertyId: number;
}

export interface Client {
  id?: number;
  status: "active" | "quote" | "inactive";
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  id?: number;
  clientId: number;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  // Baseline per-visit price for this lawn. Auto-fills the first line
  // item when a new job is created against this property. Extra per-job
  // charges go on top via additional jobLineItem rows.
  defaultPrice?: number;
}

export interface ServiceItem {
  id?: number;
  name: string;
  defaultPrice: number;
  unit: string;
  category: string;
  active: boolean;
}

export interface Job {
  id?: number;
  clientId: number;
  propertyId: number;
  status: "scheduled" | "in_progress" | "completed" | "skipped" | "cancelled";
  paymentStatus?: "unpaid" | "paid";
  scheduledDate: string;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobLineItem {
  id?: number;
  jobId: number;
  serviceItemId: number;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id?: number;
  jobId: number;
  clientId: number;
  number: string;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  issuedDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAt?: Date;
  createdAt: Date;
}

export interface Payment {
  id?: number;
  invoiceId: number;
  amount: number;
  method: "cash" | "check" | "card" | "transfer" | "other";
  reference?: string;
  paidAt: Date;
}

export interface RecurringSchedule {
  id?: number;
  clientId: number;
  propertyId: number;
  rrule: string;
  serviceItemIds: number[];
  active: boolean;
  createdAt: Date;
}

export interface RouteStop {
  id?: number;
  routeDate: string;
  jobId: number;
  position: number;
  status: "pending" | "arrived" | "completed" | "skipped";
}

export interface JobPhoto {
  id?: number;
  jobId: number;
  type: "before" | "after";
  data: Blob;
  createdAt: Date;
}

export interface SavedRoute {
  id?: number;
  name: string;
  propertyIds: number[];
  createdAt: Date;
}

export interface Setting {
  key: string;
  value: string;
}

class ServiceVaultDB extends Dexie {
  clients!: EntityTable<Client, "id">;
  properties!: EntityTable<Property, "id">;
  serviceItems!: EntityTable<ServiceItem, "id">;
  jobs!: EntityTable<Job, "id">;
  jobLineItems!: EntityTable<JobLineItem, "id">;
  invoices!: EntityTable<Invoice, "id">;
  payments!: EntityTable<Payment, "id">;
  recurringSchedules!: EntityTable<RecurringSchedule, "id">;
  routeStops!: EntityTable<RouteStop, "id">;
  jobPhotos!: EntityTable<JobPhoto, "id">;
  clientLists!: EntityTable<ClientList, "id">;
  clientListMembers!: EntityTable<ClientListMember, "id">;
  savedRoutes!: EntityTable<SavedRoute, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("ServiceVaultDB");
    this.version(7).stores({
      clients: "++id, name, status, *tags, createdAt",
      properties: "++id, clientId, name",
      serviceItems: "++id, name, category, active",
      jobs: "++id, clientId, propertyId, status, scheduledDate, completedAt",
      jobLineItems: "++id, jobId, serviceItemId",
      invoices: "++id, jobId, clientId, number, status, issuedDate, dueDate",
      payments: "++id, invoiceId, paidAt",
      recurringSchedules: "++id, clientId, propertyId, active",
      routeStops: "++id, routeDate, jobId, position",
      jobPhotos: "++id, jobId, type, createdAt",
      clientLists: "++id, name, createdAt",
      clientListMembers: "++id, listId, propertyId, [listId+propertyId]",
      savedRoutes: "++id, name, createdAt",
      settings: "key",
    });
    this.version(8).stores({
      jobs: "++id, clientId, propertyId, status, paymentStatus, scheduledDate, completedAt",
    });
    // v9: add `defaultPrice` to properties. No new index needed — the
    // field is read alongside the property by id — so the stores() call
    // mirrors v7's properties line to register the schema bump.
    this.version(9).stores({
      properties: "++id, clientId, name",
    });
  }
}

export const db = new ServiceVaultDB();

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Wipe every user-data table in a single transaction. Used by onboarding
// (to guarantee a clean slate for new users) and by the Reset-all-data
// button in Business Settings. Service items are left in place — they are
// a catalog seeded from seedServiceItems(), not user data.
export async function wipeAllUserData() {
  await db.transaction(
    "rw",
    [
      db.clients,
      db.properties,
      db.jobs,
      db.jobLineItems,
      db.invoices,
      db.payments,
      db.recurringSchedules,
      db.routeStops,
      db.jobPhotos,
      db.clientLists,
      db.clientListMembers,
      db.savedRoutes,
    ],
    async () => {
      await db.clients.clear();
      await db.properties.clear();
      await db.jobs.clear();
      await db.jobLineItems.clear();
      await db.invoices.clear();
      await db.payments.clear();
      await db.recurringSchedules.clear();
      await db.routeStops.clear();
      await db.jobPhotos.clear();
      await db.clientLists.clear();
      await db.clientListMembers.clear();
      await db.savedRoutes.clear();
    },
  );
}

export async function seedServiceItems() {
  const count = await db.serviceItems.count();
  if (count > 0) return;

  await db.serviceItems.bulkAdd([
    { name: "Lawn Mowing", defaultPrice: 45, unit: "visit", category: "Lawn Care", active: true },
    { name: "Edging", defaultPrice: 15, unit: "visit", category: "Lawn Care", active: true },
    { name: "Hedge Trimming", defaultPrice: 35, unit: "hour", category: "Lawn Care", active: true },
    { name: "Leaf Blowing", defaultPrice: 25, unit: "visit", category: "Lawn Care", active: true },
    { name: "Fertilization", defaultPrice: 60, unit: "application", category: "Lawn Care", active: true },
    { name: "Weed Control", defaultPrice: 50, unit: "application", category: "Lawn Care", active: true },
    { name: "Aeration", defaultPrice: 80, unit: "visit", category: "Lawn Care", active: true },
    { name: "Overseeding", defaultPrice: 70, unit: "visit", category: "Lawn Care", active: true },
    { name: "Mulch Installation", defaultPrice: 75, unit: "yard", category: "Landscaping", active: true },
    { name: "Tree Trimming", defaultPrice: 120, unit: "hour", category: "Landscaping", active: true },
    { name: "Flower Bed Maintenance", defaultPrice: 40, unit: "hour", category: "Landscaping", active: true },
    { name: "Spring Cleanup", defaultPrice: 150, unit: "visit", category: "Seasonal", active: true },
    { name: "Fall Cleanup", defaultPrice: 175, unit: "visit", category: "Seasonal", active: true },
    { name: "Snow Removal", defaultPrice: 55, unit: "visit", category: "Seasonal", active: true },
    { name: "Gutter Cleaning", defaultPrice: 95, unit: "visit", category: "Maintenance", active: true },
    { name: "Pressure Washing", defaultPrice: 100, unit: "hour", category: "Maintenance", active: true },
    { name: "Irrigation Repair", defaultPrice: 85, unit: "hour", category: "Maintenance", active: true },
    { name: "Sprinkler Winterization", defaultPrice: 65, unit: "visit", category: "Seasonal", active: true },
  ]);
}
