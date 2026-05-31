import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { closeDb } from '@/lib/db'
import { chunkKnowledgeMarkdown } from '@/lib/rag/chunking'
import { saveKnowledgeChunks } from '@/lib/rag/retriever'
import { ROLE_ID } from '@/lib/types'

try {
  const sourcePath = 'content/knowledge/ai-application-engineer.md'
  const absolutePath = path.join(process.cwd(), sourcePath)
  const markdown = await readFile(absolutePath, 'utf8')
  const chunks = chunkKnowledgeMarkdown(markdown, sourcePath, ROLE_ID)

  await saveKnowledgeChunks(chunks)
  console.log(`Ingested ${chunks.length} knowledge chunks for ${ROLE_ID}.`)
} finally {
  await closeDb()
}
