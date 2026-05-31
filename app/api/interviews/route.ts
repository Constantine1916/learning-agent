import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createInterviewSession, getResumeRecord } from '@/lib/db/repository'
import { ROLE_ID } from '@/lib/types'

const createInterviewSchema = z.object({
  roleId: z.literal(ROLE_ID),
  resumeId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const payload = createInterviewSchema.parse(await request.json())
    const resume = await getResumeRecord(payload.resumeId)

    if (!resume) {
      return NextResponse.json({ error: '没有找到对应简历，请重新上传。' }, { status: 404 })
    }

    const user = await getCurrentUser()
    const session = await createInterviewSession({
      userId: user.id,
      roleId: payload.roleId,
      resumeId: resume.id,
    })

    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建面试失败。' },
      { status: 400 },
    )
  }
}
