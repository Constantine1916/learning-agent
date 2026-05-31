export type EmbeddingProvider = 'ollama' | 'openai'

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || 'gpt-5-mini'
}

export function getOpenAIEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
}

export function getOpenAIBaseUrl() {
  return process.env.OPENAI_BASE_URL || undefined
}

export function getOpenAITimeoutMs() {
  const rawValue = process.env.OPENAI_TIMEOUT_MS || '60000'
  const timeout = Number(rawValue)

  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new Error(`OPENAI_TIMEOUT_MS must be a positive integer, got "${rawValue}".`)
  }

  return timeout
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = process.env.EMBEDDING_PROVIDER?.toLowerCase()
  if (provider === 'ollama' || provider === 'openai') {
    return provider
  }

  return process.env.OLLAMA_EMBEDDING_MODEL ? 'ollama' : 'openai'
}

export function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')
}

export function getOllamaEmbeddingModel() {
  return process.env.OLLAMA_EMBEDDING_MODEL || 'qwen3-embedding:4b'
}

export function getEmbeddingDimensions() {
  const rawValue = process.env.EMBEDDING_DIMENSIONS || '1536'
  const dimensions = Number(rawValue)

  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new Error(`EMBEDDING_DIMENSIONS must be a positive integer, got "${rawValue}".`)
  }

  return dimensions
}

export function isRagLexicalFallbackEnabled() {
  return process.env.RAG_LEXICAL_FALLBACK !== 'false'
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL)
}
