-- Add machine settings history table for all dynamic fields
BEGIN;

-- Create machine_settings_history table
CREATE TABLE IF NOT EXISTS public.machine_settings_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT NOT NULL,
  effective_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_machine_settings_history_machine_field_date ON public.machine_settings_history(machine_id, field_name, effective_date DESC);

-- Enable RLS
ALTER TABLE public.machine_settings_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Authenticated users can manage machine settings history" ON public.machine_settings_history
  FOR ALL TO authenticated USING (true);

-- Add update trigger
CREATE TRIGGER update_machine_settings_history_updated_at
  BEFORE UPDATE ON public.machine_settings_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing machine settings to history table
INSERT INTO public.machine_settings_history (machine_id, field_name, field_value, effective_date, created_by)
SELECT 
  id as machine_id,
  'coin_price' as field_name,
  coin_price::text as field_value,
  installation_date as effective_date,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM public.machines
WHERE coin_price IS NOT NULL
UNION ALL
SELECT 
  id as machine_id,
  'doll_price' as field_name,
  doll_price::text as field_value,
  installation_date as effective_date,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM public.machines
WHERE doll_price IS NOT NULL
UNION ALL
SELECT 
  id as machine_id,
  'electricity_cost' as field_name,
  electricity_cost::text as field_value,
  installation_date as effective_date,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM public.machines
WHERE electricity_cost IS NOT NULL
UNION ALL
SELECT 
  id as machine_id,
  'vat_percentage' as field_name,
  vat_percentage::text as field_value,
  installation_date as effective_date,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM public.machines
WHERE vat_percentage IS NOT NULL
UNION ALL
SELECT 
  id as machine_id,
  'maintenance_percentage' as field_name,
  maintenance_percentage::text as field_value,
  installation_date as effective_date,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM public.machines
WHERE maintenance_percentage IS NOT NULL
UNION ALL
SELECT 
  id as machine_id,
  'profit_share_percentage' as field_name,
  profit_share_percentage::text as field_value,
  installation_date as effective_date,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM public.machines
WHERE profit_share_percentage IS NOT NULL
UNION ALL
SELECT 
  id as machine_id,
  'duration' as field_name,
  duration as field_value,
  installation_date as effective_date,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM public.machines
WHERE duration IS NOT NULL;

COMMIT;