import { z } from 'zod'
import { runAnswerGraph } from '@/lib/agent/graph'
import {
  addInterviewMessage,
  addScoreResult,
  getInterviewSession,
  getResumeRecord,
  listInterviewMessages,
  listScoreResults,
  saveFinalReport,
  updateInterviewSession,
} from '@/lib/db/repository'
import { getInterviewBank } from '@/lib/interview-bank/loader'
import { TARGET_ROUNDS, type FinalReport, type ScoreResult } from '@/lib/types'

export const runtime = 'nodejs'

const messageSchema = z.object({
  content: z.string().min(2, '回答不能为空。'),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify({ event, data }) + '\n'))
      }

      try {
        const { id } = await context.params
        const payload = messageSchema.parse(await request.json())
        const session = await getInterviewSession(id)

        if (!session?.resumeId) {
          send('error', { error: '没有找到面试会话。' })
          controller.close()
          return
        }

        const resume = await getResumeRecord(session.resumeId)
        if (!resume) {
          send('error', { error: '没有找到对应简历。' })
          controller.close()
          return
        }

        send('status', { message: '候选人回答已收到，面试官正在评分。' })
        await addInterviewMessage({
          sessionId: session.id,
          role: 'candidate',
          content: payload.content,
        })

        const messages = await listInterviewMessages(session.id)
        const scores = await listScoreResults(session.id)
        const graphResult = await runAnswerGraph({
          session,
          resume,
          latestAnswer: payload.content,
          messages,
          scores,
        })

        if (!graphResult.scoreResult) {
          send('error', { error: '评分失败，请稍后重试。' })
          controller.close()
          return
        }

        const score = await addScoreResult(session.id, graphResult.scoreResult)
        await addInterviewMessage({
          sessionId: session.id,
          role: 'score',
          content: score.feedback,
          metadata: { score },
        })
        send('score', score)

        const completedScores = [...scores, score]
        if (graphResult.finalReport || completedScores.length >= TARGET_ROUNDS) {
          const report = graphResult.finalReport ?? (await weightedFallbackReport(completedScores))
          await saveFinalReport(session.id, report)
          await updateInterviewSession(session.id, {
            status: 'completed',
            round: completedScores.length,
          })
          send('report', report)
          controller.close()
          return
        }

        if (!graphResult.nextQuestion) {
          send('error', { error: '生成下一题失败，请稍后重试。' })
          controller.close()
          return
        }

        const updatedQuestionPlan = [...session.questionPlan, graphResult.nextQuestion]
        const updatedSession = await updateInterviewSession(session.id, {
          status: 'interviewing',
          questionPlan: updatedQuestionPlan,
          round: completedScores.length,
        })
        const assistantMessage = await addInterviewMessage({
          sessionId: session.id,
          role: 'interviewer',
          content: graphResult.nextQuestion.question,
          metadata: {
            question: graphResult.nextQuestion,
            retrievedSourceIds: graphResult.retrievedChunks.map((chunk) => chunk.id),
          },
        })

        send('message', {
          session: updatedSession,
          message: assistantMessage,
          question: graphResult.nextQuestion,
        })
        controller.close()
      } catch (error) {
        send('error', { error: error instanceof Error ? error.message : '面试消息处理失败。' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}

async function weightedFallbackReport(scores: ScoreResult[]): Promise<FinalReport> {
  const bank = await getInterviewBank()
  const scoresByCompetency = new Map<string, ScoreResult[]>()
  for (const score of scores) {
    scoresByCompetency.set(score.competency, [...(scoresByCompetency.get(score.competency) ?? []), score])
  }

  let weightedSum = 0
  let coveredWeight = 0
  const abilityRadar = [...scoresByCompetency].map(([competencyName, competencyScores]) => {
    const average = Math.round(
      competencyScores.reduce((sum, item) => sum + item.score, 0) / Math.max(competencyScores.length, 1),
    )
    const weight = bank.competencies.find((competency) => competency.name === competencyName)?.weight ?? 1
    weightedSum += average * weight
    coveredWeight += weight
    return { competency: competencyName, score: average }
  })
  const totalScore = coveredWeight ? Math.round(weightedSum / coveredWeight) : 0

  return {
    totalScore,
    passed: totalScore >= bank.role.passingScore,
    summary: '面试结束，系统已按能力项权重生成综合报告。',
    strengths: scores.filter((item) => item.passed).map((item) => item.competency),
    weaknesses: scores.filter((item) => !item.passed).map((item) => item.competency),
    learningAdvice: ['继续补充真实项目案例、上线指标、风险处理和复盘经验。'],
    abilityRadar,
  }
}
