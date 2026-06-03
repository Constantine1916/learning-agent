import { getCalibrationSamples, getCompetency, getRubric } from '@/lib/interview-bank/loader'
import type { BankQuestion, CalibrationSample, Competency, InterviewBank, Rubric } from '@/lib/interview-bank/schemas'
import type { CandidateProfile, InterviewMessage, ResumeRecord, ScoreResult } from '@/lib/types'

export type SelectedInterviewQuestion = {
  question: BankQuestion
  competency: Competency
  rubric: Rubric
  calibrationSamples: CalibrationSample[]
  reason: string
}

export function selectInterviewQuestion(input: {
  bank: InterviewBank
  resume: ResumeRecord
  candidateProfile: CandidateProfile | null | undefined
  messages: InterviewMessage[]
  scores: ScoreResult[]
  round: number
}): SelectedInterviewQuestion {
  const usedQuestionIds = new Set(
    input.messages
      .map((message) => {
        const question = message.metadata?.question
        return question && typeof question === 'object' && 'id' in question ? String(question.id) : null
      })
      .filter(Boolean) as string[],
  )
  const coveredCompetencies = new Set(input.scores.map((score) => score.competency))
  const targetCompetency = selectTargetCompetency(input, usedQuestionIds, coveredCompetencies)
  const candidates = input.bank.questions
    .filter((question) => question.competencyId === targetCompetency.id && !usedQuestionIds.has(question.id))
    .sort((left, right) => difficultyRank(right.difficulty, input.round) - difficultyRank(left.difficulty, input.round))

  const question =
    candidates[0] ??
    input.bank.questions.find((item) => !usedQuestionIds.has(item.id)) ??
    input.bank.questions[input.round % input.bank.questions.length]
  const competency = getCompetency(input.bank, question.competencyId)
  const rubric = getRubric(input.bank, question.rubricId)

  return {
    question,
    competency,
    rubric,
    calibrationSamples: getCalibrationSamples(input.bank, question.id),
    reason: buildSelectionReason(input, competency, usedQuestionIds, coveredCompetencies),
  }
}

function selectTargetCompetency(
  input: {
    bank: InterviewBank
    resume: ResumeRecord
    candidateProfile: CandidateProfile | null | undefined
    scores: ScoreResult[]
    round: number
  },
  usedQuestionIds: Set<string>,
  coveredCompetencies: Set<string>,
): Competency {
  const mustCover = input.bank.role.selectionPolicy.mustCoverCompetencyIds
    .map((id) => getCompetency(input.bank, id))
    .find((competency) => !coveredCompetencies.has(competency.name) && hasUnusedQuestion(input.bank, competency.id, usedQuestionIds))

  if (mustCover) {
    return mustCover
  }

  const focusText = [
    input.resume.profile.summary,
    input.resume.profile.skills.join(' '),
    input.resume.profile.aiHighlights.join(' '),
    input.resume.profile.keywords.join(' '),
    input.candidateProfile?.focusAreas.join(' '),
  ]
    .join(' ')
    .toLowerCase()

  const weakCompetency = input.scores
    .filter((score) => score.score < 80)
    .map((score) => input.bank.competencies.find((competency) => competency.name === score.competency))
    .find((competency): competency is Competency => Boolean(competency && hasUnusedQuestion(input.bank, competency.id, usedQuestionIds)))

  if (weakCompetency && input.round > 2) {
    return weakCompetency
  }

  return [...input.bank.competencies]
    .filter((competency) => hasUnusedQuestion(input.bank, competency.id, usedQuestionIds))
    .sort((left, right) => competencyPriority(right, focusText) - competencyPriority(left, focusText))[0]
}

function hasUnusedQuestion(bank: InterviewBank, competencyId: string, usedQuestionIds: Set<string>) {
  return bank.questions.some((question) => question.competencyId === competencyId && !usedQuestionIds.has(question.id))
}

function competencyPriority(competency: Competency, focusText: string): number {
  const tagHits = competency.sourceTags.filter((tag) => focusText.includes(tag.toLowerCase())).length
  const nameHits = focusText.includes(competency.name.toLowerCase()) ? 2 : 0
  const keywordHits = keywordHints[competency.id]?.filter((keyword) => focusText.includes(keyword)).length ?? 0
  return competency.weight + tagHits * 3 + nameHits + keywordHits * 2
}

function difficultyRank(difficulty: BankQuestion['difficulty'], round: number): number {
  const base = difficulty === 'senior' || difficulty === 'staff' ? 2 : difficulty === 'mid' ? 1 : 0
  return round >= 4 ? base : -base
}

function buildSelectionReason(
  input: { round: number },
  competency: Competency,
  usedQuestionIds: Set<string>,
  coveredCompetencies: Set<string>,
) {
  return `第 ${input.round} 轮选择 ${competency.name}；已用题 ${usedQuestionIds.size} 道，已覆盖能力项：${
    [...coveredCompetencies].join('、') || '暂无'
  }。`
}

const keywordHints: Record<string, string[]> = {
  llm_api_engineering: ['openai', '模型', 'api', 'streaming', 'baseurl', '供应商'],
  prompt_context_engineering: ['prompt', '上下文', 'json', 'schema', '指令'],
  structured_outputs: ['结构化', 'json', 'schema', 'tool', 'zod'],
  rag_data_governance: ['rag', '文档', '知识库', 'chunk', 'metadata'],
  vector_retrieval: ['embedding', '向量', 'pgvector', '检索', 'rerank'],
  rag_generation_evaluation: ['eval', '评估', '引用', 'groundedness', 'faithfulness'],
  agent_tool_workflow: ['agent', 'langgraph', 'tool', '工具', 'workflow'],
  agent_state_memory: ['记忆', '状态', 'session', '多轮'],
  production_observability: ['上线', '监控', 'trace', '成本', '延迟', '回滚'],
  ai_safety_governance: ['安全', '权限', '注入', '隐私', '审计'],
  ai_frontend_experience: ['前端', 'stream', 'sse', 'websocket'],
  system_product_design: ['系统设计', '架构', '产品', 'mvp'],
}
