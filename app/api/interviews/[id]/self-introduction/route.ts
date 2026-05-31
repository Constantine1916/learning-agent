import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runSelfIntroductionGraph } from '@/lib/agent/graph'
import {
  addInterviewMessage,
  getInterviewSession,
  getResumeRecord,
  listInterviewMessages,
  listScoreResults,
  updateInterviewSession,
} from '@/lib/db/repository'

export const runtime = 'nodejs'

const introSchema = z.object({
  content: z.string().min(20, '自我介绍至少需要 20 个字。'),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const payload = introSchema.parse(await request.json())
    const session = await getInterviewSession(id)

    if (!session?.resumeId) {
      return NextResponse.json({ error: '没有找到面试会话。' }, { status: 404 })
    }

    const resume = await getResumeRecord(session.resumeId)
    if (!resume) {
      return NextResponse.json({ error: '没有找到对应简历。' }, { status: 404 })
    }

    await addInterviewMessage({
      sessionId: session.id,
      role: 'candidate',
      content: payload.content,
      metadata: { kind: 'self-introduction' },
    })

    const messages = await listInterviewMessages(session.id)
    const scores = await listScoreResults(session.id)
    const graphResult = await runSelfIntroductionGraph({
      session: { ...session, selfIntro: payload.content },
      resume,
      selfIntro: payload.content,
      messages,
      scores,
    })

    const nextQuestion = graphResult.nextQuestion
    if (!nextQuestion || !graphResult.candidateProfile) {
      return NextResponse.json({ error: '面试官生成首题失败。' }, { status: 500 })
    }

    const updatedSession = await updateInterviewSession(session.id, {
      status: 'interviewing',
      selfIntro: payload.content,
      candidateProfile: graphResult.candidateProfile,
      questionPlan: [nextQuestion],
      round: 0,
    })

    const assistantMessage = await addInterviewMessage({
      sessionId: session.id,
      role: 'interviewer',
      content: nextQuestion.question,
      metadata: {
        question: nextQuestion,
        retrievedSourceIds: graphResult.retrievedChunks.map((chunk) => chunk.id),
      },
    })

    return NextResponse.json({
      session: updatedSession,
      candidateProfile: graphResult.candidateProfile,
      message: assistantMessage,
      question: nextQuestion,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '提交自我介绍失败。' },
      { status: 400 },
    )
  }
}
