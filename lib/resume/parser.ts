import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { z } from 'zod'
import { invokeJson } from '@/lib/agent/llm'
import { resumeProfileSchema, type ResumeProfile } from '@/lib/types'

const MAX_RESUME_BYTES = 8 * 1024 * 1024
const MIN_TEXT_LENGTH = 20

export type ResumeFileInput = {
  filename: string
  mimeType: string
  buffer: Buffer
}

export async function extractResumeText(input: ResumeFileInput): Promise<string> {
  validateResumeFile(input)
  const filename = input.filename.toLowerCase()

  if (filename.endsWith('.pdf') || input.mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: new Uint8Array(input.buffer) })
    try {
      const result = await parser.getText()
      return normalizeExtractedText(result.text)
    } finally {
      await parser.destroy()
    }
  }

  if (
    filename.endsWith('.docx') ||
    input.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer: input.buffer })
    return normalizeExtractedText(result.value)
  }

  if (filename.endsWith('.doc') || input.mimeType === 'application/msword') {
    throw new Error('暂不支持 .doc 简历，请转换为 .docx 或 PDF 后再上传。')
  }

  throw new Error('仅支持上传 PDF 或 .docx 格式的简历。')
}

export async function parseResumeProfile(rawText: string, filename: string): Promise<ResumeProfile> {
  return invokeJson(
    [
      {
        role: 'system',
        content:
          '你是一个严谨的招聘简历解析 Agent。请只输出 JSON，不要输出 Markdown。字段必须符合 schema。',
      },
      {
        role: 'user',
        content: `请从下面简历中提取 AI 应用开发工程师面试所需画像。\n文件名：${filename}\n\n简历文本：\n${rawText.slice(0, 12000)}`,
      },
    ],
    resumeProfileSchema,
    () => heuristicResumeProfile(rawText),
  )
}

function validateResumeFile(input: ResumeFileInput) {
  if (input.buffer.byteLength === 0) {
    throw new Error('简历文件为空，请重新上传。')
  }

  if (input.buffer.byteLength > MAX_RESUME_BYTES) {
    throw new Error('简历文件超过 8MB，请压缩后再上传。')
  }
}

function normalizeExtractedText(text: string): string {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (normalized.length < MIN_TEXT_LENGTH) {
    throw new Error('没有从简历中解析到足够文本，请确认文件内容可复制。')
  }
  return normalized
}

function heuristicResumeProfile(rawText: string): ResumeProfile {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const text = rawText.toLowerCase()
  const skillCandidates = [
    'React',
    'Next.js',
    'TypeScript',
    'Node.js',
    'Python',
    'RAG',
    'LangChain',
    'LangGraph',
    'OpenAI',
    'LLM',
    'Agent',
    'PostgreSQL',
    'pgvector',
    'Docker',
  ]
  const skills = skillCandidates.filter((skill) => text.includes(skill.toLowerCase()))
  const aiHighlights = lines
    .filter((line) => /ai|llm|rag|agent|openai|模型|智能体|向量|知识库/i.test(line))
    .slice(0, 6)

  return resumeProfileSchema.parse({
    name: lines[0]?.slice(0, 24),
    summary: lines.slice(0, 5).join('；') || '简历文本已解析，等待候选人自我介绍补充。',
    skills: skills.length > 0 ? skills : ['AI 应用开发', '工程实现', '问题分析'],
    aiHighlights: aiHighlights.length > 0 ? aiHighlights : ['简历中 AI 相关项目线索较少，需要面试中重点追问。'],
    projects: [
      {
        name: '简历项目经历',
        description: aiHighlights[0] ?? lines.slice(0, 3).join('；'),
        technologies: skills.slice(0, 6),
      },
    ],
    risks: ['简历解析为启发式结果，需要结合自我介绍和追问确认真实深度。'],
    keywords: [...new Set([...skills, ...aiHighlights.join(' ').split(/\s+/).slice(0, 8)])].slice(0, 16),
  })
}

export const resumeUploadResponseSchema = z.object({
  resumeId: z.string(),
  profile: resumeProfileSchema,
  textPreview: z.string(),
})
