-- Add notes column to machine_counter_reports for logging setup information
ALTER TABLE machine_counter_reports 
ADD COLUMN notes TEXT;