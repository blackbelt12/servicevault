import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  LayoutList,
  Search,
  X,
  Repeat,
  MapPin,
  GripVertical,
} from "lucide-react";
import { db, todayStr } from "@/db";
import type { Client, Job, Property, ServiceItem } from "@/db";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export default function SchedulePage() {
  const today = todayStr();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showNewJob, setShowNewJob] = useState(false);
  const [rescheduleJob, setRescheduleJob] = useState<Job | null>(null);

  // Get all jobs for the visible range
  const visibleRange = useMemo(() => {
    if (viewMode === "month") {
      const first = new Date(currentMonth.year, currentMonth.month, 1);
      const last = new Date(currentMonth.year, currentMonth.month + 1, 0);
      // Include padding days
      const start = addDays(first, -first.getDay());
      const end = addDays(last, 6 - last.getDay());
      return { start: formatDate(start), end: formatDate(end) };
    } else {
      return {
        start: formatDate(weekStart),
        end: formatDate(addDays(weekStart, 6)),
      };
    }
  }, [viewMode, currentMonth, weekStart]);

  const jobs = useLiveQuery(async () => {
    return db.jobs
      .where("scheduledDate")
      .between(visibleRange.start, visibleRange.end, true, true)
      .toArray();
  }, [visibleRange]);

  // Count jobs per date
  const jobCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!jobs) return counts;
    for (const job of jobs) {
      counts[job.scheduledDate] = (counts[job.scheduledDate] || 0) + 1;
    }
    return counts;
  }, [jobs]);

  // Jobs for selected date with client info
  const selectedDayJobs = useLiveQuery(async () => {
    const dayJobs = await db.jobs
      .where("scheduledDate")
      .equals(selectedDate)
      .toArray();

    const enriched = [];
    for (const job of dayJobs) {
      const client = await db.clients.get(job.clientId);
      if (!client) continue;
      const property = job.propertyId
        ? await db.properties.get(job.propertyId)
        : undefined;
      const lineItems = await db.jobLineItems
        .where("jobId")
        .equals(job.id!)
        .toArray();
      const serviceIds = lineItems.map((li) => li.serviceItemId);
      const services = (await db.serviceItems.bulkGet(serviceIds)).filter(
        (s): s is ServiceItem => s !== undefined
      );
      enriched.push({ job, client, property, services: services.map((s) => s.name) });
    }
    return enriched.sort((a, b) => a.client.name.localeCompare(b.client.name));
  }, [selectedDate]);

  const prevMonth = () =>
    setCurrentMonth((m) => {
      const d = new Date(m.year, m.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const nextMonth = () =>
    setCurrentMonth((m) => {
      const d = new Date(m.year, m.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));

  const goToToday = () => {
    const now = new Date();
    setSelectedDate(todayStr());
    setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
    setWeekStart(startOfWeek(now));
  };

  // Calendar grid for month view
  const calendarDays = useMemo(() => {
    const first = new Date(currentMonth.year, currentMonth.month, 1);
    const last = new Date(currentMonth.year, currentMonth.month + 1, 0);
    const start = addDays(first, -first.getDay());
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];
    let d = start;
    while (d <= addDays(last, 6 - last.getDay())) {
      days.push({
        date: formatDate(d),
        day: d.getDate(),
        isCurrentMonth: d.getMonth() === currentMonth.month,
      });
      d = addDays(d, 1);
    }
    return days;
  }, [currentMonth]);

  // Week days for week view
  const weekDays = useMemo(() => {
    const days: { date: string; day: number; dayName: string; monthName: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      days.push({
        date: formatDate(d),
        day: d.getDate(),
        dayName: DAYS[d.getDay()],
        monthName: MONTHS[d.getMonth()].slice(0, 3),
      });
    }
    return days;
  }, [weekStart]);

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [selectedDate]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Schedule</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === "month" ? "week" : "month")}
              className="flex items-center gap-1 border border-primary text-primary px-2.5 py-2 rounded-lg text-sm font-medium"
            >
              {viewMode === "month" ? (
                <LayoutList className="h-4 w-4" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setShowNewJob(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Job
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      {viewMode === "month" ? (
        <div className="px-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1.5 text-muted-foreground">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={goToToday} className="text-sm font-semibold">
              {MONTHS[currentMonth.month]} {currentMonth.year}
            </button>
            <button onClick={nextMonth} className="p-1.5 text-muted-foreground">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-medium text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((d) => {
              const count = jobCounts[d.date] || 0;
              const isSelected = d.date === selectedDate;
              const isToday = d.date === today;
              return (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={cn(
                    "relative flex flex-col items-center py-1.5 rounded-lg text-sm transition-colors",
                    !d.isCurrentMonth && "text-muted-foreground/40",
                    d.isCurrentMonth && "text-foreground",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && isToday && "bg-primary/10 text-primary font-semibold"
                  )}
                >
                  <span className="text-xs">{d.day}</span>
                  {count > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {count <= 3 ? (
                        Array.from({ length: count }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 w-1 rounded-full",
                              isSelected ? "bg-primary-foreground" : "bg-primary"
                            )}
                          />
                        ))
                      ) : (
                        <span
                          className={cn(
                            "text-[8px] font-bold leading-none",
                            isSelected ? "text-primary-foreground" : "text-primary"
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="px-4">
          {/* Week nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevWeek} className="p-1.5 text-muted-foreground">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={goToToday} className="text-sm font-semibold">
              Week of{" "}
              {new Date(weekDays[0].date + "T12:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              )}
            </button>
            <button onClick={nextWeek} className="p-1.5 text-muted-foreground">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Week columns */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const count = jobCounts[d.date] || 0;
              const isSelected = d.date === selectedDate;
              const isToday = d.date === today;
              return (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={cn(
                    "flex flex-col items-center py-2 rounded-xl transition-colors",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && isToday && "bg-primary/10",
                    !isSelected && !isToday && "bg-card border border-border"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      isSelected
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {d.dayName}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold",
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {d.day}
                  </span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold mt-0.5",
                        isSelected ? "text-primary-foreground/80" : "text-primary"
                      )}
                    >
                      {count} job{count !== 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day jobs */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">
            {selectedDateLabel}
          </h2>
          {selectedDate === today && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Today
            </span>
          )}
        </div>

        {!selectedDayJobs ? (
          <p className="text-sm text-muted-foreground text-center mt-6">
            Loading...
          </p>
        ) : selectedDayJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No jobs scheduled yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-4">
              Add clients first, then schedule jobs from the Route tab to fill your calendar.
            </p>
            <button
              onClick={() => setShowNewJob(true)}
              className="text-primary text-sm font-medium"
            >
              Add a job
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayJobs.map(({ job, client, property, services }) => (
              <JobCard
                key={job.id}
                job={job}
                client={client}
                property={property}
                services={services}
                onReschedule={() => setRescheduleJob(job)}
              />
            ))}
          </div>
        )}
      </div>

      {showNewJob && (
        <NewJobModal
          defaultDate={selectedDate}
          onClose={() => setShowNewJob(false)}
          onCreated={(date) => setSelectedDate(date)}
        />
      )}

      {rescheduleJob && (
        <RescheduleModal
          job={rescheduleJob}
          onClose={() => setRescheduleJob(null)}
          onMoved={(newDate) => {
            setRescheduleJob(null);
            setSelectedDate(newDate);
          }}
        />
      )}
    </div>
  );
}

/* ─── Job Card ─── */

function JobCard({
  job,
  client,
  property,
  services,
  onReschedule,
}: {
  job: Job;
  client: Client;
  property?: Property;
  services: string[];
  onReschedule?: () => void;
}) {
  const navigate = useNavigate();

  const statusStyle = cn(
    "text-[10px] px-2 py-0.5 rounded-full font-medium",
    job.status === "completed" && "bg-green-100 text-green-700",
    job.status === "scheduled" && "bg-blue-100 text-blue-700",
    job.status === "in_progress" && "bg-yellow-100 text-yellow-700",
    job.status === "skipped" && "bg-gray-100 text-gray-500",
    job.status === "cancelled" && "bg-red-100 text-red-600"
  );

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3">
      {onReschedule && job.status === "scheduled" && (
        <button
          onClick={onReschedule}
          className="shrink-0 flex items-center justify-center text-muted-foreground active:text-primary touch-none"
          title="Reschedule"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={() => navigate(`/clients/${client.id}`)}
        className="flex-1 min-w-0 flex items-center gap-3 text-left active:opacity-70"
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
          {client.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{client.name}</span>
            <span className={statusStyle}>{job.status.replace("_", " ")}</span>
          </div>
          {property?.address && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {property.address}
            </p>
          )}
          {services.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {services.map((s) => (
                <span
                  key={s}
                  className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

/* ─── Reschedule Modal ─── */

function RescheduleModal({
  job,
  onClose,
  onMoved,
}: {
  job: Job;
  onClose: () => void;
  onMoved: (newDate: string) => void;
}) {
  const [newDate, setNewDate] = useState(job.scheduledDate);

  const handleMove = async () => {
    if (newDate === job.scheduledDate) {
      onClose();
      return;
    }
    await db.jobs.update(job.id!, {
      scheduledDate: newDate,
      updatedAt: new Date(),
    });
    // Also update route stop if one exists
    const stop = await db.routeStops.where("jobId").equals(job.id!).first();
    if (stop) {
      await db.routeStops.update(stop.id!, { routeDate: newDate });
    }
    onMoved(newDate);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-4 pb-2 border-b border-border">
          <h2 className="text-lg font-bold">Reschedule Job</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Current date
            </label>
            <p className="text-sm font-medium">{job.scheduledDate}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Move to *
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleMove}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm"
          >
            {newDate === job.scheduledDate ? "Cancel" : "Move Job"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── New Job Modal ─── */

type RecurrenceType = "none" | "weekly" | "biweekly" | "monthly";

function NewJobModal({
  defaultDate,
  onClose,
  onCreated,
}: {
  defaultDate: string;
  onClose: () => void;
  onCreated: (date: string) => void;
}) {
  const [step, setStep] = useState<"client" | "property" | "details">("client");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [recurrenceCount, setRecurrenceCount] = useState(8);
  const [saving, setSaving] = useState(false);

  const clients = useLiveQuery(async () => {
    const all = await db.clients.orderBy("name").toArray();
    if (!search || step !== "client") return all;
    const q = search.toLowerCase();
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [search, step]);

  const clientProperties = useLiveQuery(async () => {
    if (!selectedClient?.id) return [];
    return db.properties.where("clientId").equals(selectedClient.id).toArray();
  }, [selectedClient]);

  const serviceItems = useLiveQuery(async () => {
    const all = await db.serviceItems.toArray();
    return all.filter((s) => s.active);
  });

  const toggleService = (id: number) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSearch("");
    // Auto-advance: if client has only one property, skip property step
    // We'll check in the next render via useEffect-like logic
    setStep("property");
  };

  const handleCreate = async () => {
    if (!selectedClient?.id || !selectedProperty?.id || saving) return;
    setSaving(true);

    const now = new Date();
    const dates = [date];

    if (recurrence !== "none") {
      for (let i = 1; i < recurrenceCount; i++) {
        const base = new Date(date + "T12:00:00");
        if (recurrence === "weekly") base.setDate(base.getDate() + 7 * i);
        else if (recurrence === "biweekly") base.setDate(base.getDate() + 14 * i);
        else if (recurrence === "monthly") base.setMonth(base.getMonth() + i);
        dates.push(formatDate(base));
      }

      const rrule =
        recurrence === "weekly"
          ? "FREQ=WEEKLY"
          : recurrence === "biweekly"
            ? "FREQ=WEEKLY;INTERVAL=2"
            : "FREQ=MONTHLY";

      await db.recurringSchedules.add({
        clientId: selectedClient.id,
        propertyId: selectedProperty.id,
        rrule,
        serviceItemIds: selectedServices,
        active: true,
        createdAt: now,
      });
    }

    for (const d of dates) {
      const jobId = (await db.jobs.add({
        clientId: selectedClient.id,
        propertyId: selectedProperty.id,
        status: "scheduled",
        scheduledDate: d,
        notes: notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      })) as number;

      for (const svcId of selectedServices) {
        const svc = await db.serviceItems.get(svcId);
        if (!svc) continue;
        await db.jobLineItems.add({
          jobId,
          serviceItemId: svcId,
          description: svc.name,
          quantity: 1,
          unitPrice: svc.defaultPrice,
        });
      }
    }

    onCreated(date);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        <div className="sticky top-0 bg-background flex items-center justify-between p-4 pb-2 border-b border-border z-10">
          <h2 className="text-lg font-bold">
            {step === "client"
              ? "New Job"
              : step === "property"
                ? `Pick Property — ${selectedClient?.name}`
                : `Job for ${selectedClient?.name}`}
          </h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "client" ? (
          <div className="p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              {clients?.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className="w-full text-left p-3 rounded-xl border border-border flex items-center gap-3 active:bg-accent transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {client.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {client.name}
                    </p>
                  </div>
                </button>
              ))}
              {clients?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No clients found
                </p>
              )}
            </div>
          </div>
        ) : step === "property" ? (
          <div className="p-4">
            <div className="space-y-1.5">
              {clientProperties?.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => {
                    setSelectedProperty(prop);
                    setStep("details");
                  }}
                  className="w-full text-left p-3 rounded-xl border border-border flex items-center gap-3 active:bg-accent transition-colors"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{prop.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {prop.address}
                    </p>
                  </div>
                </button>
              ))}
              {clientProperties?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No properties for this client
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setSelectedClient(null);
                setStep("client");
              }}
              className="mt-3 text-sm text-muted-foreground"
            >
              Back to clients
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Services */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Services
              </label>
              <div className="flex flex-wrap gap-1.5">
                {serviceItems?.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => toggleService(svc.id!)}
                    className={cn(
                      "text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors",
                      selectedServices.includes(svc.id!)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {svc.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional job notes..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Recurrence */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5" />
                Repeat
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {(
                  [
                    ["none", "One-time"],
                    ["weekly", "Weekly"],
                    ["biweekly", "Biweekly"],
                    ["monthly", "Monthly"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setRecurrence(val)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
                      recurrence === val
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {recurrence !== "none" && (
                <div className="mt-2">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Create {recurrenceCount} occurrences
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={26}
                    value={recurrenceCount}
                    onChange={(e) =>
                      setRecurrenceCount(Number(e.target.value))
                    }
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>2</span>
                    <span>{recurrenceCount} jobs</span>
                    <span>26</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setStep("property")}
                className="flex-1 py-3 rounded-xl font-medium text-sm border border-border text-foreground"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm disabled:opacity-50"
              >
                {saving
                  ? "Creating..."
                  : recurrence !== "none"
                    ? `Create ${recurrenceCount} Jobs`
                    : "Create Job"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
