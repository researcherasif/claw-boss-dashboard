-- Add machine_number column to machines table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS machine_number VARCHAR(50) UNIQUE;