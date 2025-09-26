-- Create machine_counter_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS machine_counter_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    coin_count INTEGER DEFAULT 0 NOT NULL,
    prize_count INTEGER DEFAULT 0 NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(machine_id, report_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_machine_counter_reports_machine_id ON machine_counter_reports(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_counter_reports_date ON machine_counter_reports(report_date);

-- Enable RLS
ALTER TABLE machine_counter_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all machine counter reports" ON machine_counter_reports FOR SELECT USING (true);
CREATE POLICY "Users can insert machine counter reports" ON machine_counter_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update machine counter reports" ON machine_counter_reports FOR UPDATE USING (true);
CREATE POLICY "Users can delete machine counter reports" ON machine_counter_reports FOR DELETE USING (true);