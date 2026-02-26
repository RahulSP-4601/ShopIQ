-- Add CHECK constraints for Belief.strength and Note.basePriority
-- Run this SQL script manually after running `npx prisma db push`
-- Usage: psql -U your_username -d shopify -f prisma/add_check_constraints.sql
-- This script is idempotent - it can be run multiple times safely

-- Add CHECK constraint for Belief.strength (0.0 to 1.0)
-- Uses NOT VALID to avoid failures on existing rows; validate after cleanup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'belief_strength_range'
    AND conrelid = '"Belief"'::regclass
  ) THEN
    ALTER TABLE "Belief"
    ADD CONSTRAINT belief_strength_range
    CHECK (strength >= 0.0 AND strength <= 1.0) NOT VALID;
  END IF;
END $$;

-- After cleaning/backfilling offending values, run:
-- ALTER TABLE "Belief" VALIDATE CONSTRAINT belief_strength_range;

-- Add CHECK constraint for Note.basePriority (0.0 to 1.0)
-- Uses NOT VALID to avoid failures on existing rows; validate after cleanup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'note_base_priority_range'
    AND conrelid = '"Note"'::regclass
  ) THEN
    ALTER TABLE "Note"
    ADD CONSTRAINT note_base_priority_range
    CHECK ("basePriority" >= 0.0 AND "basePriority" <= 1.0) NOT VALID;
  END IF;
END $$;

-- After cleaning/backfilling offending values, run:
-- ALTER TABLE "Note" VALIDATE CONSTRAINT note_base_priority_range;

-- Verify constraints were added
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname IN ('belief_strength_range', 'note_base_priority_range');
