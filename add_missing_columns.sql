-- Add missing columns to existing machines table
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS initial_coin_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS initial_prize_count INTEGER DEFAULT 0 NOT NULL;