-- Final Schema Migration: Remove initial counts from machines, add notes to reports

-- 1. Add notes column to machine_counter_reports if it doesn't exist
ALTER TABLE machine_counter_reports 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Remove initial count columns from machines table if they exist
ALTER TABLE machines 
DROP COLUMN IF EXISTS initial_coin_count,
DROP COLUMN IF EXISTS initial_prize_count;

-- 3. Update the complete schema comment
COMMENT ON TABLE machine_counter_reports IS 'Stores daily counter readings including initial setup readings with notes';
COMMENT ON COLUMN machine_counter_reports.notes IS 'Optional notes for the counter reading, used for setup history and other remarks';