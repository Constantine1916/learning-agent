import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { z } from 'zod'
import {
  getEmbeddingDimensions,
  getEmbeddingProvider,
  getOllamaBaseUrl,
  getOllamaEmbeddingModel,
  getOpenAIBaseUrl,
  getOpenAIEmbeddingModel,
  getOpenAIModel,
  getOpenAITimeoutMs,
  hasOpenAIKey,
} from '@/lib/env'
import { contentToText, parseJsonFromText } from '@/lib/agent/json'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function invokeJson<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  fallback: () => T,
): Promise<T> {
  if (!hasOpenAIKey()) {
    return fallback()
  }

  const model = new ChatOpenAI({
    model: getOpenAIModel(),
    maxRetries: 1,
    timeout: getOpenAITimeoutMs(),
    configuration: {
      baseURL: getOpenAIBaseUrl(),
    },
  })

  try {
    const response = await model.invoke(withJsonSchemaInstruction(messages, schema) as any, {
      response_format: { type: 'json_object' },
    } as any)
    return parseJsonFromText(contentToText(response.content), schema)
  } catch (error) {
    console.warn('LLM JSON response failed validation; falling back to deterministic local result.', error)
    return fallback()
  }
}

function withJsonSchemaInstruction<T>(messages: ChatMessage[], schema: z.ZodType<T>): ChatMessage[] {
  let schemaHint: string
  try {
    schemaHint = formatJsonSchemaHint(z.toJSONSchema(schema))
  } catch {
    schemaHint = '请严格遵守调用方给定的 JSON 字段、类型和必填要求。'
  }

  return [
    {
      role: 'system',
      content:
        '你必须只输出一个可被 JSON.parse 解析的 JSON object，不要输出 Markdown、代码块、解释或多余文本。' +
        `JSON 字段约束：${schemaHint}`,
    },
    ...messages,
    {
      role: 'user',
      content: '再次确认：只返回 JSON object 本身，不要返回 Markdown 或说明文字。',
    },
  ]
}

function formatJsonSchemaHint(schema: unknown): string {
  if (!schema || typeof schema !== 'object') {
    return '返回 JSON object。'
  }

  const root = schema as {
    type?: string
    properties?: Record<string, unknown>
    required?: string[]
  }
  if (root.type !== 'object' || !root.properties) {
    return formatJsonSchemaType(root)
  }

  const required = new Set(root.required ?? [])
  return Object.entries(root.properties)
    .map(([key, value]) => `${key}${required.has(key) ? '' : '?'}:${formatJsonSchemaType(value)}`)
    .join('; ')
}

function formatJsonSchemaType(schema: unknown): string {
  if (!schema || typeof schema !== 'object') {
    return 'unknown'
  }

  const node = schema as {
    type?: string
    properties?: Record<string, unknown>
    items?: unknown
    anyOf?: unknown[]
  }

  if (node.anyOf) {
    return node.anyOf.map(formatJsonSchemaType).join('|')
  }
  if (node.type === 'array') {
    return `array<${formatJsonSchemaType(node.items)}>`
  }
  if (node.type === 'object' && node.properties) {
    return `object{${Object.entries(node.properties)
      .map(([key, value]) => `${key}:${formatJsonSchemaType(value)}`)
      .join(',')}}`
  }

  return node.type ?? 'unknown'
}

export async function embedText(text: string): Promise<number[]> {
  const embeddings = await embedDocuments([text])
  return embeddings[0]
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (getEmbeddingProvider() === 'ollama') {
    return embedWithOllama(texts)
  }

  if (!hasOpenAIKey()) {
    throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai.')
  }

  const embeddings = new OpenAIEmbeddings({
    model: getOpenAIEmbeddingModel(),
    configuration: {
      baseURL: getOpenAIBaseUrl(),
    },
  })

  const vectors = await embeddings.embedDocuments(texts)
  return vectors.map(validateEmbedding)
}

async function embedWithOllama(texts: string[]): Promise<number[][]> {
  const response = await fetch(`${getOllamaBaseUrl()}/api/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getOllamaEmbeddingModel(),
      input: texts,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Ollama embedding request failed with ${response.status}: ${details}`)
  }

  const payload = (await response.json()) as { embeddings?: unknown }
  if (!Array.isArray(payload.embeddings)) {
    throw new Error('Ollama embedding response did not include an embeddings array.')
  }

  return payload.embeddings.map(validateEmbedding)
}

function validateEmbedding(value: unknown): number[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'number' || !Number.isFinite(item))) {
    throw new Error('Embedding provider returned an invalid vector.')
  }

  const vector = value as number[]
  const expectedDimensions = getEmbeddingDimensions()
  if (vector.length !== expectedDimensions) {
    throw new Error(
      `Embedding dimension mismatch: expected ${expectedDimensions}, got ${vector.length}. ` +
        'Update EMBEDDING_DIMENSIONS and the pgvector column dimension together.',
    )
  }

  return vector
}
