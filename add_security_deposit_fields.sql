-- Add security deposit fields to machines table
-- Run this in your Supabase SQL Editor

BEGIN;

-- Add security deposit fields to machines table
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS security_deposit_type TEXT CHECK (security_deposit_type IN ('cheque', 'cash', 'other')),
ADD COLUMN IF NOT EXISTS security_deposit_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS security_deposit_notes TEXT;

COMMIT;