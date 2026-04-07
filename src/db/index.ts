import Dexie, { type EntityTable } from "dexie";

export interface Client {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
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
  status: "scheduled" | "in_progress" | "completed" | "skipped" | "cancelled";
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

export interface Setting {
  key: string;
  value: string;
}

class ServiceVaultDB extends Dexie {
  clients!: EntityTable<Client, "id">;
  serviceItems!: EntityTable<ServiceItem, "id">;
  jobs!: EntityTable<Job, "id">;
  jobLineItems!: EntityTable<JobLineItem, "id">;
  invoices!: EntityTable<Invoice, "id">;
  payments!: EntityTable<Payment, "id">;
  recurringSchedules!: EntityTable<RecurringSchedule, "id">;
  routeStops!: EntityTable<RouteStop, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("ServiceVaultDB");
    this.version(1).stores({
      clients: "++id, name, city, zip, *tags, createdAt",
      serviceItems: "++id, name, category, active",
      jobs: "++id, clientId, status, scheduledDate, completedAt",
      jobLineItems: "++id, jobId, serviceItemId",
      invoices: "++id, jobId, clientId, number, status, issuedDate, dueDate",
      payments: "++id, invoiceId, paidAt",
      recurringSchedules: "++id, clientId, active",
      routeStops: "++id, routeDate, jobId, position",
      settings: "key",
    });
  }
}

export const db = new ServiceVaultDB();

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
