-- Create grading_systems table
CREATE TABLE IF NOT EXISTS grading_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  target_grade DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create grading_components table
CREATE TABLE IF NOT EXISTS grading_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_system_id UUID NOT NULL REFERENCES grading_systems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create grade_entries table
CREATE TABLE IF NOT EXISTS grade_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_component_id UUID NOT NULL REFERENCES grading_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for querying
CREATE INDEX grading_systems_user_id_idx ON grading_systems(user_id);
CREATE INDEX grading_systems_study_session_id_idx ON grading_systems(study_session_id);
CREATE INDEX grading_components_grading_system_id_idx ON grading_components(grading_system_id);
CREATE INDEX grade_entries_grading_component_id_idx ON grade_entries(grading_component_id);

-- Add RLS policies
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_entries ENABLE ROW LEVEL SECURITY;

-- User can only read their own grading systems
CREATE POLICY grading_systems_select ON grading_systems
  FOR SELECT USING (auth.uid() = user_id);

-- User can only insert their own grading systems
CREATE POLICY grading_systems_insert ON grading_systems
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User can only update their own grading systems
CREATE POLICY grading_systems_update ON grading_systems
  FOR UPDATE USING (auth.uid() = user_id);

-- User can only delete their own grading systems
CREATE POLICY grading_systems_delete ON grading_systems
  FOR DELETE USING (auth.uid() = user_id);

-- User can only read their own grading components
CREATE POLICY grading_components_select ON grading_components
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM grading_systems
      WHERE grading_systems.id = grading_components.grading_system_id
      AND grading_systems.user_id = auth.uid()
    )
  );

-- User can only insert their own grading components
CREATE POLICY grading_components_insert ON grading_components
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM grading_systems
      WHERE grading_systems.id = grading_components.grading_system_id
      AND grading_systems.user_id = auth.uid()
    )
  );

-- User can only update their own grading components
CREATE POLICY grading_components_update ON grading_components
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM grading_systems
      WHERE grading_systems.id = grading_components.grading_system_id
      AND grading_systems.user_id = auth.uid()
    )
  );

-- User can only delete their own grading components
CREATE POLICY grading_components_delete ON grading_components
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM grading_systems
      WHERE grading_systems.id = grading_components.grading_system_id
      AND grading_systems.user_id = auth.uid()
    )
  );

-- User can only read their own grade entries
CREATE POLICY grade_entries_select ON grade_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM grading_components
      JOIN grading_systems ON grading_systems.id = grading_components.grading_system_id
      WHERE grading_components.id = grade_entries.grading_component_id
      AND grading_systems.user_id = auth.uid()
    )
  );

-- User can only insert their own grade entries
CREATE POLICY grade_entries_insert ON grade_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM grading_components
      JOIN grading_systems ON grading_systems.id = grading_components.grading_system_id
      WHERE grading_components.id = grade_entries.grading_component_id
      AND grading_systems.user_id = auth.uid()
    )
  );

-- User can only update their own grade entries
CREATE POLICY grade_entries_update ON grade_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM grading_components
      JOIN grading_systems ON grading_systems.id = grading_components.grading_system_id
      WHERE grading_components.id = grade_entries.grading_component_id
      AND grading_systems.user_id = auth.uid()
    )
  );

-- User can only delete their own grade entries
CREATE POLICY grade_entries_delete ON grade_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM grading_components
      JOIN grading_systems ON grading_systems.id = grading_components.grading_system_id
      WHERE grading_components.id = grade_entries.grading_component_id
      AND grading_systems.user_id = auth.uid()
    )
  ); 