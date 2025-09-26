-- Create franchises table if it doesn't exist
CREATE TABLE IF NOT EXISTS franchises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    coin_price DECIMAL(10,2) NOT NULL,
    doll_price DECIMAL(10,2) NOT NULL,
    electricity_cost DECIMAL(10,2) NOT NULL,
    vat_percentage DECIMAL(5,2) DEFAULT 0,
    franchise_profit_share DECIMAL(5,2) NOT NULL,
    clowee_profit_share DECIMAL(5,2) NOT NULL,
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

-- Add franchise_id to machines table
ALTER TABLE machines ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id);

-- Add machine_id_esp to machines table  
ALTER TABLE machines ADD COLUMN IF NOT EXISTS machine_id_esp TEXT;

-- Rename location to branch_location in machines table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machines' AND column_name = 'location') THEN
        ALTER TABLE machines RENAME COLUMN location TO branch_location;
    END IF;
END $$;

-- Add branch_location if it doesn't exist
ALTER TABLE machines ADD COLUMN IF NOT EXISTS branch_location TEXT;

-- Add notes column to machines
ALTER TABLE machines ADD COLUMN IF NOT EXISTS notes TEXT;

-- Enable RLS on franchises
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for franchises if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'franchises' 
        AND policyname = 'Allow all for authenticated users'
    ) THEN
        CREATE POLICY "Allow all for authenticated users" ON franchises FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;