import type { KnowledgeChunk } from '@/lib/types'

export function chunkKnowledgeMarkdown(markdown: string, sourcePath: string, roleId: string): KnowledgeChunk[] {
  const sections = markdown
    .split(/\n(?=##\s+)/g)
    .map((section) => section.trim())
    .filter((section) => section.startsWith('## '))

  return sections.map((section, index) => {
    const lines = section.split('\n')
    const title = lines[0].replace(/^##\s+/, '').trim()
    const competencyLine = lines.find((line) => line.toLowerCase().startsWith('competency:'))
    const rubric = lines
      .filter((line) => line.trim().startsWith('- '))
      .map((line) => line.replace(/^\s*-\s*/, '').trim())
      .filter(Boolean)
    const content = lines
      .filter((line) => !line.toLowerCase().startsWith('competency:'))
      .join('\n')
      .trim()

    return {
      id: stableChunkId(sourcePath, index, title),
      roleId,
      sourcePath,
      title,
      competency: competencyLine?.replace(/^competency:\s*/i, '').trim() || 'AI 应用工程',
      content,
      rubric,
    }
  })
}

export function lexicalScore(query: string, content: string): number {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) {
    return 0
  }

  const contentTokens = new Set(tokenize(content))
  const hits = queryTokens.filter((token) => contentTokens.has(token)).length
  return hits / queryTokens.length
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? []).filter((token) => token.length > 1)
}

function stableChunkId(sourcePath: string, index: number, title: string): string {
  const base = `${sourcePath}:${index}:${title}`
  let hash = 2166136261
  for (let i = 0; i < base.length; i += 1) {
    hash ^= base.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `local-${Math.abs(hash).toString(16)}`
}
