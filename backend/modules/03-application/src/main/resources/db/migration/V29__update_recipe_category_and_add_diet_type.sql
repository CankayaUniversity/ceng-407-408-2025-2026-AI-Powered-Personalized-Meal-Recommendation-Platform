-- Update recipes table for Enum types
-- category column already exists from V21 but we ensure it's compatible with Enum (VARCHAR)
-- Add diet_type column to recipes table

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS diet_type VARCHAR(50);
