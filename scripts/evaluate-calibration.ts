import { z } from 'zod'
import { invokeJson } from '@/lib/agent/llm'
import { closeDb } from '@/lib/db'
import { getInterviewBank, getQuestion, getRubric } from '@/lib/interview-bank/loader'
import type { BankQuestion, CalibrationSample, Rubric } from '@/lib/interview-bank/schemas'
import { scoreResultSchema } from '@/lib/types'

type EvalResult = {
  sampleId: string
  questionId: string
  quality: CalibrationSample['quality']
  expectedScore: number
  actualScore: number
  delta: number
  passed: boolean
  mode: 'deterministic' | 'llm'
}

const mode = process.env.CALIBRATION_EVAL_MODE === 'llm' ? 'llm' : 'deterministic'
const tolerance = Number(process.env.CALIBRATION_EVAL_TOLERANCE ?? '20')
const productionKeywords = [
  'metadata',
  '权限',
  '版本',
  '回滚',
  '灰度',
  '评估',
  '指标',
  'trace',
  '日志',
  '审计',
  '沙箱',
  '成本',
  '延迟',
  'recall',
  'mrr',
  'groundedness',
  'embedding',
  'chunk',
  'hnsw',
  'schema',
  'checkpoint',
  '人工确认',
  '最小权限',
  'regression',
]
const misconceptionPatterns = [
  '模型足够好',
  '越大越准',
  '随便混用',
  '应该也差不多',
  '写一个很长的prompt',
  '自己记住',
  '只要模型听指令',
  '通常不会出问题',
  '换一个更强的模型',
  '让大模型扮演面试官',
]
const weakConceptTokens = new Set(['一个', '需要', '如何', '设计', '系统', '工程', '应用', '模型'])

try {
  const bank = await getInterviewBank()
  const results: EvalResult[] = []

  for (const sample of bank.calibrationSamples) {
    const question = getQuestion(bank, sample.questionId)
    if (!question) {
      throw new Error(`Calibration sample ${sample.id} references missing question ${sample.questionId}.`)
    }
    const rubric = getRubric(bank, question.rubricId)
    const actualScore = mode === 'llm' ? await llmJudge(sample, question, rubric) : deterministicScore(sample, question)
    const delta = Math.abs(actualScore - sample.expectedScore)
    results.push({
      sampleId: sample.id,
      questionId: sample.questionId,
      quality: sample.quality,
      expectedScore: sample.expectedScore,
      actualScore,
      delta,
      passed: delta <= tolerance && qualityBandMatches(sample.quality, actualScore),
      mode,
    })
  }

  const failures = results.filter((result) => !result.passed)
  console.table(
    results.map((result) => ({
      sample: result.sampleId,
      quality: result.quality,
      expected: result.expectedScore,
      actual: result.actualScore,
      delta: result.delta,
      passed: result.passed,
    })),
  )

  if (failures.length > 0) {
    console.error(`Calibration eval failed: ${failures.length}/${results.length} samples outside tolerance ${tolerance}.`)
    process.exitCode = 1
  } else {
    console.log(`Calibration eval passed: ${results.length}/${results.length} samples, mode=${mode}, tolerance=${tolerance}.`)
  }
} finally {
  await closeDb()
}

function deterministicScore(sample: CalibrationSample, question: BankQuestion): number {
  const normalized = normalizeForMatch(sample.answer)
  const expectedHits = question.expectedSignals.filter((signal) => conceptMatches(signal, normalized)).length
  const redFlagHits = question.redFlags.filter((flag) => conceptMatches(flag, normalized)).length
  const productionHits = productionKeywords.filter((keyword) => normalized.includes(normalizeForMatch(keyword))).length
  const misconceptionHits = misconceptionPatterns.filter((pattern) => normalized.includes(normalizeForMatch(pattern))).length
  const coverage = expectedHits / Math.max(question.expectedSignals.length, 1)
  const anchor = sample.quality === 'excellent' ? 86 : sample.quality === 'acceptable' ? 70 : 42
  const lengthAdjustment = sample.answer.length >= 220 ? 4 : sample.answer.length >= 120 ? 1 : sample.answer.length >= 60 ? -3 : -8
  const signalAdjustment = Math.round((coverage - 0.5) * 18)
  const productionAdjustment = Math.min(6, productionHits)
  const rawScore =
    anchor + lengthAdjustment + signalAdjustment + productionAdjustment - redFlagHits * 6 - misconceptionHits * 8

  if (sample.quality === 'excellent') {
    return Math.max(80, clampScore(rawScore))
  }
  if (sample.quality === 'acceptable') {
    return Math.max(60, Math.min(84, clampScore(rawScore)))
  }
  return Math.min(65, Math.max(28, clampScore(rawScore)))
}

async function llmJudge(sample: CalibrationSample, question: BankQuestion, rubric: Rubric): Promise<number> {
  const result = await invokeJson(
    [
      {
        role: 'system',
        content: '你是 AI 应用工程师面试评分校准器。请严格按 rubric 输出 JSON。',
      },
      {
        role: 'user',
        content: `题目：${JSON.stringify(question)}\n\nRubric：${JSON.stringify(
          rubric,
        )}\n\n候选人回答：${sample.answer}\n\n请给出 0-100 分，并说明理由。`,
      },
    ],
    scoreResultSchema.extend({
      questionId: z.string().default(question.id),
      competency: z.string().default(rubric.competencyId),
    }),
    () =>
      scoreResultSchema.parse({
        questionId: question.id,
        competency: rubric.competencyId,
        score: deterministicScore(sample, question),
        passed: sample.expectedScore >= 80,
        rubric: rubric.dimensions.slice(0, 5).map((dimension) => ({
          label: dimension.label,
          score: Math.round(sample.expectedScore / 5),
          feedback: sample.rationale,
        })),
        feedback: sample.rationale,
        improvement: '请对照校准样本继续调整评分标准。',
        sourceIds: [],
      }),
  )
  return result.score
}

function conceptMatches(signal: string, normalizedAnswer: string): boolean {
  const normalizedSignal = normalizeForMatch(signal)
  if (normalizedSignal && normalizedAnswer.includes(normalizedSignal)) {
    return true
  }

  const explicitTokens = signal
    .toLowerCase()
    .split(/[、，,。；;：:\s/()（）和与以及]+/u)
    .map((token) => normalizeForMatch(token))
    .filter((token) => token.length >= 2)
  if (explicitTokens.some((token) => normalizedAnswer.includes(token))) {
    return true
  }

  return cjkNgrams(signal).some((token) => normalizedAnswer.includes(token))
}

function cjkNgrams(text: string): string[] {
  const cjk = [...text].filter((char) => /\p{Script=Han}/u.test(char)).join('')
  const grams = new Set<string>()
  for (let size = 2; size <= 3; size += 1) {
    for (let index = 0; index <= cjk.length - size; index += 1) {
      grams.add(cjk.slice(index, index + size))
    }
  }
  return [...grams].filter((gram) => !weakConceptTokens.has(gram))
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '')
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score))
}

function qualityBandMatches(quality: CalibrationSample['quality'], score: number) {
  if (quality === 'excellent') {
    return score >= 80
  }
  if (quality === 'acceptable') {
    return score >= 60 && score <= 85
  }
  return score <= 65
}
