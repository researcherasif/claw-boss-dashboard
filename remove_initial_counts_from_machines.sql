-- Remove initial count columns from machines table
ALTER TABLE machines 
DROP COLUMN IF EXISTS initial_coin_count,
DROP COLUMN IF EXISTS initial_prize_count;