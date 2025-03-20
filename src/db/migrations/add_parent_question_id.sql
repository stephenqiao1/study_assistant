-- Add parent_question_id column to practice_questions table
ALTER TABLE practice_questions 
ADD parent_question_id UUID;

-- Add foreign key constraint
ALTER TABLE practice_questions
ADD CONSTRAINT fk_parent_question
FOREIGN KEY (parent_question_id)
REFERENCES practice_questions(id)
ON DELETE SET NULL;

-- Add an index for faster queries
CREATE INDEX idx_practice_questions_parent_id 
ON practice_questions(parent_question_id); 