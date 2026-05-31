import { integer, jsonb, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'
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
  title: text('title').notNull(),
  competency: text('competency').notNull(),
  content: text('content').notNull(),
  rubric: jsonb('rubric').$type<string[]>(),
  embedding: vector('embedding', { dimensions: 1024 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
