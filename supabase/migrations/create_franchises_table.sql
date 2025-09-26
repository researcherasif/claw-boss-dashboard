-- Add missing columns to existing franchises table
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS franchise_name TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS coin_price DECIMAL(10,2);
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS doll_price DECIMAL(10,2);
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS electricity_cost DECIMAL(10,2);
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS franchise_profit_share_percentage DECIMAL(5,2);
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS clowee_profit_share_percentage DECIMAL(5,2);
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS maintenance_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS trade_license TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS proprietor_nid TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS payment_duration TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS security_deposit_type TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS security_deposit_notes TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS agreement_copy_url TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS trade_nid_attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

