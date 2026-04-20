# Deployment + UI Finalization Gates

Use this as a quick decision list before promoting to production.

## Must-fix before deployment

1. **Security audit follow-up**
   - `npm install` currently reports 4 high-severity vulnerabilities.
   - Run `npm audit` and either:
     - patch to safe versions, or
     - document accepted risk with compensating controls and timeline.

2. **Automated checks**
   - Keep release gate strict:
     - `npm run lint`
     - `npm run build`
   - Block deployment if either command fails.

3. **PWA readiness checks**
   - Verify install prompt + launch on Chromium and iOS.
   - Verify service worker offline launch and route navigation.

4. **Offline data integrity**
   - Create/edit records while offline, then relaunch and re-check consistency.
   - Confirm no data loss after refresh and after reconnecting.

5. **Backup/restore smoke test**
   - Export JSON, wipe local state, import JSON, verify counts/records/settings.

## UI finalization checklist

1. **Bottom tab polish**
   - Confirm active-tab affordance is visible and consistent.
   - Confirm touch targets remain accessible and readable.

2. **Responsive shell**
   - Confirm mobile-first layout on phone widths.
   - Confirm desktop/tablet framing is visually stable (spacing/shadow/radius).

3. **Accessibility pass**
   - Keyboard navigation and focus visibility on actionable controls.
   - Color contrast for muted text and status states.

4. **Content QA**
   - Remove typos and keep route headings/actions consistent.
   - Validate empty states for each major page.
