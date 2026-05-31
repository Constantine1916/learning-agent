import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { z } from 'zod'
import { getOpenAIBaseUrl, getOpenAIEmbeddingModel, getOpenAIModel, hasOpenAIKey } from '@/lib/env'
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
    maxRetries: 2,
    configuration: {
      baseURL: getOpenAIBaseUrl(),
    },
  })

  try {
    const response = await model.invoke(messages as any)
    return parseJsonFromText(contentToText(response.content), schema)
  } catch (error) {
    console.warn('LLM JSON response failed validation; falling back to deterministic local result.', error)
    return fallback()
  }
}

export async function embedText(text: string): Promise<number[]> {
  if (!hasOpenAIKey() || getOpenAIEmbeddingModel() === 'local-hash') {
    return hashEmbedding(text)
  }

  const embeddings = new OpenAIEmbeddings({
    model: getOpenAIEmbeddingModel(),
    configuration: {
      baseURL: getOpenAIBaseUrl(),
    },
  })
  try {
    return await embeddings.embedQuery(text)
  } catch (error) {
    console.warn('Embedding request failed; falling back to local hash embedding.', error)
    return hashEmbedding(text)
  }
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (!hasOpenAIKey() || getOpenAIEmbeddingModel() === 'local-hash') {
    return texts.map(hashEmbedding)
  }

  const embeddings = new OpenAIEmbeddings({
    model: getOpenAIEmbeddingModel(),
    configuration: {
      baseURL: getOpenAIBaseUrl(),
    },
  })
  try {
    return await embeddings.embedDocuments(texts)
  } catch (error) {
    console.warn('Embedding request failed; falling back to local hash embeddings.', error)
    return texts.map(hashEmbedding)
  }
}

function hashEmbedding(text: string, dimensions = 1536): number[] {
  const vector = Array.from({ length: dimensions }, () => 0)
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? []

  for (const token of tokens) {
    let hash = 2166136261
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    vector[Math.abs(hash) % dimensions] += 1
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => Number((value / magnitude).toFixed(6)))
}
