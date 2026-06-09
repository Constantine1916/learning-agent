import { describe, expect, it } from 'vitest'
import { chunkKnowledgeMarkdown, lexicalScore } from '@/lib/rag/chunking'

describe('chunkKnowledgeMarkdown', () => {
  it('creates retrievable chunks with competency and rubric metadata', () => {
    const chunks = chunkKnowledgeMarkdown(
      `# Test\n\n## RAG\nCompetency: RAG 设计\nTags: rag, chunking\nSource: Test Source\nURL: https://example.com/rag\nLicense/Usage: Derived notes only.\n\nRAG content\n\n- chunking\n- eval\n\n## Agent\nCompetency: Agent 工程\n\nTool calling\n\n- schema`,
      'test.md',
      'ai-application-engineer',
    )

    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toMatchObject({
      title: 'RAG',
      competency: 'RAG 设计',
      rubric: ['chunking', 'eval'],
      sourceTitle: 'Test Source',
      sourceUrl: 'https://example.com/rag',
      licenseUsage: 'Derived notes only.',
      metadata: {
        tags: ['rag', 'chunking'],
      },
    })
    expect(chunks[0].content).not.toContain('Tags:')
  })
})

describe('lexicalScore', () => {
  it('scores matching knowledge higher than unrelated content', () => {
    expect(lexicalScore('rag embedding eval', 'rag embedding rerank eval')).toBeGreaterThan(
      lexicalScore('rag embedding eval', 'frontend css layout'),
    )
  })
})
