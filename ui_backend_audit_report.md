# UI-Backend Consistency Audit Report

## Audit Overview
I have performed a comprehensive audit of the frontend UI pages and their interaction logic with the backend API. While the project has a very high degree of consistency in its data structures and service definitions, there are several significant integration gaps where UI components are still using legacy `localStorage` instead of the fully implemented backend APIs.

---

## 🚨 Critical Integration Gaps

### 1. Case/Report Management (Decoupled)
The most significant inconsistency is in the core report management flow.
- **Pages Affected**: `Dashboard.tsx`, `DiagnosisWizard.tsx`, `MyCasesPage.tsx`.
- **Observation**: These pages rely on `src/store/cases.ts`, which is currently backed by `localStorage` and seeded with mock data.
- **Backend State**: `server/routes/reports.ts` provides a full CRUD API for reports, which is currently ignored by the main user flow.
- **Impact**: Reports created by users are only stored locally in their browser and are not visible to workers or persisted in the database.

### 2. Password Validation Mismatch
- **Observation**: `LoginPage.tsx` validates passwords for a minimum length of **6** characters.
- **Backend State**: `server/routes/auth.ts` (via Zod schema) enforces a minimum of **8** characters.
- **Impact**: Users might see "Register Success" in frontend validation but get an API error when submitting, leading to a frustrating experience.

---

## ✅ Consistent & Integrated Flows

The follows flows are well-integrated and use the backend APIs correctly:
- **Authentication**: `AuthContext` uses `api.ts` for login/register (minus the validation length bug).
- **Worker Portal**: Worker registration and dashboard/portal logic are fully integrated with `server/routes/workers.ts` and `server/routes/worker-portal.ts`.
- **Community**: The `CommunityPage.tsx` uses TanStack Query hooks integrated with `api.ts`.
- **Notifications**: `NotificationsPage.tsx` correctly fetches and manages notifications via the backend.
- **Messages**: `ConversationsPage.tsx` and `ChatPage.tsx` are integrated with the Messages API.
- **Payments**: `OrdersPage.tsx` and the WeChat Pay mock integration are consistent with the backend logic.

---

## ⚠️ Missing UI Pages for Backend Routes

The following backend routes are implemented but lack corresponding frontend UI pages:
- **Assets**: `server/routes/assets.ts` exists, but there is no `AssetsPage` or equipment management UI.
- **AI Repair Plans**: While the backend can generate plans via `/reports/:id/plan`, the frontend doesn't yet have a dedicated view for these generated repair plans (beyond simple status displays).

---

## 🛠️ Recommended Fixes

1.  **Refactor `src/store/cases.ts`**: Update the store to act as a wrapper for the `Reports` API instead of `localStorage`.
2.  **Update Frontend Validation**: Align `LoginPage.tsx` password validation with the backend (8 characters).
3.  **Bridge DiagnosisWizard**: Ensure the final step of the wizard calls `api.createReport()` to persist the report to the database.
4.  **Implement Assets UI**: Create a page to allow users to manage their home appliances/systems using the existing Assets API.
