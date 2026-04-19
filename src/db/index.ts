import Dexie, { type EntityTable } from "dexie";

// The schema version the app currently runs on. Bump this alongside the
// newest `this.version(N).stores(...)` call in ServiceVaultDB below, and
// consumers (e.g. the backup/restore layer) will pick it up automatically.
export const CURRENT_DB_VERSION = 8;

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
  }
}

export const db = new ServiceVaultDB();

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function seedRouteDemo() {
  const today = todayStr();
  const existing = await db.routeStops.where("routeDate").equals(today).count();
  if (existing > 0) return;

  const existingClients = await db.clients.count();
  if (existingClients > 0) return;

  const now = new Date();
  const clientData = [
    { name: "Sarah Johnson", phone: "(512) 555-0101", address: "742 Evergreen Terrace, Austin, TX 78701", status: "active" as const },
    { name: "Mike Thompson", phone: "(512) 555-0102", address: "1600 Oak Hill Dr, Austin, TX 78735", status: "active" as const },
    { name: "Garcia Family", phone: "(512) 555-0103", address: "2847 Riverside Ave, Austin, TX 78741", status: "active" as const },
    { name: "Bluebonnet Office Park", phone: "(512) 555-0104", address: "500 Congress Ave, Austin, TX 78701", status: "active" as const },
    { name: "Linda Chen", phone: "(512) 555-0105", address: "1205 Barton Springs Rd, Austin, TX 78704", status: "active" as const },
  ];

  const propertyIds: number[] = [];
  const clientIds: number[] = [];
  for (const c of clientData) {
    const clientId = await db.clients.add({
      status: c.status,
      name: c.name,
      phone: c.phone,
      createdAt: now,
      updatedAt: now,
    }) as number;
    clientIds.push(clientId);
    const propId = await db.properties.add({
      clientId,
      name: "Property 1",
      address: c.address,
    }) as number;
    propertyIds.push(propId);
  }

  const serviceItems = await db.serviceItems.toArray();
  const mowing = serviceItems.find((s) => s.name === "Lawn Mowing")!;
  const edging = serviceItems.find((s) => s.name === "Edging")!;
  const hedges = serviceItems.find((s) => s.name === "Hedge Trimming")!;
  const leafs = serviceItems.find((s) => s.name === "Leaf Blowing")!;
  const mulch = serviceItems.find((s) => s.name === "Mulch Installation")!;

  const jobServices = [
    [mowing, edging],
    [mowing, edging, leafs],
    [mowing, hedges],
    [mowing, edging, mulch],
    [mowing, leafs],
  ];

  for (let i = 0; i < clientIds.length; i++) {
    const jobId = await db.jobs.add({
      clientId: clientIds[i],
      propertyId: propertyIds[i],
      status: "scheduled",
      scheduledDate: today,
      createdAt: now,
      updatedAt: now,
    }) as number;
    for (const svc of jobServices[i]) {
      await db.jobLineItems.add({
        jobId,
        serviceItemId: svc.id as number,
        description: svc.name,
        quantity: 1,
        unitPrice: svc.defaultPrice,
      });
    }
    await db.routeStops.add({
      routeDate: today,
      jobId: jobId,
      position: i,
      status: "pending",
    });
  }
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
