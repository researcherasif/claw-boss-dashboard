-- Create franchises table
CREATE TABLE IF NOT EXISTS franchises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_name TEXT NOT NULL,
    coin_price DECIMAL(10,2) NOT NULL,
    doll_price DECIMAL(10,2) NOT NULL,
    electricity_cost DECIMAL(10,2) NOT NULL,
    vat_percentage DECIMAL(5,2) DEFAULT 0,
    franchise_profit_share_percentage DECIMAL(5,2) NOT NULL,
    clowee_profit_share_percentage DECIMAL(5,2) NOT NULL,
    maintenance_percentage DECIMAL(5,2) DEFAULT 0,
    trade_license TEXT,
    proprietor_nid TEXT,
    payment_duration TEXT NOT NULL CHECK (payment_duration IN ('half_month', 'full_month')),
    security_deposit_type TEXT CHECK (security_deposit_type IN ('cheque', 'cash', 'other')),
    security_deposit_notes TEXT,
    agreement_copy_url TEXT,
    trade_nid_attachments JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update machines table to reference franchises
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id),
ADD COLUMN IF NOT EXISTS machine_id_esp TEXT;

-- Drop columns that might exist
DO $$
BEGIN
    -- Drop old pricing columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'coin_price') THEN
        ALTER TABLE machines DROP COLUMN coin_price;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'doll_price') THEN
        ALTER TABLE machines DROP COLUMN doll_price;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'electricity_cost') THEN
        ALTER TABLE machines DROP COLUMN electricity_cost;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'vat_percentage') THEN
        ALTER TABLE machines DROP COLUMN vat_percentage;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'franchise_profit_share_percentage') THEN
        ALTER TABLE machines DROP COLUMN franchise_profit_share_percentage;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'clowee_profit_share_percentage') THEN
        ALTER TABLE machines DROP COLUMN clowee_profit_share_percentage;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'maintenance_percentage') THEN
        ALTER TABLE machines DROP COLUMN maintenance_percentage;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'duration') THEN
        ALTER TABLE machines DROP COLUMN duration;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'security_deposit_type') THEN
        ALTER TABLE machines DROP COLUMN security_deposit_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'security_deposit_amount') THEN
        ALTER TABLE machines DROP COLUMN security_deposit_amount;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'security_deposit_notes') THEN
        ALTER TABLE machines DROP COLUMN security_deposit_notes;
    END IF;
END $$;

-- Add branch_location column if location doesn't exist
ALTER TABLE machines ADD COLUMN IF NOT EXISTS branch_location TEXT;

-- Copy data from location to branch_location if location exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'location') THEN
        UPDATE machines SET branch_location = location WHERE branch_location IS NULL;
        ALTER TABLE machines DROP COLUMN location;
    END IF;
END $$;

-- Add is_active and notes columns to machines
ALTER TABLE machines ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_franchises_active ON franchises(is_active);
CREATE INDEX IF NOT EXISTS idx_machines_franchise_id ON machines(franchise_id);

-- Enable RLS
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Allow all for authenticated users" ON franchises FOR ALL USING (auth.role() = 'authenticated');