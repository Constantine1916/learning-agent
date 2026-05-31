import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  finalReports,
  interviewMessages,
  interviewSessions,
  resumes,
  scoreResults,
} from '@/lib/db/schema'
import type {
  CandidateProfile,
  FinalReport,
  InterviewMessage,
  InterviewQuestion,
  InterviewSession,
  InterviewStatus,
  ResumeProfile,
  ResumeRecord,
  ScoreResult,
} from '@/lib/types'

type MemoryStore = {
  resumes: Map<string, ResumeRecord>
  sessions: Map<string, InterviewSession>
  messages: Map<string, InterviewMessage[]>
  scores: Map<string, ScoreResult[]>
  reports: Map<string, FinalReport>
}

const globalStore = globalThis as typeof globalThis & { learningAgentMemoryStore?: MemoryStore }

function memoryStore(): MemoryStore {
  if (!globalStore.learningAgentMemoryStore) {
    globalStore.learningAgentMemoryStore = {
      resumes: new Map(),
      sessions: new Map(),
      messages: new Map(),
      scores: new Map(),
      reports: new Map(),
    }
  }
  return globalStore.learningAgentMemoryStore
}

export async function createResumeRecord(input: {
  userId: string
  filename: string
  mimeType: string
  rawText: string
  profile: ResumeProfile
}): Promise<ResumeRecord> {
  const db = getDb()
  if (db) {
    const [row] = await db.insert(resumes).values(input).returning()
    return normalizeResume(row)
  }

  const record: ResumeRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date(),
    ...input,
  }
  memoryStore().resumes.set(record.id, record)
  return record
}

export async function getResumeRecord(id: string): Promise<ResumeRecord | null> {
  const db = getDb()
  if (db) {
    const [row] = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1)
    return row ? normalizeResume(row) : null
  }
  return memoryStore().resumes.get(id) ?? null
}

export async function createInterviewSession(input: {
  userId: string
  roleId: string
  resumeId: string
}): Promise<InterviewSession> {
  const db = getDb()
  if (db) {
    const [row] = await db
      .insert(interviewSessions)
      .values({ ...input, status: 'created', questionPlan: [], round: 0 })
      .returning()
    return normalizeSession(row)
  }

  const now = new Date()
  const session: InterviewSession = {
    id: crypto.randomUUID(),
    userId: input.userId,
    roleId: input.roleId,
    resumeId: input.resumeId,
    status: 'created',
    selfIntro: null,
    candidateProfile: null,
    questionPlan: [],
    round: 0,
    createdAt: now,
    updatedAt: now,
  }
  memoryStore().sessions.set(session.id, session)
  return session
}

export async function getInterviewSession(id: string): Promise<InterviewSession | null> {
  const db = getDb()
  if (db) {
    const [row] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, id)).limit(1)
    return row ? normalizeSession(row) : null
  }
  return memoryStore().sessions.get(id) ?? null
}

export async function updateInterviewSession(
  id: string,
  updates: Partial<{
    status: InterviewStatus
    selfIntro: string
    candidateProfile: CandidateProfile
    questionPlan: InterviewQuestion[]
    round: number
  }>,
): Promise<InterviewSession> {
  const db = getDb()
  if (db) {
    const [row] = await db
      .update(interviewSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewSessions.id, id))
      .returning()
    return normalizeSession(row)
  }

  const store = memoryStore()
  const current = store.sessions.get(id)
  if (!current) {
    throw new Error('Interview session not found')
  }
  const next = { ...current, ...updates, updatedAt: new Date() }
  store.sessions.set(id, next)
  return next
}

export async function addInterviewMessage(input: {
  sessionId: string
  role: InterviewMessage['role']
  content: string
  metadata?: Record<string, unknown> | null
}): Promise<InterviewMessage> {
  const db = getDb()
  if (db) {
    const [row] = await db.insert(interviewMessages).values(input).returning()
    return normalizeMessage(row)
  }

  const message: InterviewMessage = {
    id: crypto.randomUUID(),
    createdAt: new Date(),
    metadata: null,
    ...input,
  }
  const store = memoryStore()
  store.messages.set(input.sessionId, [...(store.messages.get(input.sessionId) ?? []), message])
  return message
}

export async function listInterviewMessages(sessionId: string): Promise<InterviewMessage[]> {
  const db = getDb()
  if (db) {
    const rows = await db
      .select()
      .from(interviewMessages)
      .where(eq(interviewMessages.sessionId, sessionId))
      .orderBy(interviewMessages.createdAt)
    return rows.map(normalizeMessage)
  }
  return memoryStore().messages.get(sessionId) ?? []
}

export async function addScoreResult(sessionId: string, result: ScoreResult): Promise<ScoreResult> {
  const db = getDb()
  if (db) {
    await db.insert(scoreResults).values({
      sessionId,
      questionId: result.questionId,
      competency: result.competency,
      score: result.score,
      result,
    })
  } else {
    const store = memoryStore()
    store.scores.set(sessionId, [...(store.scores.get(sessionId) ?? []), result])
  }
  return result
}

export async function listScoreResults(sessionId: string): Promise<ScoreResult[]> {
  const db = getDb()
  if (db) {
    const rows = await db
      .select()
      .from(scoreResults)
      .where(eq(scoreResults.sessionId, sessionId))
      .orderBy(scoreResults.createdAt)
    return rows.map((row) => row.result)
  }
  return memoryStore().scores.get(sessionId) ?? []
}

export async function saveFinalReport(sessionId: string, report: FinalReport): Promise<FinalReport> {
  const db = getDb()
  if (db) {
    await db
      .insert(finalReports)
      .values({ sessionId, report })
      .onConflictDoUpdate({
        target: finalReports.sessionId,
        set: { report },
      })
  } else {
    memoryStore().reports.set(sessionId, report)
  }
  return report
}

export async function getFinalReport(sessionId: string): Promise<FinalReport | null> {
  const db = getDb()
  if (db) {
    const [row] = await db
      .select()
      .from(finalReports)
      .where(eq(finalReports.sessionId, sessionId))
      .orderBy(desc(finalReports.createdAt))
      .limit(1)
    return row?.report ?? null
  }
  return memoryStore().reports.get(sessionId) ?? null
}

function normalizeResume(row: typeof resumes.$inferSelect): ResumeRecord {
  return {
    id: row.id,
    userId: row.userId,
    filename: row.filename,
    mimeType: row.mimeType,
    rawText: row.rawText,
    profile: row.profile,
    createdAt: row.createdAt,
  }
}

function normalizeSession(row: typeof interviewSessions.$inferSelect): InterviewSession {
  return {
    id: row.id,
    userId: row.userId,
    roleId: row.roleId,
    resumeId: row.resumeId,
    status: row.status as InterviewStatus,
    selfIntro: row.selfIntro,
    candidateProfile: row.candidateProfile ?? null,
    questionPlan: row.questionPlan ?? [],
    round: row.round,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function normalizeMessage(row: typeof interviewMessages.$inferSelect): InterviewMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role as InterviewMessage['role'],
    content: row.content,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
  }
}
