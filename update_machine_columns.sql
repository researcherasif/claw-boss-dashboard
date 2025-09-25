-- Update machine table columns and add franchise profit share
-- Run this in your Supabase SQL Editor

BEGIN;

-- Add franchise_profit_share_percentage and clowee_profit_share_percentage columns
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS franchise_profit_share_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS clowee_profit_share_percentage DECIMAL(5,2) DEFAULT 0;

-- Migrate existing profit_share_percentage to clowee_profit_share_percentage
UPDATE public.machines 
SET clowee_profit_share_percentage = COALESCE(profit_share_percentage, 0)
WHERE clowee_profit_share_percentage = 0;

COMMIT;