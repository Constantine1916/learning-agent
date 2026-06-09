import type { KnowledgeChunk } from '@/lib/types'

export function chunkKnowledgeMarkdown(markdown: string, sourcePath: string, roleId: string): KnowledgeChunk[] {
  const sections = markdown
    .split(/\n(?=##\s+)/g)
    .map((section) => section.trim())
    .filter((section) => section.startsWith('## '))

  return sections.map((section, index) => {
    const lines = section.split('\n')
    const title = lines[0].replace(/^##\s+/, '').trim()
    const metadata = parseSectionMetadata(lines)
    const rubric = lines
      .filter((line) => line.trim().startsWith('- '))
      .map((line) => line.replace(/^\s*-\s*/, '').trim())
      .filter(Boolean)
    const content = lines
      .filter((line) => !metadataLinePattern.test(line))
      .join('\n')
      .trim()

    return {
      id: stableChunkId(sourcePath, index, title),
      roleId,
      sourcePath,
      sourceUrl: metadata.url,
      sourceTitle: metadata.source,
      licenseUsage: metadata.licenseUsage,
      title,
      competency: metadata.competency || 'AI 应用工程',
      content,
      rubric,
      metadata: {
        tags: metadata.tags,
        classification: metadata.classification,
        evidence: metadata.evidence,
      },
    }
  })
}

const metadataLinePattern = /^(competency|tags|source|url|license\/usage|evidence|classification):\s*/i

function parseSectionMetadata(lines: string[]) {
  const value = (name: string) => {
    const line = lines.find((item) => item.toLowerCase().startsWith(`${name.toLowerCase()}:`))
    return line?.replace(new RegExp(`^${escapeRegExp(name)}:\\s*`, 'i'), '').trim()
  }

  return {
    competency: value('Competency'),
    tags: (value('Tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    source: value('Source'),
    url: value('URL'),
    licenseUsage: value('License/Usage'),
    evidence: value('Evidence'),
    classification: value('Classification'),
  }
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
