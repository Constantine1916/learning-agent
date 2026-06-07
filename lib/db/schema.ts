import { integer, jsonb, pgTable, real, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'
import type {
  BankQuestion,
  CalibrationSample,
  Competency,
  InterviewBankSource,
  InterviewRole,
  Rubric,
} from '@/lib/interview-bank/schemas'
import type { CandidateProfile, FinalReport, InterviewQuestion, ResumeProfile, ScoreResult } from '@/lib/types'

export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  rawText: text('raw_text').notNull(),
  profile: jsonb('profile').$type<ResumeProfile>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const interviewSessions = pgTable('interview_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  roleId: text('role_id').notNull(),
  resumeId: uuid('resume_id').references(() => resumes.id),
  status: text('status').notNull().default('created'),
  selfIntro: text('self_intro'),
  candidateProfile: jsonb('candidate_profile').$type<CandidateProfile>(),
  questionPlan: jsonb('question_plan').$type<InterviewQuestion[]>(),
  round: integer('round').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const interviewMessages = pgTable('interview_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const scoreResults = pgTable('score_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull(),
  competency: text('competency').notNull(),
  score: integer('score').notNull(),
  result: jsonb('result').$type<ScoreResult>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const finalReports = pgTable('final_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .unique()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),
  report: jsonb('report').$type<FinalReport>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: text('role_id').notNull(),
  sourcePath: text('source_path').notNull(),
  sourceUrl: text('source_url'),
  sourceTitle: text('source_title'),
  licenseUsage: text('license_usage'),
  title: text('title').notNull(),
  competency: text('competency').notNull(),
  content: text('content').notNull(),
  rubric: jsonb('rubric').$type<string[]>(),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const interviewBankRoles = pgTable('interview_bank_roles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  version: text('version').notNull(),
  data: jsonb('data').$type<InterviewRole>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const interviewBankCompetencies = pgTable('interview_bank_competencies', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  weight: real('weight').notNull(),
  data: jsonb('data').$type<Competency>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const interviewBankRubrics = pgTable('interview_bank_rubrics', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull(),
  competencyId: text('competency_id').notNull(),
  difficulty: text('difficulty').notNull(),
  data: jsonb('data').$type<Rubric>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const interviewBankQuestions = pgTable('interview_bank_questions', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull(),
  competencyId: text('competency_id').notNull(),
  rubricId: text('rubric_id').notNull(),
  difficulty: text('difficulty').notNull(),
  type: text('type').notNull(),
  data: jsonb('data').$type<BankQuestion>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const interviewBankCalibrationSamples = pgTable('interview_bank_calibration_samples', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull(),
  questionId: text('question_id').notNull(),
  quality: text('quality').notNull(),
  expectedScore: integer('expected_score').notNull(),
  data: jsonb('data').$type<CalibrationSample>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const interviewBankSources = pgTable('interview_bank_sources', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  licenseUsage: text('license_usage'),
  data: jsonb('data').$type<InterviewBankSource>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
