import { closeDb, getDb } from '@/lib/db'
import {
  interviewBankCalibrationSamples,
  interviewBankCompetencies,
  interviewBankQuestions,
  interviewBankRoles,
  interviewBankRubrics,
  interviewBankSources,
} from '@/lib/db/schema'
import { readInterviewBankFromFiles } from '@/lib/interview-bank/loader'
import { ROLE_ID } from '@/lib/types'

try {
  const db = getDb()
  if (!db) {
    throw new Error('DATABASE_URL is required to ingest the structured interview bank.')
  }

  const bank = await readInterviewBankFromFiles(ROLE_ID)

  await db
    .insert(interviewBankRoles)
    .values({
      id: bank.role.id,
      title: bank.role.title,
      version: bank.role.version,
      data: bank.role,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: interviewBankRoles.id,
      set: {
        title: bank.role.title,
        version: bank.role.version,
        data: bank.role,
        updatedAt: new Date(),
      },
    })

  for (const competency of bank.competencies) {
    await db
      .insert(interviewBankCompetencies)
      .values({
        id: competency.id,
        roleId: bank.role.id,
        name: competency.name,
        category: competency.category,
        weight: competency.weight,
        data: competency,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: interviewBankCompetencies.id,
        set: {
          roleId: bank.role.id,
          name: competency.name,
          category: competency.category,
          weight: competency.weight,
          data: competency,
          updatedAt: new Date(),
        },
      })
  }

  for (const rubric of bank.rubrics) {
    await db
      .insert(interviewBankRubrics)
      .values({
        id: rubric.id,
        roleId: bank.role.id,
        competencyId: rubric.competencyId,
        difficulty: rubric.difficulty,
        data: rubric,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: interviewBankRubrics.id,
        set: {
          roleId: bank.role.id,
          competencyId: rubric.competencyId,
          difficulty: rubric.difficulty,
          data: rubric,
          updatedAt: new Date(),
        },
      })
  }

  for (const question of bank.questions) {
    await db
      .insert(interviewBankQuestions)
      .values({
        id: question.id,
        roleId: bank.role.id,
        competencyId: question.competencyId,
        rubricId: question.rubricId,
        difficulty: question.difficulty,
        type: question.type,
        data: question,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: interviewBankQuestions.id,
        set: {
          roleId: bank.role.id,
          competencyId: question.competencyId,
          rubricId: question.rubricId,
          difficulty: question.difficulty,
          type: question.type,
          data: question,
          updatedAt: new Date(),
        },
      })
  }

  for (const sample of bank.calibrationSamples) {
    await db
      .insert(interviewBankCalibrationSamples)
      .values({
        id: sample.id,
        roleId: bank.role.id,
        questionId: sample.questionId,
        quality: sample.quality,
        expectedScore: sample.expectedScore,
        data: sample,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: interviewBankCalibrationSamples.id,
        set: {
          roleId: bank.role.id,
          questionId: sample.questionId,
          quality: sample.quality,
          expectedScore: sample.expectedScore,
          data: sample,
          updatedAt: new Date(),
        },
      })
  }

  for (const source of bank.sources) {
    await db
      .insert(interviewBankSources)
      .values({
        id: source.id,
        roleId: bank.role.id,
        title: source.title,
        url: source.url,
        licenseUsage: source.usage,
        data: source,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: interviewBankSources.id,
        set: {
          roleId: bank.role.id,
          title: source.title,
          url: source.url,
          licenseUsage: source.usage,
          data: source,
          updatedAt: new Date(),
        },
      })
  }

  console.log(
    `Ingested interview bank ${bank.role.id}: ${bank.competencies.length} competencies, ${bank.questions.length} questions, ${bank.rubrics.length} rubrics, ${bank.calibrationSamples.length} calibration samples.`,
  )
} finally {
  await closeDb()
}
