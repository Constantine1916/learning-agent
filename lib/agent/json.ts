import { z } from 'zod'

export function contentToText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text: unknown }).text)
        }
        return ''
      })
      .join('')
  }
  return String(content ?? '')
}

export function parseJsonFromText<T>(text: string, schema: z.ZodType<T>): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const raw = (fenced ?? text).trim()
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  const jsonText = firstBrace >= 0 && lastBrace >= firstBrace ? raw.slice(firstBrace, lastBrace + 1) : raw
  return schema.parse(JSON.parse(jsonText))
}
