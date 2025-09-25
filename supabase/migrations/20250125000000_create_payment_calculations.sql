-- Create payment_calculations table
CREATE TABLE IF NOT EXISTS payment_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_time TIME NOT NULL DEFAULT CURRENT_TIME,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    machine_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_coins INTEGER NOT NULL DEFAULT 0,
    total_prizes INTEGER NOT NULL DEFAULT 0,
    total_income DECIMAL(10,2) NOT NULL DEFAULT 0,
    prize_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    electricity_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    maintenance_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    profit_share_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    pay_to_clowee DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_calculations_machine_id ON payment_calculations(machine_id);
CREATE INDEX IF NOT EXISTS idx_payment_calculations_entry_date ON payment_calculations(entry_date);
CREATE INDEX IF NOT EXISTS idx_payment_calculations_created_by ON payment_calculations(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_calculations_date_range ON payment_calculations(start_date, end_date);

-- Enable RLS (Row Level Security)
ALTER TABLE payment_calculations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own payment calculations" ON payment_calculations
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own payment calculations" ON payment_calculations
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own payment calculations" ON payment_calculations
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own payment calculations" ON payment_calculations
    FOR DELETE USING (auth.uid() = created_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_calculations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_payment_calculations_updated_at
    BEFORE UPDATE ON payment_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_calculations_updated_at();
