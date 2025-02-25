-- Add a unique constraint on study_session_id and formula columns
ALTER TABLE "formulas" 
ADD CONSTRAINT "formulas_study_session_id_formula_key" 
UNIQUE ("study_session_id", "formula"); 