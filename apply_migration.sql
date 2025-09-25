-- Apply doll price history migration manually
-- Run this in your Supabase SQL Editor

-- Add doll price history table for dynamic pricing
BEGIN;

-- Create doll_price_history table
CREATE TABLE IF NOT EXISTS public.doll_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  effective_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_doll_price_history_machine_date ON public.doll_price_history(machine_id, effective_date DESC);

-- Enable RLS
ALTER TABLE public.doll_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Authenticated users can manage doll price history" ON public.doll_price_history;
CREATE POLICY "Authenticated users can manage doll price history" ON public.doll_price_history
  FOR ALL TO authenticated USING (true);

-- Add update trigger
DROP TRIGGER IF EXISTS update_doll_price_history_updated_at ON public.doll_price_history;
CREATE TRIGGER update_doll_price_history_updated_at
  BEFORE UPDATE ON public.doll_price_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing doll prices to history table (only if not already migrated)
INSERT INTO public.doll_price_history (machine_id, price, effective_date, created_by)
SELECT 
  id as machine_id,
  doll_price as price,
  installation_date as effective_date,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM public.machines
WHERE doll_price IS NOT NULL
  AND id NOT IN (SELECT DISTINCT machine_id FROM public.doll_price_history);

COMMIT;