-- Add initial coin and prize count columns to machines table
ALTER TABLE machines 
ADD COLUMN initial_coin_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN initial_prize_count INTEGER DEFAULT 0 NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN machines.initial_coin_count IS 'Initial coin count reading when machine was installed';
COMMENT ON COLUMN machines.initial_prize_count IS 'Initial prize count reading when machine was installed';