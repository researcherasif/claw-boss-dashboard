# Clawee Business Management

Vite + React + TypeScript app for managing claw machines: machines, daily reports, payments to Clowee, and invoices.

## Prerequisites
- Node.js 18+ and npm

## Setup
1. Copy environment variables:
```sh
cp .env.example .env
```
2. Fill `.env`:
```ini
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
3. Install dependencies and run:
```sh
npm ci
npm run dev
```

## Features
- Authentication (Supabase). First login auto-creates `profiles` row with role `admin`.
- Role-based layout guard. All admins view all pages.
- Dashboard: machine stats, trend chart, quick actions.
- Add Machine: create machine with pricing and settings.
- Machine Report: enter daily coin/prize counts; updates existing entry if present.
- Pay to Clowee: select machine + date range; calculates breakdown and saves record.
- Invoices: generate invoice from saved payments; download PDF with signature area.

## Database Tables
- `profiles`: id (auth uid), name, role
- `machines`: pricing/settings per machine
- `machine_reports`: per-day coin/prize counts
- `pay_to_clowee`: saved calculations per period
- `invoices`: generated invoices per payment record

Migrations live in `supabase/migrations`.
