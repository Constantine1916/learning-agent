import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { z } from 'zod'
import { invokeJson } from '@/lib/agent/llm'
import { getCalibrationSamples, getInterviewBank, getQuestion, getRubric } from '@/lib/interview-bank/loader'
import { selectInterviewQuestion } from '@/lib/interview-bank/planner'
import type { BankQuestion, CalibrationSample, Rubric } from '@/lib/interview-bank/schemas'
import { retrieveKnowledge } from '@/lib/rag/retriever'
import {
  candidateProfileSchema,
  finalReportSchema,
  PASSING_SCORE,
  questionSchema,
  scoreResultSchema,
  TARGET_ROUNDS,
  type CandidateProfile,
  type FinalReport,
  type InterviewMessage,
  type InterviewQuestion,
  type InterviewSession,
  type KnowledgeChunk,
  type ResumeRecord,
  type ScoreResult,
} from '@/lib/types'

const GraphState = Annotation.Root({
  session: Annotation<InterviewSession>(),
  resume: Annotation<ResumeRecord>(),
  selfIntro: Annotation<string | undefined>(),
  messages: Annotation<InterviewMessage[]>({
    default: () => [],
    reducer: (_left, right) => right,
  }),
  scores: Annotation<ScoreResult[]>({
    default: () => [],
    reducer: (_left, right) => right,
  }),
  latestAnswer: Annotation<string | undefined>(),
  candidateProfile: Annotation<CandidateProfile | undefined>(),
  retrievedChunks: Annotation<KnowledgeChunk[]>({
    default: () => [],
    reducer: (_left, right) => right,
  }),
  nextQuestion: Annotation<InterviewQuestion | undefined>(),
  scoreResult: Annotation<ScoreResult | undefined>(),
  finalReport: Annotation<FinalReport | undefined>(),
})

type GraphInput = typeof GraphState.State

export async function runSelfIntroductionGraph(input: {
  session: InterviewSession
  resume: ResumeRecord
  selfIntro: string
  messages: InterviewMessage[]
  scores: ScoreResult[]
}) {
  const graph = new StateGraph(GraphState)
    .addNode('collectSelfIntro', collectSelfIntroNode)
    .addNode('retrieveKnowledge', retrieveKnowledgeNode)
    .addNode('askQuestion', askQuestionNode)
    .addEdge(START, 'collectSelfIntro')
    .addEdge('collectSelfIntro', 'retrieveKnowledge')
    .addEdge('retrieveKnowledge', 'askQuestion')
    .addEdge('askQuestion', END)
    .compile()

  return graph.invoke(input)
}

export async function runAnswerGraph(input: {
  session: InterviewSession
  resume: ResumeRecord
  latestAnswer: string
  messages: InterviewMessage[]
  scores: ScoreResult[]
}) {
  const graph = new StateGraph(GraphState)
    .addNode('retrieveKnowledge', retrieveKnowledgeNode)
    .addNode('scoreAnswer', scoreAnswerNode)
    .addNode('askQuestion', askQuestionNode)
    .addNode('buildFinalReport', finalReportNode)
    .addEdge(START, 'retrieveKnowledge')
    .addEdge('retrieveKnowledge', 'scoreAnswer')
    .addEdge('scoreAnswer', 'askQuestion')
    .addEdge('askQuestion', 'buildFinalReport')
    .addEdge('buildFinalReport', END)
    .compile()

  return graph.invoke(input)
}

async function collectSelfIntroNode(state: GraphInput) {
  const candidateProfile = await createCandidateProfile(state.resume, state.selfIntro ?? '')
  return { candidateProfile }
}

async function retrieveKnowledgeNode(state: GraphInput) {
  const query = [
    state.resume.profile.summary,
    state.resume.profile.skills.join(' '),
    state.resume.profile.aiHighlights.join(' '),
    state.selfIntro,
    state.latestAnswer,
    state.session.candidateProfile?.focusAreas.join(' '),
  ]
    .filter(Boolean)
    .join('\n')

  return {
    retrievedChunks: await retrieveKnowledge(query),
  }
}

async function askQuestionNode(state: GraphInput) {
  const scoreCount = state.scores.length + (state.scoreResult ? 1 : 0)
  if (scoreCount >= TARGET_ROUNDS) {
    return {}
  }

  const nextQuestion = await generateInterviewQuestion({
    resume: state.resume,
    candidateProfile: state.candidateProfile ?? state.session.candidateProfile,
    chunks: state.retrievedChunks,
    messages: state.messages,
    scores: state.scoreResult ? [...state.scores, state.scoreResult] : state.scores,
    round: scoreCount + 1,
  })

  return { nextQuestion }
}

async function scoreAnswerNode(state: GraphInput) {
  const previousQuestion = findLatestQuestion(state.messages)
  const scoreResult = await scoreCandidateAnswer({
    question: previousQuestion,
    answer: state.latestAnswer ?? '',
    resume: state.resume,
    chunks: state.retrievedChunks,
  })

  return { scoreResult }
}

async function finalReportNode(state: GraphInput) {
  const scores = state.scoreResult ? [...state.scores, state.scoreResult] : state.scores
  if (scores.length < TARGET_ROUNDS) {
    return {}
  }

  const finalReport = await buildFinalReport({
    resume: state.resume,
    scores,
    messages: state.messages,
  })

  return { finalReport }
}

async function createCandidateProfile(resume: ResumeRecord, selfIntro: string): Promise<CandidateProfile> {
  return invokeJson(
    [
      {
        role: 'system',
        content: '你是 AI 应用开发工程师面试官。请只输出 JSON，不要输出 Markdown。',
      },
      {
        role: 'user',
        content: `请基于简历和自我介绍生成候选人画像，用于后续面试追问。\n\n简历画像：${JSON.stringify(
          resume.profile,
        )}\n\n自我介绍：${selfIntro}`,
      },
    ],
    candidateProfileSchema,
    () => ({
      positioning: resume.profile.summary,
      strengths: resume.profile.aiHighlights.slice(0, 3),
      gaps: resume.profile.risks.slice(0, 3),
      focusAreas: ['RAG 设计', 'Agent 工程', '上线评估', '问题排查'],
      interviewStrategy: '先验证候选人自我介绍中的项目真实性，再追问 AI 应用工程落地细节。',
    }),
  )
}

async function generateInterviewQuestion(input: {
  resume: ResumeRecord
  candidateProfile: CandidateProfile | null | undefined
  chunks: KnowledgeChunk[]
  messages: InterviewMessage[]
  scores: ScoreResult[]
  round: number
}): Promise<InterviewQuestion> {
  const schema = questionSchema.extend({
    id: z.string().optional(),
  })
  const bank = await getInterviewBank()
  const selected = selectInterviewQuestion({
    bank,
    resume: input.resume,
    candidateProfile: input.candidateProfile,
    messages: input.messages,
    scores: input.scores,
    round: input.round,
  })

  const question = await invokeJson(
    [
      {
        role: 'system',
        content:
          '你是一个真实的 AI 应用开发工程师面试官。请优先使用企业级结构化题库中的候选题，只根据候选人背景微调问法，不要偏离能力项和 rubric。只输出 JSON。',
      },
      {
        role: 'user',
        content: `第 ${input.round}/${TARGET_ROUNDS} 轮。请基于候选题生成一个有区分度的问题，避免重复历史问题。\n\n选题原因：${
          selected.reason
        }\n\n候选题：${formatBankQuestion(selected.question, selected.rubric)}\n\n候选人画像：${JSON.stringify(
          input.candidateProfile,
        )}\n\n简历：${JSON.stringify(input.resume.profile)}\n\n题库上下文：${formatChunks(
          input.chunks,
        )}\n\n历史消息：${formatMessages(input.messages)}\n\n历史评分：${JSON.stringify(input.scores)}`,
      },
    ],
    schema,
    () => bankQuestionToInterviewQuestion(selected.question, selected.competency.name, input.chunks),
  )

  return {
    ...question,
    id: selected.question.id,
    competencyId: selected.question.competencyId,
    competency: selected.competency.name,
    difficulty: selected.question.difficulty,
    type: selected.question.type,
    rubricId: selected.question.rubricId,
    intent: selected.question.intent,
    expectedSignals: question.expectedSignals.length ? question.expectedSignals : selected.question.expectedSignals,
    redFlags: selected.question.redFlags,
    followUps: selected.question.followUps,
    sourceTags: selected.question.sourceTags,
    sourceIds: [...new Set([...question.sourceIds, ...input.chunks.map((chunk) => chunk.id)])].slice(0, 6),
  }
}

async function scoreCandidateAnswer(input: {
  question: InterviewQuestion
  answer: string
  resume: ResumeRecord
  chunks: KnowledgeChunk[]
}): Promise<ScoreResult> {
  const bank = await getInterviewBank()
  const bankQuestion = getQuestion(bank, input.question.id)
  const rubric = input.question.rubricId
    ? getRubric(bank, input.question.rubricId)
    : bankQuestion
      ? getRubric(bank, bankQuestion.rubricId)
      : null
  const calibrationSamples = bankQuestion ? getCalibrationSamples(bank, bankQuestion.id) : []

  return invokeJson(
    [
      {
        role: 'system',
        content:
          '你是严谨的 AI 应用工程面试评分官。按 rubric 给分，指出证据、短板和改进建议。只输出 JSON。',
      },
      {
        role: 'user',
        content: `问题：${JSON.stringify(input.question)}\n\n候选人回答：${input.answer}\n\n简历画像：${JSON.stringify(
          input.resume.profile,
        )}\n\n企业级评分 Rubric：${formatRubric(rubric)}\n\n校准样本：${formatCalibrationSamples(
          calibrationSamples,
        )}\n\n题库上下文：${formatChunks(input.chunks)}\n\n请输出 0-100 分，80 分及以上 passed=true。评分时必须引用候选人回答中的具体证据；不要因为提到关键词就给高分。`,
      },
    ],
    scoreResultSchema,
    () => fallbackScore({ ...input, rubric, bankQuestion }),
  )
}

async function buildFinalReport(input: {
  resume: ResumeRecord
  scores: ScoreResult[]
  messages: InterviewMessage[]
}): Promise<FinalReport> {
  const weighted = await calculateWeightedScore(input.scores)
  const report = await invokeJson(
    [
      {
        role: 'system',
        content: '你是 AI 应用工程师面试总结官。请输出最终报告 JSON。',
      },
      {
        role: 'user',
        content: `候选人简历：${JSON.stringify(input.resume.profile)}\n\n评分明细：${JSON.stringify(
          input.scores,
        )}\n\n加权评分结果：${JSON.stringify(
          weighted,
        )}\n\n对话：${formatMessages(input.messages)}\n\n最终 totalScore 和 passed 必须采用加权评分结果；不要简单平均所有题目。`,
      },
    ],
    finalReportSchema,
    () => fallbackFinalReport(input.scores, weighted),
  )

  return finalReportSchema.parse({
    ...report,
    totalScore: weighted.totalScore,
    passed: weighted.passed,
    abilityRadar: weighted.abilityRadar,
  })
}

function findLatestQuestion(messages: InterviewMessage[]): InterviewQuestion {
  const message = [...messages].reverse().find((item) => item.role === 'interviewer' && item.metadata?.question)
  if (message?.metadata?.question) {
    return questionSchema.parse(message.metadata.question)
  }

  return {
    id: 'unknown-question',
    competency: '综合能力',
    question: '请回答上一轮面试问题。',
    expectedSignals: ['结构化表达', '工程深度', '真实案例'],
    sourceIds: [],
  }
}

function bankQuestionToInterviewQuestion(
  question: BankQuestion,
  competency: string,
  chunks: KnowledgeChunk[],
): InterviewQuestion {
  return {
    id: question.id,
    competencyId: question.competencyId,
    competency,
    difficulty: question.difficulty,
    type: question.type,
    rubricId: question.rubricId,
    question: question.question,
    intent: question.intent,
    expectedSignals: question.expectedSignals,
    redFlags: question.redFlags,
    followUps: question.followUps,
    sourceTags: question.sourceTags,
    sourceIds: chunks.map((chunk) => chunk.id).slice(0, 6),
  }
}

function fallbackScore(input: {
  question: InterviewQuestion
  answer: string
  chunks: KnowledgeChunk[]
  rubric?: Rubric | null
  bankQuestion?: BankQuestion | null
}): ScoreResult {
  const signals =
    input.bankQuestion?.expectedSignals ??
    (input.question.expectedSignals.length > 0 ? input.question.expectedSignals : ['工程方案', '风险', '评估'])
  const normalized = input.answer.toLowerCase()
  const matched = signals.filter((signal) => signalMatched(signal, input.question.competency, normalized))
  const lengthScore = input.answer.length >= 180 ? 25 : input.answer.length >= 100 ? 18 : input.answer.length >= 50 ? 10 : 4
  const signalScore = Math.round((matched.length / Math.max(signals.length, 1)) * 55)
  const structureScore = /首先|其次|最后|指标|风险|方案|评估|监控|成本|延迟/.test(input.answer) ? 15 : 6
  const score = Math.min(100, lengthScore + signalScore + structureScore)
  const rubricDimensions =
    input.rubric?.dimensions.map((dimension) => dimension.label) ?? signals.slice(0, 5)

  return scoreResultSchema.parse({
    questionId: input.question.id,
    competency: input.question.competency,
    score,
    passed: score >= PASSING_SCORE,
    rubric: rubricDimensions.slice(0, 5).map((label) => ({
      label,
      score: matched.some((signal) => signalMatched(signal, input.question.competency, label.toLowerCase()))
        ? 16
        : Math.min(20, Math.max(4, Math.round(score / 5))),
      feedback: matched.length >= Math.ceil(signals.length / 2) ? '回答中有部分可采信证据。' : '回答证据不足，需要补充项目细节。',
    })),
    feedback: score >= PASSING_SCORE ? '回答较完整，具备继续深入追问的基础。' : '回答偏概念化，需要补充项目细节和指标。',
    improvement: '建议用真实项目说明输入、处理链路、评估指标、上线风险和复盘结果。',
    sourceIds: input.chunks.map((chunk) => chunk.id),
  })
}

const competencyKeywords: Record<string, string[]> = {
  'LLM API 工程': ['openai', 'api', 'baseurl', 'model', 'streaming', 'timeout', 'retry', '限流', '成本', '延迟', 'token'],
  'Prompt 工程': ['system', 'developer', 'user', 'json', 'schema', 'few-shot', '错误恢复', '上下文', '裁剪', '压缩', 'prompt injection', '越权', '版本'],
  结构化输出: ['json', 'schema', 'zod', 'pydantic', '校验', '字段', '工具', '事务', '审计', 'fallback'],
  'RAG 数据治理': ['chunk', 'metadata', '文档', '解析', '清洗', '去重', '权限', '版本', '增量', '删除', '回滚'],
  向量检索: ['embedding', '向量', '维度', 'cosine', 'pgvector', 'hnsw', 'bm25', 'hybrid', 'rerank', '召回', 'mrr', 'ndcg'],
  'RAG 评估': ['引用', 'source', 'groundedness', 'faithfulness', 'recall', 'golden', 'eval', '拒答', '冲突', '反馈'],
  'Agent 工具调用': ['tool', '工具', 'schema', '参数', '校验', 'workflow', '状态', 'trace', '权限', '沙箱', '幂等', '人工确认'],
  '对话状态管理': ['session', 'message', '状态', '记忆', 'summary', 'checkpoint', '历史', '画像', 'ttl', '删除'],
  生产排查: ['复现', 'trace', '日志', 'prompt', 'model', 'retrieved', 'chunk', 'rerank', '缓存', '灰度', '报警', '回滚'],
  'AI 安全': ['prompt injection', '注入', '权限', '敏感', '隐私', '沙箱', '审计', '红队', '越权', 'pii'],
  'AI 前端工程': ['streaming', 'sse', 'ndjson', 'websocket', '取消', '重试', 'loading', '状态', '引用', '报告'],
  系统设计: ['前端', 'api', 'workflow', 'rag', 'postgres', 'pgvector', '队列', '对象存储', '限流', '缓存', '异步', '日志', 'trace', '成本'],
}

function signalMatched(signal: string, competency: string, normalizedAnswer: string): boolean {
  const signalTokens = signal.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? []
  const relevantTokens = [...signalTokens, ...(competencyKeywords[competency] ?? [])]
  const matches = relevantTokens.filter((token) => token.length > 1 && normalizedAnswer.includes(token.toLowerCase()))
  return matches.length >= Math.min(2, Math.max(1, Math.ceil(signalTokens.length / 3)))
}

function fallbackFinalReport(scores: ScoreResult[], weighted?: WeightedScoreSummary): FinalReport {
  const totalScore =
    weighted?.totalScore ??
    (scores.length ? Math.round(scores.reduce((sum, score) => sum + score.score, 0) / scores.length) : 0)
  const strengths = scores.filter((score) => score.score >= PASSING_SCORE).map((score) => score.competency)
  const weaknesses = scores.filter((score) => score.score < PASSING_SCORE).map((score) => score.competency)

  return finalReportSchema.parse({
    totalScore,
    passed: totalScore >= PASSING_SCORE,
    summary:
      totalScore >= PASSING_SCORE
        ? '候选人整体达到 AI 应用开发工程师面试通过线。'
        : '候选人暂未达到通过线，需要继续补强工程化和评估能力。',
    strengths: strengths.length ? [...new Set(strengths)] : ['表达意愿较明确'],
    weaknesses: weaknesses.length ? [...new Set(weaknesses)] : ['需要补充更完整的项目证据'],
    learningAdvice: [
      '准备 2-3 个真实 AI 应用项目案例，覆盖 RAG、Agent、评估和上线。',
      '回答时主动给出指标、风险、取舍和复盘结果。',
      '补充 prompt injection、权限控制、成本延迟和观测体系经验。',
    ],
    abilityRadar:
      weighted?.abilityRadar ??
      scores.map((score) => ({
        competency: score.competency,
        score: score.score,
      })),
  })
}

type WeightedScoreSummary = {
  totalScore: number
  passed: boolean
  coveredWeight: number
  abilityRadar: Array<{
    competency: string
    score: number
  }>
}

async function calculateWeightedScore(scores: ScoreResult[]): Promise<WeightedScoreSummary> {
  const bank = await getInterviewBank()
  const byCompetency = new Map<string, ScoreResult[]>()
  for (const score of scores) {
    byCompetency.set(score.competency, [...(byCompetency.get(score.competency) ?? []), score])
  }

  let weightedSum = 0
  let coveredWeight = 0
  const abilityRadar: Array<{ competency: string; score: number }> = []

  for (const [competencyName, competencyScores] of byCompetency) {
    const competency = bank.competencies.find((item) => item.name === competencyName)
    const average = Math.round(
      competencyScores.reduce((sum, score) => sum + score.score, 0) / Math.max(competencyScores.length, 1),
    )
    const weight = competency?.weight ?? 1
    weightedSum += average * weight
    coveredWeight += weight
    abilityRadar.push({ competency: competencyName, score: average })
  }

  const totalScore = coveredWeight > 0 ? Math.round(weightedSum / coveredWeight) : 0
  return {
    totalScore,
    passed: totalScore >= bank.role.passingScore,
    coveredWeight,
    abilityRadar,
  }
}

function formatChunks(chunks: KnowledgeChunk[]): string {
  return chunks
    .map(
      (chunk) =>
        `[${chunk.id}] ${chunk.title} / ${chunk.competency}\n${chunk.content}\nRubric: ${chunk.rubric.join('；')}`,
    )
    .join('\n\n')
}

function formatMessages(messages: InterviewMessage[]): string {
  return messages.map((message) => `${message.role}: ${message.content}`).join('\n')
}

function formatBankQuestion(question: BankQuestion, rubric: Rubric): string {
  return JSON.stringify(
    {
      id: question.id,
      competencyId: question.competencyId,
      rubricId: question.rubricId,
      difficulty: question.difficulty,
      type: question.type,
      question: question.question,
      intent: question.intent,
      expectedSignals: question.expectedSignals,
      redFlags: question.redFlags,
      followUps: question.followUps,
      rubricDimensions: rubric.dimensions.map((dimension) => ({
        label: dimension.label,
        weight: dimension.weight,
        excellent: dimension.excellent,
      })),
    },
    null,
    2,
  )
}

function formatRubric(rubric: Rubric | null): string {
  if (!rubric) {
    return '未找到结构化 rubric，请按问题 expectedSignals 评分。'
  }

  return JSON.stringify(
    {
      id: rubric.id,
      competencyId: rubric.competencyId,
      dimensions: rubric.dimensions,
      redFlags: rubric.redFlags,
    },
    null,
    2,
  )
}

function formatCalibrationSamples(samples: CalibrationSample[]): string {
  if (samples.length === 0) {
    return '当前题目暂无校准样本，请按 rubric 严格评分。'
  }

  return JSON.stringify(
    samples.map((sample) => ({
      quality: sample.quality,
      expectedScore: sample.expectedScore,
      answer: sample.answer,
      rationale: sample.rationale,
    })),
    null,
    2,
  )
}
