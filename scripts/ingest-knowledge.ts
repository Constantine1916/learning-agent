import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { closeDb } from '@/lib/db'
import { getInterviewBankKnowledgePath } from '@/lib/interview-bank/loader'
import { chunkKnowledgeMarkdown } from '@/lib/rag/chunking'
import { saveKnowledgeChunks } from '@/lib/rag/retriever'
import { ROLE_ID, type KnowledgeChunk } from '@/lib/types'

type CollectedKnowledgeChunk = {
  id: string
  roleId: string
  source: string
  sourceUrl: string
  sourceFinalUrl?: string
  sourceTitle: string
  publisher: string
  licenseUsage: string
  reliability?: string
  sourceKind?: string
  title: string
  competency: string
  content: string
  rubric: string[]
  tags: string[]
  classification?: Record<string, unknown>
  quality?: Record<string, unknown>
  textStats: Record<string, unknown>
  cleaning?: Record<string, unknown>
  collectedAt: string
}

try {
  const sourcePath = 'content/interview-bank/ai-application-engineer/knowledge.md'
  const absolutePath = path.isAbsolute(sourcePath) ? sourcePath : getInterviewBankKnowledgePath(ROLE_ID)
  const markdown = await readFile(absolutePath, 'utf8')
  const chunks = chunkKnowledgeMarkdown(markdown, sourcePath, ROLE_ID)
  const collectedChunks = await loadCollectedKnowledgeChunks()

  await saveKnowledgeChunks([...chunks, ...collectedChunks])
  console.log(`Ingested ${chunks.length + collectedChunks.length} knowledge chunks for ${ROLE_ID}.`)
  console.log(`- Base interview-bank knowledge chunks: ${chunks.length}`)
  console.log(`- Collected source chunks: ${collectedChunks.length}`)
} finally {
  await closeDb()
}

async function loadCollectedKnowledgeChunks(): Promise<KnowledgeChunk[]> {
  const jsonlPath = path.join(
    process.cwd(),
    'content/interview-bank/ai-application-engineer/collected-knowledge.jsonl',
  )

  let raw: string
  try {
    raw = await readFile(jsonlPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CollectedKnowledgeChunk)
    .map((chunk) => ({
      id: chunk.id,
      roleId: chunk.roleId,
      sourcePath: 'content/interview-bank/ai-application-engineer/collected-knowledge.jsonl',
      sourceUrl: chunk.sourceUrl,
      sourceTitle: chunk.sourceTitle,
      licenseUsage: chunk.licenseUsage,
      title: chunk.title,
      competency: chunk.competency,
      content: chunk.content,
      rubric: chunk.rubric,
      metadata: {
        sourceChunkId: chunk.id,
        source: chunk.source,
        sourceFinalUrl: chunk.sourceFinalUrl,
        publisher: chunk.publisher,
        reliability: chunk.reliability,
        sourceKind: chunk.sourceKind,
        tags: chunk.tags,
        classification: chunk.classification,
        quality: chunk.quality,
        textStats: chunk.textStats,
        cleaning: chunk.cleaning,
        collectedAt: chunk.collectedAt,
      },
    }))
}
