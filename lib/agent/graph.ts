import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { z } from 'zod'
import { invokeJson } from '@/lib/agent/llm'
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

  return invokeJson(
    [
      {
        role: 'system',
        content:
          '你是一个真实的 AI 应用开发工程师面试官。请结合候选人简历、自我介绍、历史回答和题库上下文进行动态提问。只输出 JSON。',
      },
      {
        role: 'user',
        content: `第 ${input.round}/${TARGET_ROUNDS} 轮。请生成一个有区分度的问题，避免重复历史问题。\n\n候选人画像：${JSON.stringify(
          input.candidateProfile,
        )}\n\n简历：${JSON.stringify(input.resume.profile)}\n\n题库上下文：${formatChunks(
          input.chunks,
        )}\n\n历史消息：${formatMessages(input.messages)}\n\n历史评分：${JSON.stringify(input.scores)}`,
      },
    ],
    schema.transform((question) => ({
      ...question,
      id: question.id || `q-${input.round}-${Date.now()}`,
    })),
    () => fallbackQuestion(input),
  )
}

async function scoreCandidateAnswer(input: {
  question: InterviewQuestion
  answer: string
  resume: ResumeRecord
  chunks: KnowledgeChunk[]
}): Promise<ScoreResult> {
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
        )}\n\n题库上下文：${formatChunks(input.chunks)}\n\n请输出 0-100 分，80 分及以上 passed=true。`,
      },
    ],
    scoreResultSchema,
    () => fallbackScore(input),
  )
}

async function buildFinalReport(input: {
  resume: ResumeRecord
  scores: ScoreResult[]
  messages: InterviewMessage[]
}): Promise<FinalReport> {
  return invokeJson(
    [
      {
        role: 'system',
        content: '你是 AI 应用工程师面试总结官。请输出最终报告 JSON。',
      },
      {
        role: 'user',
        content: `候选人简历：${JSON.stringify(input.resume.profile)}\n\n评分明细：${JSON.stringify(
          input.scores,
        )}\n\n对话：${formatMessages(input.messages)}`,
      },
    ],
    finalReportSchema,
    () => fallbackFinalReport(input.scores),
  )
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

function fallbackQuestion(input: {
  chunks: KnowledgeChunk[]
  scores: ScoreResult[]
  round: number
}): InterviewQuestion {
  const fallback = fallbackQuestionBank[(input.round - 1) % fallbackQuestionBank.length]
  const chunk =
    input.chunks.find((item) => item.competency === fallback.competency) ??
    input.chunks[(input.round - 1) % Math.max(input.chunks.length, 1)]
  const competency = chunk?.competency ?? 'AI 应用工程'
  return {
    id: `fallback-q-${input.round}`,
    competency: fallback.competency || competency,
    question: fallback.question,
    expectedSignals: fallback.expectedSignals,
    sourceIds: chunk ? [chunk.id] : [],
  }
}

function fallbackScore(input: {
  question: InterviewQuestion
  answer: string
  chunks: KnowledgeChunk[]
}): ScoreResult {
  const signals = input.question.expectedSignals.length > 0 ? input.question.expectedSignals : ['工程方案', '风险', '评估']
  const normalized = input.answer.toLowerCase()
  const matched = signals.filter((signal) => signalMatched(signal, input.question.competency, normalized))
  const lengthScore = input.answer.length >= 180 ? 25 : input.answer.length >= 100 ? 18 : input.answer.length >= 50 ? 10 : 4
  const signalScore = Math.round((matched.length / Math.max(signals.length, 1)) * 55)
  const structureScore = /首先|其次|最后|指标|风险|方案|评估|监控|成本|延迟/.test(input.answer) ? 15 : 6
  const score = Math.min(100, lengthScore + signalScore + structureScore)

  return scoreResultSchema.parse({
    questionId: input.question.id,
    competency: input.question.competency,
    score,
    passed: score >= PASSING_SCORE,
    rubric: signals.slice(0, 5).map((signal) => ({
      label: signal,
      score: matched.includes(signal) ? 16 : 8,
      feedback: matched.includes(signal) ? '回答中有对应信号。' : '回答中该点还不够明确。',
    })),
    feedback: score >= PASSING_SCORE ? '回答较完整，具备继续深入追问的基础。' : '回答偏概念化，需要补充项目细节和指标。',
    improvement: '建议用真实项目说明输入、处理链路、评估指标、上线风险和复盘结果。',
    sourceIds: input.chunks.map((chunk) => chunk.id),
  })
}

const fallbackQuestionBank: InterviewQuestion[] = [
  {
    id: 'fallback-rag',
    competency: 'RAG 设计',
    question: '请结合你的实际项目，完整说明一个企业知识库 RAG 系统应该如何设计，并讲清楚你会如何评估它是否可靠。',
    expectedSignals: ['chunking 和 metadata', 'embedding、向量库、BM25 和 rerank', '引用、拒答和幻觉控制', 'eval、召回率、groundedness 和监控'],
    sourceIds: [],
  },
  {
    id: 'fallback-debug',
    competency: '问题排查',
    question: '上线后如果用户反馈模型回答不稳定、偶尔编造内容，你会按什么顺序排查并修复？',
    expectedSignals: ['复现样本和 trace 日志', 'prompt、上下文和模板变量', 'RAG 召回、chunk 和 rerank', 'guardrail、灰度、报警和回滚'],
    sourceIds: [],
  },
  {
    id: 'fallback-agent',
    competency: 'Agent 工程',
    question: '什么时候你会引入 tool calling 或 Agent workflow？请说明工具 schema、权限和高风险动作控制。',
    expectedSignals: ['工具调用适用场景', 'schema、参数校验和类型约束', '状态编排、日志和 trace', '权限、沙箱、幂等和人工确认'],
    sourceIds: [],
  },
  {
    id: 'fallback-eval',
    competency: '上线评估',
    question: '你如何判断一个 AI 应用已经可以上线？请给出效果、安全、成本和运维维度的上线门槛。',
    expectedSignals: ['golden set 和自动 eval', '人工验收、红队和安全测试', '业务指标、准确率和满意度', '延迟、成本、监控、灰度和回滚'],
    sourceIds: [],
  },
  {
    id: 'fallback-architecture',
    competency: '系统设计',
    question: '如果让你设计这个面试官 Agent 的生产版本，你会如何拆分前端、API、Agent workflow、RAG 和数据层？',
    expectedSignals: ['前端、API、workflow 和 RAG 分层', 'Postgres、pgvector、对象存储和队列', '限流、缓存、异步任务和重试', '日志、trace、成本和质量看板'],
    sourceIds: [],
  },
  {
    id: 'fallback-prompt',
    competency: 'Prompt 工程',
    question: '请说明你会如何设计一个稳定的面试官 Prompt，包括角色边界、输出格式、上下文裁剪和 prompt injection 防护。',
    expectedSignals: ['system、developer 和 user 指令边界', 'JSON schema、few-shot 和错误恢复', '上下文裁剪、压缩和优先级', 'prompt injection、防越权和版本评估'],
    sourceIds: [],
  },
]

const competencyKeywords: Record<string, string[]> = {
  'RAG 设计': ['chunk', 'metadata', 'embedding', '向量', 'bm25', 'hybrid', 'rerank', '引用', 'citation', '拒答', '幻觉', 'eval', '召回', 'groundedness', '监控'],
  问题排查: ['复现', 'trace', '日志', 'prompt', '上下文', '模板', 'rag', 'chunk', 'rerank', 'temperature', 'guardrail', '灰度', '报警', '回滚', 'eval'],
  'Agent 工程': ['tool', '工具', 'schema', '参数', '校验', 'workflow', '状态', 'trace', '权限', '沙箱', '幂等', '重试', '限流', '人工确认', '回滚'],
  上线评估: ['golden', 'eval', '红队', '验收', '业务', '准确率', '满意度', '延迟', '成本', '并发', '缓存', '监控', '灰度', '回滚'],
  系统设计: ['前端', 'api', 'workflow', 'rag', 'postgres', 'pgvector', '队列', '对象存储', '限流', '缓存', '异步', '日志', 'trace', '成本'],
  'Prompt 工程': ['system', 'developer', 'user', 'json', 'schema', 'few-shot', '错误恢复', '上下文', '裁剪', '压缩', 'prompt injection', '越权', '版本'],
}

function signalMatched(signal: string, competency: string, normalizedAnswer: string): boolean {
  const signalTokens = signal.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? []
  const relevantTokens = [...signalTokens, ...(competencyKeywords[competency] ?? [])]
  const matches = relevantTokens.filter((token) => token.length > 1 && normalizedAnswer.includes(token.toLowerCase()))
  return matches.length >= Math.min(2, Math.max(1, Math.ceil(signalTokens.length / 3)))
}

function fallbackFinalReport(scores: ScoreResult[]): FinalReport {
  const totalScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score.score, 0) / scores.length)
    : 0
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
    abilityRadar: scores.map((score) => ({
      competency: score.competency,
      score: score.score,
    })),
  })
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
