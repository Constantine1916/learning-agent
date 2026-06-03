import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { closeDb } from '@/lib/db'
import { getInterviewBankKnowledgePath } from '@/lib/interview-bank/loader'
import { chunkKnowledgeMarkdown } from '@/lib/rag/chunking'
import { saveKnowledgeChunks } from '@/lib/rag/retriever'
import { ROLE_ID } from '@/lib/types'

try {
  const sourcePath = 'content/interview-bank/ai-application-engineer/knowledge.md'
  const absolutePath = path.isAbsolute(sourcePath) ? sourcePath : getInterviewBankKnowledgePath(ROLE_ID)
  const markdown = await readFile(absolutePath, 'utf8')
  const chunks = chunkKnowledgeMarkdown(markdown, sourcePath, ROLE_ID)

  await saveKnowledgeChunks(chunks)
  console.log(`Ingested ${chunks.length} knowledge chunks for ${ROLE_ID}.`)
} finally {
  await closeDb()
}
