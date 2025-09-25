-- Split profit share into owner and clowee, and add change logs
begin;

-- Add new columns to machines
alter table public.machines
  add column if not exists owner_profit_share_percentage numeric not null default 0,
  add column if not exists clowee_profit_share_percentage numeric not null default 0;

-- Backfill if a legacy column exists
-- If profit_share_percentage existed and was non-null, assign it to clowee share by default
update public.machines
set clowee_profit_share_percentage = coalesce(profit_share_percentage, 0),
    owner_profit_share_percentage = case when coalesce(profit_share_percentage, 0) > 0 then 0 else owner_profit_share_percentage end
where true;

-- Create change logs table
create table if not exists public.machine_change_logs (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_machine_change_logs_machine_id on public.machine_change_logs(machine_id);
create index if not exists idx_machine_change_logs_created_at on public.machine_change_logs(created_at desc);

-- Extend pay_to_clowee with share breakdown
alter table public.pay_to_clowee
  add column if not exists owner_profit_share_amount numeric not null default 0,
  add column if not exists clowee_profit_share_amount numeric not null default 0;

commit;

