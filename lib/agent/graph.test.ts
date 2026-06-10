import { describe, expect, it } from 'vitest'
import { extractAnsweredQuestions } from '@/lib/agent/graph'
import type { InterviewMessage, InterviewQuestion } from '@/lib/types'

const question: InterviewQuestion = {
  id: 'q-rag-001',
  competencyId: 'rag_data_governance',
  competency: 'RAG 数据治理',
  difficulty: 'mid',
  type: 'scenario',
  rubricId: 'rubric-rag-data-governance',
  question: '你会如何设计企业知识库的文档清洗和切分？',
  intent: '验证 RAG 数据治理能力',
  expectedSignals: ['清洗', '切分', 'metadata'],
  sourceIds: ['source-1'],
}

function message(input: Partial<InterviewMessage>): InterviewMessage {
  return {
    id: crypto.randomUUID(),
    sessionId: 'session-test',
    role: 'system',
    content: '',
    metadata: null,
    createdAt: new Date(),
    ...input,
  }
}

describe('extractAnsweredQuestions', () => {
  it('pairs interviewer questions with candidate answers and skips self introduction', () => {
    const answered = extractAnsweredQuestions([
      message({
        role: 'candidate',
        content: '我是候选人，自我介绍。',
        metadata: { kind: 'self-introduction' },
      }),
      message({
        role: 'interviewer',
        content: question.question,
        metadata: { question },
      }),
      message({
        role: 'candidate',
        content: '我会先解析文档、去重，再按标题层级和语义窗口切分，并写入 metadata。',
      }),
    ])

    expect(answered).toHaveLength(1)
    expect(answered[0].question.id).toBe(question.id)
    expect(answered[0].answer).toContain('metadata')
  })
})
