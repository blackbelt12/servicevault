# Release Checklist

Use this runbook before each production deploy to Vercel.

## 1) Lint and build verification

Run these checks from the repository root and confirm they pass with no errors:

```bash
npm install
npm run lint
npm run build
```

If either command fails:
- Fix the issue before deploying.
- Re-run the command until clean.
- Do not ship with lint/build failures.

## 2) Installability test (PWA)

Validate that users can install the app on at least:
- One Chromium browser (Desktop or Android)
- One iOS device/browser path you support

Smoke test steps:
1. Open the production preview URL.
2. Confirm install prompt/menu option appears.
3. Install the app to home screen/device.
4. Launch the installed app.
5. Confirm the app boots and key navigation tabs work.

## 3) Offline-mode test

Because ServiceVault is designed for offline-first usage, verify core flows without network:

1. Open the app and create/update sample data (client, job, invoice).
2. Disable network in browser devtools (or device airplane mode).
3. Refresh/reopen the app.
4. Confirm previously created data still loads.
5. Confirm you can still create/edit records while offline.
6. Re-enable network and confirm app remains stable.

## 4) Backup export/import smoke test

Validate data safety before release:

1. In the app, create representative sample records.
2. Export data to JSON using the built-in export action.
3. Clear local app data (or use a fresh browser profile).
4. Import the exported JSON file.
5. Confirm clients/jobs/invoices/settings restore correctly.
6. Confirm no obvious duplication or corruption.

## 5) Post-deploy rollback notes

If a deploy causes critical issues:

1. In Vercel, identify the last known good production deployment.
2. Promote/rollback to that deployment immediately.
3. Confirm the app is accessible and core workflows function.
4. Post incident notes in your team channel/issue tracker:
   - Bad deployment URL/commit
   - Rollback target URL/commit
   - User impact window
   - Follow-up fix owner
5. Open a follow-up patch before retrying production deploy.

---

## Known limitations (share with users)

- **Local-only storage:** All records are stored in the user’s browser on their device.
- **No cloud sync:** Data is not automatically synced across devices/accounts.
- **Backup responsibility:** Users should export backups regularly, especially before switching devices or clearing browser data.
