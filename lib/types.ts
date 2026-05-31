import { z } from 'zod'

export const ROLE_ID = 'ai-application-engineer'
export const ROLE_TITLE = 'AI 应用开发工程师'
export const PASSING_SCORE = 80
export const TARGET_ROUNDS = 6

export const resumeProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  summary: z.string(),
  skills: z.array(z.string()),
  aiHighlights: z.array(z.string()),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
    }),
  ),
  risks: z.array(z.string()),
  keywords: z.array(z.string()),
})

export const candidateProfileSchema = z.object({
  positioning: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  focusAreas: z.array(z.string()),
  interviewStrategy: z.string(),
})

export const questionSchema = z.object({
  id: z.string(),
  competency: z.string(),
  question: z.string(),
  expectedSignals: z.array(z.string()),
  sourceIds: z.array(z.string()),
})

export const scoreResultSchema = z.object({
  questionId: z.string(),
  competency: z.string(),
  score: z.number().int().min(0).max(100),
  passed: z.boolean(),
  rubric: z.array(
    z.object({
      label: z.string(),
      score: z.number().int().min(0).max(20),
      feedback: z.string(),
    }),
  ),
  feedback: z.string(),
  improvement: z.string(),
  sourceIds: z.array(z.string()),
})

export const finalReportSchema = z.object({
  totalScore: z.number().int().min(0).max(100),
  passed: z.boolean(),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  learningAdvice: z.array(z.string()),
  abilityRadar: z.array(
    z.object({
      competency: z.string(),
      score: z.number().int().min(0).max(100),
    }),
  ),
})

export type ResumeProfile = z.infer<typeof resumeProfileSchema>
export type CandidateProfile = z.infer<typeof candidateProfileSchema>
export type InterviewQuestion = z.infer<typeof questionSchema>
export type ScoreResult = z.infer<typeof scoreResultSchema>
export type FinalReport = z.infer<typeof finalReportSchema>

export type InterviewStatus = 'created' | 'intro_collected' | 'interviewing' | 'completed'

export type InterviewMessage = {
  id: string
  sessionId: string
  role: 'interviewer' | 'candidate' | 'system' | 'score'
  content: string
  metadata?: Record<string, unknown> | null
  createdAt: Date
}

export type KnowledgeChunk = {
  id: string
  roleId: string
  sourcePath: string
  title: string
  competency: string
  content: string
  rubric: string[]
  score?: number
}

export type InterviewSession = {
  id: string
  userId: string
  roleId: string
  resumeId: string | null
  status: InterviewStatus
  selfIntro: string | null
  candidateProfile: CandidateProfile | null
  questionPlan: InterviewQuestion[]
  round: number
  createdAt: Date
  updatedAt: Date
}

export type ResumeRecord = {
  id: string
  userId: string
  filename: string
  mimeType: string
  rawText: string
  profile: ResumeProfile
  createdAt: Date
}

export type InterviewState = {
  session: InterviewSession
  resume: ResumeRecord
  messages: InterviewMessage[]
  scores: ScoreResult[]
  latestAnswer?: string
  retrievedChunks: KnowledgeChunk[]
  nextQuestion?: InterviewQuestion
  scoreResult?: ScoreResult
  finalReport?: FinalReport
}
