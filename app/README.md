# Project Transit — Budget Management App

A React + TypeScript + Vite app for managing international budget transfer requests across multiple ministry sites.

## Stack

- **React 18** + **TypeScript**
- **Vite** build tool
- **Supabase** (auth + database)
- **React Query** (`@tanstack/react-query`) for data fetching
- **React Router v6** for routing
- **TailwindCSS** + **Lucide React** icons

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Supabase project credentials:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up the database

In your Supabase project, open the **SQL Editor** and run the full contents of:

```
supabase/schema.sql
```

This creates all tables, RLS policies, indexes, and the auto-profile trigger.

### 4. Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Project Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Auth state, user profile, sign-in/out
├── components/
│   ├── Layout.tsx               # Sidebar layout with role-based nav
│   └── ProtectedRoute.tsx       # Auth + role guard for routes
├── lib/
│   ├── supabase.ts              # Supabase client
│   └── utils.ts                 # cn(), formatCurrency(), formatDate()
├── pages/
│   ├── Login.tsx
│   ├── site/
│   │   ├── SiteDashboard.tsx    # Overview + recent requests
│   │   ├── NewRequest.tsx       # Create transfer request
│   │   ├── RequestDetail.tsx    # View request + confirm receipt
│   │   └── RequestHistory.tsx   # All requests for site
│   ├── finance/
│   │   ├── FinanceDashboard.tsx # Pending requests queue
│   │   ├── ReviewRequest.tsx    # Approve / request changes
│   │   └── RecordDisbursement.tsx # Mark funds as sent
│   └── admin/
│       ├── AdminDashboard.tsx   # Global overview
│       ├── Users.tsx            # Manage user roles + site assignments
│       ├── Sites.tsx            # Manage sites + currencies
│       ├── Programs.tsx         # Manage programs per site
│       └── ExchangeRates.tsx    # Update exchange rates
├── types/
│   └── index.ts                 # All TypeScript interfaces + constants
├── App.tsx                      # Route definitions
├── main.tsx                     # Entry point (QueryClient + AuthProvider)
└── index.css                    # TailwindCSS + component utility classes
```

## User Roles

| Role | Access |
|------|--------|
| `site_staff` | Submit requests, view own site history, confirm receipt |
| `finance` | Review/approve requests, record disbursements |
| `admin` | Full access + user/site/program management |

## Request Lifecycle

```
draft → submitted → (changes_requested →) approved → sent → received
```

## Building for production

```bash
npm run build
```

Output is in `dist/`.
