-- Add is_active column to machines table
ALTER TABLE machines ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_machines_is_active ON machines(is_active);