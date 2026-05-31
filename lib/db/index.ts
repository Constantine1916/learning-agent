import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { hasDatabaseUrl } from '@/lib/env'
import * as schema from '@/lib/db/schema'

type GlobalDb = typeof globalThis & {
  learningAgentSql?: postgres.Sql
  learningAgentDb?: ReturnType<typeof drizzle<typeof schema>>
}

export function getSqlClient() {
  if (!hasDatabaseUrl()) {
    return null
  }

  const globalDb = globalThis as GlobalDb
  if (!globalDb.learningAgentSql) {
    globalDb.learningAgentSql = postgres(process.env.DATABASE_URL!, {
      max: 5,
      prepare: false,
    })
  }
  return globalDb.learningAgentSql
}

export function getDb() {
  const sql = getSqlClient()
  if (!sql) {
    return null
  }

  const globalDb = globalThis as GlobalDb
  if (!globalDb.learningAgentDb) {
    globalDb.learningAgentDb = drizzle(sql, { schema })
  }
  return globalDb.learningAgentDb
}
