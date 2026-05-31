import { describe, expect, it } from 'vitest'
import { extractResumeText, parseResumeProfile } from '@/lib/resume/parser'

describe('extractResumeText', () => {
  it('rejects empty files', async () => {
    await expect(
      extractResumeText({
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(0),
      }),
    ).rejects.toThrow('简历文件为空')
  })

  it('rejects legacy doc files with an actionable message', async () => {
    await expect(
      extractResumeText({
        filename: 'resume.doc',
        mimeType: 'application/msword',
        buffer: Buffer.from('legacy doc'),
      }),
    ).rejects.toThrow('暂不支持 .doc')
  })
})

describe('parseResumeProfile', () => {
  it('creates a deterministic profile when no OpenAI key is configured', async () => {
    const profile = await parseResumeProfile(
      '张三\nAI 应用开发工程师，熟悉 React、Next.js、OpenAI、RAG、LangGraph 和 pgvector。\n做过企业知识库 Agent 项目。',
      'resume.pdf',
    )

    expect(profile.skills).toContain('React')
    expect(profile.aiHighlights.length).toBeGreaterThan(0)
  })
})
