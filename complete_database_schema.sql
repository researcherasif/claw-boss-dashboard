-- Complete Database Schema for Clawee Business Management

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'accountant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Machines table
CREATE TABLE IF NOT EXISTS machines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_number TEXT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    coin_price DECIMAL(10,2) NOT NULL,
    doll_price DECIMAL(10,2) NOT NULL,
    electricity_cost DECIMAL(10,2) NOT NULL,
    vat_percentage DECIMAL(5,2) NOT NULL,
    maintenance_percentage DECIMAL(5,2) NOT NULL,
    clowee_profit_share_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    franchise_profit_share_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    duration TEXT NOT NULL CHECK (duration IN ('half_month', 'full_month')),
    installation_date DATE NOT NULL,
    security_deposit_type TEXT CHECK (security_deposit_type IN ('cheque', 'cash', 'other')),
    security_deposit_amount DECIMAL(10,2),
    security_deposit_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Machine Counter Reports table
CREATE TABLE IF NOT EXISTS machine_counter_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    coin_count INTEGER DEFAULT 0 NOT NULL,
    prize_count INTEGER DEFAULT 0 NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(machine_id, report_date)
);

-- 4. Machine Change Logs table
CREATE TABLE IF NOT EXISTS machine_change_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Doll Price History table
CREATE TABLE IF NOT EXISTS doll_price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Machine Settings History table
CREATE TABLE IF NOT EXISTS machine_settings_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_value TEXT NOT NULL,
    effective_date DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Pay to Clowee table
CREATE TABLE IF NOT EXISTS pay_to_clowee (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_coins INTEGER DEFAULT 0,
    total_prizes INTEGER DEFAULT 0,
    total_income DECIMAL(10,2) DEFAULT 0,
    prize_cost DECIMAL(10,2) DEFAULT 0,
    electricity_cost DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    maintenance_cost DECIMAL(10,2) DEFAULT 0,
    profit_share_amount DECIMAL(10,2) DEFAULT 0,
    clowee_profit_share_amount DECIMAL(10,2) DEFAULT 0,
    net_payable DECIMAL(10,2) DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Payment Calculations table
CREATE TABLE IF NOT EXISTS payment_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_date DATE NOT NULL,
    entry_time TIME NOT NULL,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    machine_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_coins INTEGER DEFAULT 0,
    total_prizes INTEGER DEFAULT 0,
    total_income DECIMAL(10,2) DEFAULT 0,
    prize_cost DECIMAL(10,2) DEFAULT 0,
    electricity_cost DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    maintenance_cost DECIMAL(10,2) DEFAULT 0,
    profit_share_amount DECIMAL(10,2) DEFAULT 0,
    pay_to_clowee DECIMAL(10,2) DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    pay_to_clowee_id UUID NOT NULL REFERENCES pay_to_clowee(id) ON DELETE CASCADE,
    company_logo_url TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_machines_active ON machines(is_active);
CREATE INDEX IF NOT EXISTS idx_machine_counter_reports_machine_id ON machine_counter_reports(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_counter_reports_date ON machine_counter_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_machine_change_logs_machine_id ON machine_change_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_doll_price_history_machine_id ON doll_price_history(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_settings_history_machine_id ON machine_settings_history(machine_id);
CREATE INDEX IF NOT EXISTS idx_pay_to_clowee_machine_id ON pay_to_clowee(machine_id);
CREATE INDEX IF NOT EXISTS idx_payment_calculations_machine_id ON payment_calculations(machine_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_counter_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doll_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_to_clowee ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all operations for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON machines FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON machine_counter_reports FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON machine_change_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON doll_price_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON machine_settings_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON pay_to_clowee FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON payment_calculations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON invoices FOR ALL USING (auth.role() = 'authenticated');