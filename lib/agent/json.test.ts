import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseJsonFromText } from '@/lib/agent/json'

describe('parseJsonFromText', () => {
  it('parses fenced JSON and validates schema', () => {
    const result = parseJsonFromText('```json\n{"score":88}\n```', z.object({ score: z.number() }))
    expect(result.score).toBe(88)
  })
})
