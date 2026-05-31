export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || 'gpt-5-mini'
}

export function getOpenAIEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL)
}
