import { sql } from 'drizzle-orm'
import { readFile } from 'node:fs/promises'
import { embedText } from '@/lib/agent/llm'
import { getDb } from '@/lib/db'
import { knowledgeChunks } from '@/lib/db/schema'
import { isRagLexicalFallbackEnabled } from '@/lib/env'
import { getInterviewBankKnowledgePath } from '@/lib/interview-bank/loader'
import { chunkKnowledgeMarkdown, lexicalScore } from '@/lib/rag/chunking'
import { ROLE_ID, type KnowledgeChunk } from '@/lib/types'

const LOCAL_KNOWLEDGE_SOURCE_PATH = 'content/interview-bank/ai-application-engineer/knowledge.md'
const LOCAL_KNOWLEDGE_PATH = getInterviewBankKnowledgePath(ROLE_ID)

let localKnowledgeCache: KnowledgeChunk[] | null = null

export async function retrieveKnowledge(query: string, limit = 4): Promise<KnowledgeChunk[]> {
  const db = getDb()
  if (db) {
    try {
      const embedding = await embedText(query)
      const rows = await db.execute(sql`
        SELECT id, role_id, source_path, title, competency, content, rubric,
               1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS score
        FROM knowledge_chunks
        WHERE role_id = ${ROLE_ID}
        ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
        LIMIT ${limit}
      `)

      const result = rows.map((row: any) => ({
        id: row.id,
        roleId: row.role_id,
        sourcePath: row.source_path,
        title: row.title,
        competency: row.competency,
        content: row.content,
        rubric: row.rubric ?? [],
        score: Number(row.score ?? 0),
      }))

      if (result.length > 0) {
        return result
      }
    } catch (error) {
      if (!isRagLexicalFallbackEnabled()) {
        throw error
      }

      console.warn('Falling back to local lexical RAG retrieval:', error)
    }
  }

  const chunks = await loadLocalKnowledge()
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: lexicalScore(query, `${chunk.title}\n${chunk.competency}\n${chunk.content}`),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit)
}

export async function loadLocalKnowledge(): Promise<KnowledgeChunk[]> {
  if (!localKnowledgeCache) {
    const markdown = await readFile(LOCAL_KNOWLEDGE_PATH, 'utf8')
    localKnowledgeCache = chunkKnowledgeMarkdown(markdown, LOCAL_KNOWLEDGE_SOURCE_PATH, ROLE_ID)
  }
  return localKnowledgeCache
}

export async function saveKnowledgeChunks(chunks: KnowledgeChunk[]) {
  const db = getDb()
  if (!db) {
    throw new Error('DATABASE_URL is required to ingest knowledge chunks.')
  }

  const embeddings = await Promise.all(chunks.map((chunk) => embedText(`${chunk.title}\n${chunk.content}`)))
  await db.delete(knowledgeChunks)
  await db.insert(knowledgeChunks).values(
    chunks.map((chunk, index) => ({
      roleId: chunk.roleId,
      sourcePath: chunk.sourcePath,
      title: chunk.title,
      competency: chunk.competency,
      content: chunk.content,
      rubric: chunk.rubric,
      embedding: embeddings[index],
    })),
  )
}
