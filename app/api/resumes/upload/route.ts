import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createResumeRecord } from '@/lib/db/repository'
import { extractResumeText, parseResumeProfile } from '@/lib/resume/parser'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('resume')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '请上传 PDF 或 .docx 简历文件。' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const rawText = await extractResumeText({
      filename: file.name,
      mimeType: file.type,
      buffer,
    })
    const profile = await parseResumeProfile(rawText, file.name)
    const user = await getCurrentUser()
    const resume = await createResumeRecord({
      userId: user.id,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      rawText,
      profile,
    })

    return NextResponse.json({
      resumeId: resume.id,
      profile,
      textPreview: rawText.slice(0, 800),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '简历上传失败。' },
      { status: 400 },
    )
  }
}
