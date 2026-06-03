import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ROLE_ID } from '@/lib/types'
import {
  bankQuestionSchema,
  calibrationSampleSchema,
  competencySchema,
  interviewRoleSchema,
  rubricSchema,
  sourceSchema,
  type BankQuestion,
  type CalibrationSample,
  type Competency,
  type InterviewBank,
  type Rubric,
} from '@/lib/interview-bank/schemas'

const BANK_ROOT = 'content/interview-bank'

let cachedBank: InterviewBank | null = null

export function getInterviewBankDir(roleId = ROLE_ID) {
  return path.join(process.cwd(), BANK_ROOT, roleId)
}

export function getInterviewBankKnowledgePath(roleId = ROLE_ID) {
  return path.join(getInterviewBankDir(roleId), 'knowledge.md')
}

export async function getInterviewBank(roleId = ROLE_ID): Promise<InterviewBank> {
  if (cachedBank?.role.id === roleId) {
    return cachedBank
  }

  const dir = getInterviewBankDir(roleId)
  const role = interviewRoleSchema.parse(await readJson(path.join(dir, 'role.json')))
  const competencies = competencySchema.array().parse(await readJson(path.join(dir, 'competencies.json')))
  const rubrics = rubricSchema.array().parse(await readJson(path.join(dir, 'rubrics.json')))
  const questions = bankQuestionSchema.array().parse(await readJson(path.join(dir, 'questions.json')))
  const calibrationSamples = calibrationSampleSchema
    .array()
    .parse(await readJson(path.join(dir, 'calibration-samples.json')))
  const sources = sourceSchema.array().parse(await readJson(path.join(dir, 'sources.json')))

  const bank = {
    role,
    competencies,
    rubrics,
    questions,
    calibrationSamples,
    sources,
    knowledgePath: getInterviewBankKnowledgePath(roleId),
  }
  validateBank(bank)
  cachedBank = bank
  return bank
}

export function getCompetency(bank: InterviewBank, competencyId: string): Competency {
  const competency = bank.competencies.find((item) => item.id === competencyId)
  if (!competency) {
    throw new Error(`Interview bank competency not found: ${competencyId}`)
  }
  return competency
}

export function getRubric(bank: InterviewBank, rubricId: string): Rubric {
  const rubric = bank.rubrics.find((item) => item.id === rubricId)
  if (!rubric) {
    throw new Error(`Interview bank rubric not found: ${rubricId}`)
  }
  return rubric
}

export function getQuestion(bank: InterviewBank, questionId: string): BankQuestion | null {
  return bank.questions.find((item) => item.id === questionId) ?? null
}

export function getCalibrationSamples(bank: InterviewBank, questionId: string): CalibrationSample[] {
  return bank.calibrationSamples.filter((item) => item.questionId === questionId)
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

function validateBank(bank: InterviewBank) {
  const competencyIds = new Set(bank.competencies.map((item) => item.id))
  const rubricIds = new Set(bank.rubrics.map((item) => item.id))
  const questionIds = new Set(bank.questions.map((item) => item.id))

  for (const competencyId of bank.role.selectionPolicy.mustCoverCompetencyIds) {
    if (!competencyIds.has(competencyId)) {
      throw new Error(`Role selection policy references unknown competency: ${competencyId}`)
    }
  }

  for (const rubric of bank.rubrics) {
    if (!competencyIds.has(rubric.competencyId)) {
      throw new Error(`Rubric ${rubric.id} references unknown competency: ${rubric.competencyId}`)
    }
    const weight = rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0)
    if (Math.abs(weight - 100) > 0.01) {
      throw new Error(`Rubric ${rubric.id} dimensions must sum to 100, got ${weight}`)
    }
  }

  for (const question of bank.questions) {
    if (!competencyIds.has(question.competencyId)) {
      throw new Error(`Question ${question.id} references unknown competency: ${question.competencyId}`)
    }
    if (!rubricIds.has(question.rubricId)) {
      throw new Error(`Question ${question.id} references unknown rubric: ${question.rubricId}`)
    }
  }

  for (const sample of bank.calibrationSamples) {
    if (!questionIds.has(sample.questionId)) {
      throw new Error(`Calibration sample ${sample.id} references unknown question: ${sample.questionId}`)
    }
  }
}
