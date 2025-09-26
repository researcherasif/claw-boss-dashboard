-- Required Migration: Remove initial counts from machines, add notes to reports

-- Add notes column to machine_counter_reports
ALTER TABLE machine_counter_reports 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Remove old columns from machines table
ALTER TABLE machines 
DROP COLUMN IF EXISTS initial_coin_count,
DROP COLUMN IF EXISTS initial_prize_count,
DROP COLUMN IF EXISTS profit_share_percentage,
DROP COLUMN IF EXISTS owner_profit_share_percentage;