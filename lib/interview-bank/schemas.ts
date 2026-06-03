import { z } from 'zod'

export const difficultySchema = z.enum(['junior', 'mid', 'senior', 'staff', 'mid_senior'])

export const interviewRoleSchema = z.object({
  id: z.string(),
  title: z.string(),
  version: z.string(),
  targetLevels: z.array(z.string()),
  passingScore: z.number().int().min(0).max(100),
  targetRounds: z.number().int().positive(),
  positioning: z.string(),
  interviewStages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      goal: z.string(),
    }),
  ),
  selectionPolicy: z.object({
    rounds: z.number().int().positive(),
    mustCoverCompetencyIds: z.array(z.string()),
    adaptiveSignals: z.array(z.string()),
  }),
  scorePolicy: z.object({
    scoreRange: z.tuple([z.number().int(), z.number().int()]),
    passingScore: z.number().int().min(0).max(100),
    singleQuestionPassingScore: z.number().int().min(0).max(100),
    calibrationRule: z.string(),
  }),
})

export const competencySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  weight: z.number().positive(),
  description: z.string(),
  expectedMidLevel: z.string(),
  expectedSeniorLevel: z.string(),
  sourceTags: z.array(z.string()),
})

export const rubricSchema = z.object({
  id: z.string(),
  competencyId: z.string(),
  difficulty: difficultySchema,
  dimensions: z.array(
    z.object({
      label: z.string(),
      weight: z.number().positive(),
      excellent: z.string(),
      acceptable: z.string(),
      weak: z.string(),
    }),
  ),
  redFlags: z.array(z.string()),
})

export const followUpsSchema = z.object({
  ifTooAbstract: z.array(z.string()).default([]),
  ifMissingProduction: z.array(z.string()).default([]),
  ifStrongAnswer: z.array(z.string()).default([]),
})

export const bankQuestionSchema = z.object({
  id: z.string(),
  competencyId: z.string(),
  rubricId: z.string(),
  difficulty: z.enum(['junior', 'mid', 'senior', 'staff']),
  type: z.string(),
  question: z.string(),
  intent: z.string(),
  expectedSignals: z.array(z.string()),
  redFlags: z.array(z.string()),
  followUps: followUpsSchema,
  sourceTags: z.array(z.string()),
})

export const calibrationSampleSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  quality: z.enum(['excellent', 'acceptable', 'poor']),
  expectedScore: z.number().int().min(0).max(100),
  answer: z.string(),
  rationale: z.string(),
})

export const sourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  usage: z.string(),
})

export type InterviewRole = z.infer<typeof interviewRoleSchema>
export type Competency = z.infer<typeof competencySchema>
export type Rubric = z.infer<typeof rubricSchema>
export type BankQuestion = z.infer<typeof bankQuestionSchema>
export type CalibrationSample = z.infer<typeof calibrationSampleSchema>
export type InterviewBankSource = z.infer<typeof sourceSchema>

export type InterviewBank = {
  role: InterviewRole
  competencies: Competency[]
  rubrics: Rubric[]
  questions: BankQuestion[]
  calibrationSamples: CalibrationSample[]
  sources: InterviewBankSource[]
  knowledgePath: string
}
