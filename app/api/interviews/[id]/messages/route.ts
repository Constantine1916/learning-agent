import { z } from 'zod'
import {
  assessFullInterview,
  extractAnsweredQuestions,
  materializeStreamingQuestion,
  prepareStreamingInterviewQuestion,
  retrieveInterviewKnowledge,
} from '@/lib/agent/graph'
import { streamText } from '@/lib/agent/llm'
import {
  addInterviewMessage,
  addScoreResult,
  getInterviewSession,
  getResumeRecord,
  listInterviewMessages,
  saveFinalReport,
  updateInterviewSession,
} from '@/lib/db/repository'
import { TARGET_ROUNDS } from '@/lib/types'

export const runtime = 'nodejs'

const messageSchema = z.object({
  content: z.string().min(2, '回答不能为空。'),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify({ event, data }) + '\n'))
      }

      try {
        const runId = crypto.randomUUID()
        const { id } = await context.params
        const payload = messageSchema.parse(await request.json())
        const session = await getInterviewSession(id)
        send('run.started', { runId, sessionId: id })

        if (!session?.resumeId) {
          send('run.failed', { runId, error: '没有找到面试会话。' })
          controller.close()
          return
        }

        const resume = await getResumeRecord(session.resumeId)
        if (!resume) {
          send('run.failed', { runId, error: '没有找到对应简历。' })
          controller.close()
          return
        }

        send('answer.received', { runId })
        await addInterviewMessage({
          sessionId: session.id,
          role: 'candidate',
          content: payload.content,
        })

        const messages = await listInterviewMessages(session.id)
        const answeredRounds = extractAnsweredQuestions(messages).length
        send('round.done', { runId, answeredRounds, targetRounds: TARGET_ROUNDS })
        send('retrieval.started', { runId })
        const retrievedChunks = await retrieveInterviewKnowledge({
          session,
          resume,
          latestAnswer: payload.content,
        })
        send('retrieval.done', {
          runId,
          chunks: retrievedChunks.map((chunk) => ({
            id: chunk.id,
            title: chunk.title,
            competency: chunk.competency,
            score: chunk.score,
            sourceUrl: chunk.sourceUrl,
          })),
        })

        if (answeredRounds >= TARGET_ROUNDS) {
          send('assessment.started', { runId, answeredRounds })
          const assessment = await assessFullInterview({
            resume,
            messages,
            chunks: retrievedChunks,
          })
          const savedScores = []
          for (const score of assessment.scores) {
            savedScores.push(await addScoreResult(session.id, score))
          }
          await addInterviewMessage({
            sessionId: session.id,
            role: 'score',
            content: assessment.report.summary,
            metadata: {
              kind: 'final-assessment',
              scores: savedScores,
              report: assessment.report,
            },
          })
          send('assessment.done', { runId, scores: savedScores, report: assessment.report })

          send('report.started', { runId })
          const report = assessment.report
          await saveFinalReport(session.id, report)
          await updateInterviewSession(session.id, {
            status: 'completed',
            round: answeredRounds,
          })
          send('report.done', { runId, report })
          send('run.completed', { runId })
          controller.close()
          return
        }

        send('message.preparing', { runId })
        const questionPlan = await prepareStreamingInterviewQuestion({
          resume,
          candidateProfile: session.candidateProfile,
          chunks: retrievedChunks,
          messages,
          scores: [],
          round: answeredRounds + 1,
        })
        const streamId = crypto.randomUUID()
        send('message.started', {
          runId,
          streamId,
          role: 'interviewer',
          question: { ...questionPlan.question, question: '' },
        })

        let streamedQuestion = ''
        try {
          for await (const delta of streamText(questionPlan.messages)) {
            streamedQuestion += delta
            send('message.delta', { runId, streamId, delta })
          }
        } catch (error) {
          console.warn('Question streaming failed; falling back to deterministic question.', error)
        }

        if (!streamedQuestion.trim()) {
          for (const delta of chunkText(questionPlan.question.question)) {
            streamedQuestion += delta
            send('message.delta', { runId, streamId, delta })
          }
        }

        const nextQuestion = materializeStreamingQuestion(questionPlan, streamedQuestion)
        const updatedQuestionPlan = [...session.questionPlan, nextQuestion]
        const updatedSession = await updateInterviewSession(session.id, {
          status: 'interviewing',
          questionPlan: updatedQuestionPlan,
          round: answeredRounds,
        })
        const assistantMessage = await addInterviewMessage({
          sessionId: session.id,
          role: 'interviewer',
          content: nextQuestion.question,
          metadata: {
            question: nextQuestion,
            retrievedSourceIds: retrievedChunks.map((chunk) => chunk.id),
          },
        })

        send('message.done', {
          runId,
          streamId,
          session: updatedSession,
          message: assistantMessage,
          question: nextQuestion,
        })
        send('run.completed', { runId })
        controller.close()
      } catch (error) {
        send('run.failed', { error: error instanceof Error ? error.message : '面试消息处理失败。' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}

function chunkText(text: string, size = 3): string[] {
  const chunks: string[] = []
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size))
  }
  return chunks
}
