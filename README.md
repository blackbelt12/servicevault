# ServiceVault

A mobile-first Progressive Web App (PWA) for small field service businesses — lawn care, landscaping, and similar trades. Manage clients, schedule jobs, plan daily routes, generate quotes and invoices, and track payments — all offline-capable and stored locally on your device.

**Live app:** https://servicevault-eta.vercel.app

---

## Features

- **Clients** — Add, search, and manage clients with properties, tags, notes, and status (active / quote / inactive)
- **Jobs & Scheduling** — Schedule jobs per property, track status (scheduled → in progress → completed), and log notes
- **Route Planning** — Drag-and-drop daily route stops with live position tracking
- **Quotes & Invoices** — Build line-item quotes, convert to invoices, and track payment status
- **Service Items** — Maintain a catalogue of services with default pricing and categories
- **Custom Lists** — Organise clients into named lists with drag-and-drop reordering
- **Unpaid Tracker** — See all outstanding invoices at a glance
- **Export / Import** — Back up and restore all data as JSON
- **Business Settings** — Store your business name, contact info, and tax rate
- **PWA** — Installable on iOS and Android, works fully offline

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui + lucide-react |
| Local DB | Dexie.js (IndexedDB) |
| State | Zustand |
| Routing | React Router v6 |
| Drag & Drop | @dnd-kit |
| PWA | vite-plugin-pwa |
| Deployment | Vercel |

---

## Project Structure

```
src/
  components/   # Shared UI components
  db/           # Dexie database schema, types, and seed data
  layouts/      # AppLayout with bottom tab bar
  lib/          # Utility functions (cn, etc.)
  pages/        # One file per route
  store/        # Zustand stores
  App.tsx       # Router with lazy-loaded routes
  main.tsx      # Entry point
```

---

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

---

## Deploying to Vercel

Before each production release, follow the release runbook:

- [Release checklist](docs/release-checklist.md)

The checklist covers:
- lint/build verification
- installability checks
- offline-mode validation
- backup export/import smoke testing
- rollback procedure notes

---

## Data Storage

All data is stored locally in the browser via **IndexedDB** (Dexie.js). Nothing is sent to a server. Use **Export Data** in the app to back up your data as a JSON file, and **Import Data** to restore it.

## Known Limitations

- **Local-only storage:** Data stays in the browser on the current device/profile.
- **No cloud sync:** There is no automatic multi-device sync.

---

## Contributing

This is a personal project — contributions, bug reports, and suggestions are welcome via issues and pull requests.
