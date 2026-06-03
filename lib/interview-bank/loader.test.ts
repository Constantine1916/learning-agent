import { describe, expect, it } from 'vitest'
import { getInterviewBank } from '@/lib/interview-bank/loader'
import { selectInterviewQuestion } from '@/lib/interview-bank/planner'

describe('interview bank', () => {
  it('loads an enterprise-grade AI application engineer bank', async () => {
    const bank = await getInterviewBank()

    expect(bank.role.id).toBe('ai-application-engineer')
    expect(bank.competencies.length).toBeGreaterThanOrEqual(10)
    expect(bank.questions.length).toBeGreaterThanOrEqual(30)
    expect(bank.rubrics).toHaveLength(bank.competencies.length)
    expect(bank.calibrationSamples.length).toBeGreaterThanOrEqual(12)

    for (const rubric of bank.rubrics) {
      expect(rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0)).toBe(100)
    }
  })

  it('selects a structured question with rubric and calibration context', async () => {
    const bank = await getInterviewBank()
    const selected = selectInterviewQuestion({
      bank,
      round: 1,
      messages: [],
      scores: [],
      candidateProfile: {
        positioning: 'RAG 和 Agent 工程候选人',
        strengths: ['RAG', 'LangGraph'],
        gaps: ['生产化经验需要验证'],
        focusAreas: ['RAG 数据治理', 'Agent 工具调用'],
        interviewStrategy: '优先验证 RAG 和 Agent 项目真实性。',
      },
      resume: {
        id: 'resume-test',
        userId: 'dev-user',
        filename: 'resume.md',
        mimeType: 'text/markdown',
        rawText: 'RAG LangGraph pgvector OpenAI',
        profile: {
          summary: '做过企业知识库 RAG 和 LangGraph Agent。',
          skills: ['RAG', 'LangGraph', 'pgvector'],
          aiHighlights: ['企业知识库 RAG', 'Agent workflow'],
          projects: [],
          risks: [],
          keywords: ['RAG', 'Agent', 'embedding'],
        },
        createdAt: new Date(),
      },
    })

    expect(selected.question.id).toBeTruthy()
    expect(selected.competency.id).toBe(selected.question.competencyId)
    expect(selected.rubric.id).toBe(selected.question.rubricId)
    expect(selected.rubric.dimensions.length).toBeGreaterThanOrEqual(4)
  })
})
