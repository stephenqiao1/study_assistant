-- Create a new table for formulas
CREATE TABLE IF NOT EXISTS "formulas" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "study_session_id" uuid NOT NULL REFERENCES "study_sessions" ("id") ON DELETE CASCADE,
  "formula" text NOT NULL,
  "latex" text NOT NULL,
  "description" text,
  "category" text NOT NULL DEFAULT 'General',
  "source_note_id" uuid REFERENCES "notes" ("id") ON DELETE SET NULL,
  "is_block" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Enable RLS
ALTER TABLE "formulas" ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict viewing to formula owners
CREATE POLICY "Formulas are viewable by owner" ON "formulas"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      WHERE ss.id = study_session_id
      AND ss.user_id = auth.uid()
    )
  );

-- Create policy to restrict inserts to formula owners
CREATE POLICY "Formulas are insertable by owner" ON "formulas"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      WHERE ss.id = study_session_id
      AND ss.user_id = auth.uid()
    )
  );

-- Create policy to restrict updates to formula owners
CREATE POLICY "Formulas are updatable by owner" ON "formulas"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      WHERE ss.id = study_session_id
      AND ss.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      WHERE ss.id = study_session_id
      AND ss.user_id = auth.uid()
    )
  );

-- Create policy to restrict deletes to formula owners
CREATE POLICY "Formulas are deletable by owner" ON "formulas"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      WHERE ss.id = study_session_id
      AND ss.user_id = auth.uid()
    )
  );

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_formulas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
CREATE TRIGGER update_formulas_updated_at
BEFORE UPDATE ON "formulas"
FOR EACH ROW
EXECUTE FUNCTION update_formulas_updated_at(); 