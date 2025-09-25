-- Remove old profit_share_percentage column after migration to split columns
-- Run this in your Supabase SQL Editor AFTER ensuring all data is migrated

ALTER TABLE public.machines 
DROP COLUMN IF EXISTS profit_share_percentage;