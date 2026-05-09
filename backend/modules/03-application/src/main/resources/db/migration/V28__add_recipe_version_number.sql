-- Add missing auditing columns if they don't exist (needed for versioning order)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Update existing records to have a valid created_at if it was just added
UPDATE recipes SET created_at = NOW() WHERE created_at IS NULL;
UPDATE recipes SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE recipes SET active = TRUE WHERE active IS NULL;

-- Make them NOT NULL after populating
ALTER TABLE recipes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN active SET NOT NULL;

-- Add explicit recipe version numbers for approval/revision history.
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;

-- Existing parent revisions were previously unnumbered; give them deterministic
-- numbers inside each recipe family based on creation order.
WITH ranked_versions AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(parent_id, id)
            ORDER BY
                CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
                created_at,
                id
        ) AS version_number
    FROM recipes
)
UPDATE recipes r
SET version_number = ranked_versions.version_number
FROM ranked_versions
WHERE r.id = ranked_versions.id;

CREATE INDEX IF NOT EXISTS idx_recipes_parent_version ON recipes(parent_id, version_number);
