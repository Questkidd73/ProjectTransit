# Project Transit — Budget & Transfer Request Management

Project Transit replaces the old Google Sheets "Monthly Transfer Request" workflow with a proper web app. It lets international ministry sites plan monthly spending, submit transfer requests, and lets Finance review/approve and record disbursements — all backed by Supabase (Postgres + Auth).

**Live app:** https://projectransit.vercel.app
**Repo:** https://github.com/Questkidd73/ProjectTransit

---

## 1. How the app works (user-facing)

### Roles

| Role | Can do |
|---|---|
| `site_staff` | Build a monthly Spending Plan, submit Transfer Requests (budget or in/out), view own site's request history, confirm receipt of funds |
| `finance` | Everything site_staff can do (view-only across sites where relevant) + review/approve/request-changes on submitted requests, record disbursements, view budget vs. actual |
| `admin` | Everything above + manage users, sites, programs, and exchange rates |

### Core workflow

```
Site Staff                          Finance
-----------                         -------
1. Build Spending Plan (by month)
2. Save → creates a DRAFT
   Transfer Request automatically
3. Submit request          ───────▶ 4. Review request
                                       - Approve, or
                            ◀───────    - Request changes
5. (if changes requested)
   Edit & resubmit          ───────▶ 4. Review again
                                     6. Approve
                                     7. Record disbursement (funds sent)
8. Confirm receipt of funds
```

Request status lifecycle:
```
draft → submitted → (changes_requested ⇄ submitted) → approved → sent → received
```

### Key screens

**Site (`/site/...`)**
- `SiteDashboard` — overview + recent requests
- `SpendingPlan` — plan monthly expenses per Program → Producto → Clase → Category, against the synced budget ceiling. Saving creates/updates a draft Transfer Request. Selected month/year persists in `localStorage` so switching screens doesn't lose your place (only defaults to January on a fresh page load).
- `NewRequest` — create/edit a transfer request (also used by Finance's edit flow)
- `RequestDetail` — view a single request, confirm receipt, edit/amend if draft or changes-requested
- `RequestHistory` — all requests for the site, filterable by status
- `InOutRequest` — separate request type for in/out (non-budget) transfers
- `YTDReport` — year-to-date spend vs. budget reporting

**Finance (`/finance/...`)**
- `FinanceDashboard` — queue of pending requests across sites
- `BudgetView` — Producto → Clase → Category hierarchy of budget line items per site
- `ReviewRequest` — approve / request changes / edit / delete
- `RecordDisbursement` — mark funds as sent (amount, date, method, reference)

**Admin (`/admin/...`)**
- `Users` — manage roles + site assignments
- `Sites` — manage sites, currencies, exchange rates
- `Programs` — manage programs per site
- `ExchangeRates` — update exchange rates

---

## 2. How the app is built (technical)

### Stack
- **React 18 + TypeScript + Vite**
- **Supabase** — Postgres database, Auth, and Row-Level Security (RLS) for role-based access
- **React Query** (`@tanstack/react-query`) — all data fetching/caching
- **React Router v6** — routing, guarded by `ProtectedRoute` (role-based)
- **TailwindCSS + Lucide icons** — styling/UI

### Project structure
```
app/
├── src/
│   ├── contexts/AuthContext.tsx      # session, profile, sign-in/out
│   ├── components/
│   │   ├── Layout.tsx                # sidebar nav, role-aware
│   │   └── ProtectedRoute.tsx        # auth + role guard
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client (uses VITE_ env vars)
│   │   └── utils.ts                  # formatCurrency, formatDate, cn(), etc.
│   ├── pages/{site,finance,admin}/   # see screens above
│   ├── types/index.ts                # shared TS types + enums/constants
│   └── App.tsx                       # route table
├── supabase/
│   ├── schema.sql                    # full DB schema (tables, RLS, triggers) — run once on a new project
│   ├── migrate_add_*.sql             # incremental migrations applied after schema.sql
│   ├── seed.sql / reseed_programs.sql
│   ├── budget_sync_service.py        # Google Sheets → Supabase budget sync (see below)
│   └── .env / service_account.json   # NOT committed (gitignored) — sync service credentials
├── .env                               # NOT committed — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
└── README.md                         # app-level setup instructions
```

### Data model (high level)
- `sites` — one row per ministry site (currency, exchange rate)
- `programs` — belong to a site
- `budget_lines` / `budget_line_items` — the approved budget, synced in from Google Sheets via `budget_sync_service.py`
- `spending_plan_items` — the site's monthly plan (Producto/Clase/Category breakdown), drafted before submission
- `transfer_requests` + `request_line_items` — the actual submitted request (budget or in/out type)
- `disbursements` — funds-sent record tied to a request
- `site_productos` / `site_clases` / `site_categories` — master dropdown lists per site, also synced from the sheet's Setup tab
- `profiles` — extends Supabase `auth.users` with role + site assignment

RLS policies enforce: site_staff can only see/edit their own site's data (and only drafts/changes-requested for edit/delete); finance/admin have broader access.

### Budget sync service (`app/supabase/budget_sync_service.py`)
A standalone Python script (not part of the deployed web app) that reads the legacy "Local Budget by Program" Google Sheet and the "Setup" tab, and upserts into `budget_line_items`, `site_productos`, `site_clases`, and `site_categories`. This is how each site's approved budget ceiling gets into the app. Run manually or on a schedule (cron) wherever it's hosted — it needs `service_account.json` (Google service account) and Supabase service-role credentials, both of which are gitignored and must be provisioned separately from the web app.

### Deployment
- **Frontend:** Vercel, auto-deploys from the `main` branch of `Questkidd73/ProjectTransit`
  - Root Directory: `app`
  - Build Command: `npm run build` (runs `tsc && vite build` — build fails on any TS error)
  - Env vars set in Vercel dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Backend:** Supabase project (hosted) — schema managed via SQL files in `app/supabase/`, applied manually through the Supabase SQL Editor
- **Budget sync:** runs separately (currently manual/local) — not deployed to Vercel

### Local development
```bash
cd app
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

---

## 3. Current status

- Core request lifecycle (draft → submit → review → approve → disburse → receive) — **working**
- Spending Plan with Producto/Clase/Category hierarchy, budget ceiling comparison, and localStorage month/year persistence — **working**
- Site/Finance/Admin role separation with RLS — **working**
- Edit/delete permissions for drafts, changes-requested, and finance overrides — **working**
- Budget sync from Google Sheets — **working**, but run manually/locally (not scheduled)
- Deployed to Vercel, connected to production Supabase — **live**
- Users provisioned manually per-site in Supabase (`profiles` table) — **manual process today**

## 4. Suggested next steps

1. **Automate the budget sync** — host `budget_sync_service.py` somewhere it can run on a schedule (e.g. a small cron job on existing sync infrastructure), instead of running it manually.
2. **Streamline user onboarding** — right now adding a user requires manually inserting into `profiles` via the Supabase Table Editor. Consider an Admin UI flow (invite + auto-assign role/site) to remove that manual step.
3. **Rotate/secure the sync credentials** — `service_account.json` and the Supabase service-role key used by the sync script should live somewhere safer than a local `.env`/JSON file if this becomes a recurring, unattended job.
4. **Add basic notifications** — e.g. email when a request is submitted, changes are requested, or funds are disbursed, so Finance/Site staff don't have to poll the app.
5. **Testing pass with real users** — now that a couple of accounts are set up, do a walkthrough of the full lifecycle (spending plan → submit → approve → disburse → receive) with an actual site user to catch UX gaps.
6. **Custom domain (optional)** — replace `projectransit.vercel.app` with a branded domain if this becomes long-term infrastructure.
