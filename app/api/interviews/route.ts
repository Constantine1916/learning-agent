import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import {
  addInterviewMessage,
  createInterviewSession,
  createResumeRecord,
  getResumeRecord,
  updateInterviewSession,
} from '@/lib/db/repository'
import { getInterviewBank } from '@/lib/interview-bank/loader'
import { selectInterviewQuestion } from '@/lib/interview-bank/planner'
import { ROLE_ID, type CandidateProfile, type InterviewQuestion, type ResumeProfile, type ResumeRecord } from '@/lib/types'

const createInterviewSchema = z.object({
  roleId: z.literal(ROLE_ID),
  resumeId: z.string().uuid().optional(),
  mode: z.enum(['resume', 'practice']).default('resume'),
})

export async function POST(request: Request) {
  try {
    const payload = createInterviewSchema.parse(await request.json())
    const user = await getCurrentUser()

    if (payload.mode === 'practice') {
      const resume = await createResumeRecord({
        userId: user.id,
        filename: 'quick-practice.md',
        mimeType: 'text/markdown',
        rawText: '快速练题模式：用户未上传简历，直接进行 AI 应用开发工程师通用能力面试练习。',
        profile: createPracticeResumeProfile(),
      })

      const session = await createInterviewSession({
        userId: user.id,
        roleId: payload.roleId,
        resumeId: resume.id,
      })
      const selfIntro = '快速练题模式：候选人未上传简历，请直接从 AI 应用开发工程师通用核心能力开始提问。'
      const candidateProfile = createPracticeCandidateProfile()

      await addInterviewMessage({
        sessionId: session.id,
        role: 'system',
        content: '快速练题模式已启动。本轮不会基于简历追问，会优先覆盖 AI 应用开发工程师通用核心能力。',
        metadata: { kind: 'practice-mode' },
      })

      const nextQuestion = await createPracticeFirstQuestion(resume, candidateProfile)

      const updatedSession = await updateInterviewSession(session.id, {
        status: 'interviewing',
        selfIntro,
        candidateProfile,
        questionPlan: [nextQuestion],
        round: 0,
      })

      const assistantMessage = await addInterviewMessage({
        sessionId: session.id,
        role: 'interviewer',
        content: nextQuestion.question,
        metadata: {
          question: nextQuestion,
          retrievedSourceIds: [],
        },
      })

      return NextResponse.json({
        session: updatedSession,
        resume,
        candidateProfile,
        messages: [assistantMessage],
        message: assistantMessage,
        question: nextQuestion,
        mode: 'practice',
      })
    }

    if (!payload.resumeId) {
      return NextResponse.json({ error: '请先上传简历，或选择快速练题模式。' }, { status: 400 })
    }

    const resume = await getResumeRecord(payload.resumeId)

    if (!resume) {
      return NextResponse.json({ error: '没有找到对应简历，请重新上传。' }, { status: 404 })
    }

    const session = await createInterviewSession({
      userId: user.id,
      roleId: payload.roleId,
      resumeId: resume.id,
    })

    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建面试失败。' },
      { status: 400 },
    )
  }
}

async function createPracticeFirstQuestion(
  resume: ResumeRecord,
  candidateProfile: CandidateProfile,
): Promise<InterviewQuestion> {
  const bank = await getInterviewBank()
  const selected = selectInterviewQuestion({
    bank,
    resume,
    candidateProfile,
    messages: [],
    scores: [],
    round: 1,
  })

  return {
    id: selected.question.id,
    competencyId: selected.question.competencyId,
    competency: selected.competency.name,
    difficulty: selected.question.difficulty,
    type: selected.question.type,
    rubricId: selected.question.rubricId,
    question: selected.question.question,
    intent: selected.question.intent,
    expectedSignals: selected.question.expectedSignals,
    redFlags: selected.question.redFlags,
    followUps: selected.question.followUps,
    sourceTags: selected.question.sourceTags,
    sourceIds: [],
  }
}

function createPracticeCandidateProfile(): CandidateProfile {
  return {
    positioning: '快速练题用户，目标是练习 AI 应用开发工程师通用核心面试题。',
    strengths: ['愿意直接进行题库练习', '适合覆盖 RAG、Agent、模型调用、评估和生产化通用能力'],
    gaps: ['未上传简历，无法基于真实项目背景个性化追问'],
    focusAreas: ['RAG 数据治理', '向量检索', 'Agent 工具调用', '生产排查', 'AI 安全'],
    interviewStrategy: '跳过简历个性化，优先覆盖 AI 应用开发工程师通用核心能力，并在回答后根据低分能力项追问。',
  }
}

function createPracticeResumeProfile(): ResumeProfile {
  return {
    name: '快速练题用户',
    summary: '快速练题模式：未上传简历，面试官应基于 AI 应用开发工程师通用能力进行题库化提问。',
    skills: [
      'LLM API 工程',
      'Prompt 工程',
      '结构化输出',
      'RAG',
      'Embedding',
      'Agent 工作流',
      'AI 安全',
      '生产化与可观测性',
    ],
    aiHighlights: ['练习 AI 应用开发工程师核心面试题', '覆盖 RAG、Agent、模型调用、评分评估和生产化能力'],
    projects: [],
    risks: ['未上传简历，缺少真实项目背景；需要通过通用场景题和追问验证工程能力。'],
    keywords: [
      'AI 应用开发工程师',
      '快速练题',
      'RAG',
      'LangGraph',
      'Agent',
      'Embedding',
      'LLM API',
      'AI 安全',
      '生产化',
    ],
  }
}
