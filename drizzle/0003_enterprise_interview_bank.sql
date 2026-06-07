ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_title text,
  ADD COLUMN IF NOT EXISTS license_usage text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE TABLE IF NOT EXISTS interview_bank_roles (
  id text PRIMARY KEY,
  title text NOT NULL,
  version text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interview_bank_competencies (
  id text PRIMARY KEY,
  role_id text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  weight real NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_bank_competencies_role_idx
  ON interview_bank_competencies(role_id);

CREATE TABLE IF NOT EXISTS interview_bank_rubrics (
  id text PRIMARY KEY,
  role_id text NOT NULL,
  competency_id text NOT NULL,
  difficulty text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_bank_rubrics_role_idx
  ON interview_bank_rubrics(role_id);

CREATE INDEX IF NOT EXISTS interview_bank_rubrics_competency_idx
  ON interview_bank_rubrics(competency_id);

CREATE TABLE IF NOT EXISTS interview_bank_questions (
  id text PRIMARY KEY,
  role_id text NOT NULL,
  competency_id text NOT NULL,
  rubric_id text NOT NULL,
  difficulty text NOT NULL,
  type text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_bank_questions_role_idx
  ON interview_bank_questions(role_id);

CREATE INDEX IF NOT EXISTS interview_bank_questions_competency_idx
  ON interview_bank_questions(competency_id);

CREATE TABLE IF NOT EXISTS interview_bank_calibration_samples (
  id text PRIMARY KEY,
  role_id text NOT NULL,
  question_id text NOT NULL,
  quality text NOT NULL,
  expected_score integer NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_bank_calibration_role_idx
  ON interview_bank_calibration_samples(role_id);

CREATE INDEX IF NOT EXISTS interview_bank_calibration_question_idx
  ON interview_bank_calibration_samples(question_id);

CREATE TABLE IF NOT EXISTS interview_bank_sources (
  id text PRIMARY KEY,
  role_id text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  license_usage text,
  data jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_bank_sources_role_idx
  ON interview_bank_sources(role_id);
