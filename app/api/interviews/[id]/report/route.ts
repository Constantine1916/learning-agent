import { NextResponse } from 'next/server'
import { getFinalReport, getInterviewSession, listScoreResults } from '@/lib/db/repository'
import { finalReportSchema, PASSING_SCORE } from '@/lib/types'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const session = await getInterviewSession(id)

  if (!session) {
    return NextResponse.json({ error: '没有找到面试会话。' }, { status: 404 })
  }

  const existing = await getFinalReport(id)
  if (existing) {
    return NextResponse.json({ report: existing })
  }

  const scores = await listScoreResults(id)
  if (scores.length === 0) {
    return NextResponse.json({ error: '当前面试还没有评分结果。' }, { status: 404 })
  }

  const totalScore = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length)
  const report = finalReportSchema.parse({
    totalScore,
    passed: totalScore >= PASSING_SCORE,
    summary: '面试仍在进行中，这是当前阶段性报告。',
    strengths: scores.filter((item) => item.passed).map((item) => item.competency),
    weaknesses: scores.filter((item) => !item.passed).map((item) => item.competency),
    learningAdvice: ['继续完成剩余面试轮次，补充真实项目细节和上线指标。'],
    abilityRadar: scores.map((item) => ({ competency: item.competency, score: item.score })),
  })

  return NextResponse.json({ report })
}
