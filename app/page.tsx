'use client'

import {
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  Loader2,
  RotateCcw,
  Send,
  UploadCloud,
  XCircle,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { FormEvent, useMemo, useRef, useState } from 'react'
import { PASSING_SCORE, ROLE_ID, TARGET_ROUNDS, type FinalReport, type ResumeProfile, type ScoreResult } from '@/lib/types'

type ChatEntry = {
  id: string
  role: 'interviewer' | 'candidate' | 'score' | 'system'
  content: string
  score?: number
  streaming?: boolean
}

type Stage = 'resume' | 'intro' | 'interview' | 'result'
type InterviewMode = 'resume' | 'practice'

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('resume')
  const [sessionId, setSessionId] = useState('')
  const [profile, setProfile] = useState<ResumeProfile | null>(null)
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [scores, setScores] = useState<ScoreResult[]>([])
  const [report, setReport] = useState<FinalReport | null>(null)
  const [answeredRounds, setAnsweredRounds] = useState(0)
  const [intro, setIntro] = useState('')
  const [answer, setAnswer] = useState('')
  const [mode, setMode] = useState<InterviewMode>('resume')
  const [busy, setBusy] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')

  const progress = useMemo(() => Math.round((answeredRounds / TARGET_ROUNDS) * 100), [answeredRounds])

  async function uploadResume(event: FormEvent) {
    event.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('请先选择 PDF 或 .docx 简历。')
      return
    }

    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('resume', file)
      const response = await fetch('/api/resumes/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? '简历上传失败。')
      }

      setProfile(data.profile)
      const interviewResponse = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: ROLE_ID, resumeId: data.resumeId }),
      })
      const interviewData = await interviewResponse.json()
      if (!interviewResponse.ok) {
        throw new Error(interviewData.error ?? '创建面试失败。')
      }
      setSessionId(interviewData.session.id)
      setMode('resume')
      setAnsweredRounds(0)
      setStage('intro')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '简历上传失败。')
    } finally {
      setBusy(false)
    }
  }

  async function startPractice() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: ROLE_ID, mode: 'practice' }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? '创建快速练题失败。')
      }

      setMode('practice')
      setProfile(data.resume?.profile ?? null)
      setSessionId(data.session.id)
      setScores([])
      setReport(null)
      setAnsweredRounds(0)
      setIntro('')
      setAnswer('')
      setStatusText('')
      setMessages([
        {
          id: 'practice-mode',
          role: 'system',
          content: '快速练题模式已启动。你可以直接回答面试官问题，本轮不会要求上传简历或自我介绍。',
        },
        ...((data.messages ?? [data.message]).filter(Boolean).map((message: ChatEntry) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        })) as ChatEntry[]),
      ])
      setAnsweredRounds(0)
      setStage('interview')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '创建快速练题失败。')
    } finally {
      setBusy(false)
    }
  }

  async function submitIntro(event: FormEvent) {
    event.preventDefault()
    if (!intro.trim()) {
      return
    }

    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/interviews/${sessionId}/self-introduction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: intro.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? '提交自我介绍失败。')
      }

      setMessages([
        {
          id: 'self-intro',
          role: 'candidate',
          content: intro.trim(),
        },
        {
          id: data.message.id,
          role: 'interviewer',
          content: data.message.content,
        },
      ])
      setAnsweredRounds(0)
      setStage('interview')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '提交自我介绍失败。')
    } finally {
      setBusy(false)
    }
  }

  async function submitAnswer(event: FormEvent) {
    event.preventDefault()
    const content = answer.trim()
    if (!content) {
      return
    }

    setBusy(true)
    setError('')
    setStatusText('正在提交回答...')
    setAnswer('')
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'candidate',
        content,
      },
    ])

    try {
      const response = await fetch(`/api/interviews/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.body) {
        throw new Error('浏览器不支持流式响应。')
      }

      await readInterviewStream(response.body)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '提交回答失败。')
    } finally {
      setStatusText('')
      setBusy(false)
    }
  }

  async function readInterviewStream(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let activeStreamId = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) {
          continue
        }

        const payload = JSON.parse(line)
        if (payload.event === 'error' || payload.event === 'run.failed') {
          throw new Error(payload.data.error)
        }
        if (payload.event === 'answer.received') {
          setStatusText('已收到回答，正在检索题库...')
        }
        if (payload.event === 'round.done') {
          setAnsweredRounds(Number(payload.data.answeredRounds ?? 0))
        }
        if (payload.event === 'retrieval.started') {
          setStatusText('正在检索题库依据...')
        }
        if (payload.event === 'retrieval.done') {
          const chunkCount = Array.isArray(payload.data.chunks) ? payload.data.chunks.length : 0
          setStatusText(chunkCount ? `已召回 ${chunkCount} 条依据，正在准备下一步...` : '正在准备下一步...')
        }
        if (payload.event === 'assessment.started') {
          setStatusText('已完成全部答题，正在统一评分...')
        }
        if (payload.event === 'assessment.done') {
          const nextScores = (payload.data.scores ?? []) as ScoreResult[]
          setScores(nextScores)
          if (payload.data.report) {
            setReport(payload.data.report as FinalReport)
          }
          setStatusText('评分完成，正在生成最终报告...')
        }
        if (payload.event === 'score' || payload.event === 'score.done') {
          const score = (payload.data.score ?? payload.data) as ScoreResult
          setScores((current) => [...current, score])
          setMessages((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              role: 'score',
              score: score.score,
              content: `${score.feedback} 改进建议：${score.improvement}`,
            },
          ])
        }
        if (payload.event === 'message.preparing') {
          setStatusText('面试官正在组织下一题...')
        }
        if (payload.event === 'message.started' && payload.data.streamId) {
          setStatusText('')
          activeStreamId = payload.data.streamId
          setMessages((current) => [
            ...current,
            {
              id: activeStreamId,
              role: 'interviewer',
              content: '',
              streaming: true,
            },
          ])
        }
        if (payload.event === 'message.delta') {
          setStatusText('')
          const streamId = payload.data.streamId || activeStreamId
          const delta = String(payload.data.delta ?? '')
          if (!streamId || !delta) {
            continue
          }
          setMessages((current) => {
            if (!current.some((message) => message.id === streamId)) {
              return [
                ...current,
                {
                  id: streamId,
                  role: 'interviewer',
                  content: delta,
                  streaming: true,
                },
              ]
            }

            return current.map((message) =>
              message.id === streamId ? { ...message, content: message.content + delta } : message,
            )
          })
        }
        if (payload.event === 'message.done') {
          const streamId = payload.data.streamId || activeStreamId
          const doneMessage = payload.data.message
          setMessages((current) => {
            if (!streamId || !current.some((message) => message.id === streamId)) {
              return [
                ...current,
                {
                  id: doneMessage.id,
                  role: 'interviewer',
                  content: doneMessage.content,
                },
              ]
            }

            return current.map((message) =>
              message.id === streamId
                ? {
                    id: doneMessage.id,
                    role: 'interviewer',
                    content: doneMessage.content,
                  }
                : message,
            )
          })
          activeStreamId = ''
        }
        if (payload.event === 'message') {
          setMessages((current) => [
            ...current,
            {
              id: payload.data.message.id,
              role: 'interviewer',
              content: payload.data.message.content,
            },
          ])
        }
        if (payload.event === 'report' || payload.event === 'report.done') {
          setReport((payload.data.report ?? payload.data) as FinalReport)
          setStage('result')
        }
        if (payload.event === 'run.completed') {
          setStatusText('')
        }
      }
    }
  }

  function reset() {
    setStage('resume')
    setSessionId('')
    setProfile(null)
    setMessages([])
    setScores([])
    setReport(null)
    setAnsweredRounds(0)
    setIntro('')
    setAnswer('')
    setMode('resume')
    setStatusText('')
    setError('')
    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          <BrainCircuit size={24} />
        </div>
        <div>
          <p className="eyebrow">Learning Agent</p>
          <h1>真实 AI 面试官 Agent</h1>
        </div>
        <div className="topbar-status">
          <Gauge size={18} />
          <span>通过线 {PASSING_SCORE}</span>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {stage === 'resume' && (
        <section className="role-layout">
          <div className="role-copy">
            <div className="section-kicker">
              <BriefcaseBusiness size={18} />
              <span>应聘角色</span>
            </div>
            <h2>AI 应用开发工程师</h2>
            <p>选择简历面试或快速练题。简历面试会基于你的经历追问；快速练题会跳过上传，直接进入 AI 应用工程题库问答。</p>
            <div className="role-stats">
              <span>{TARGET_ROUNDS} 轮</span>
              <span>LangGraph</span>
              <span>RAG 题库</span>
              <span>LLM 评分</span>
            </div>
          </div>

          <div className="start-options">
            <form className="upload-card" onSubmit={uploadResume}>
              <span className="role-card-icon" aria-hidden="true">
                <UploadCloud size={26} />
              </span>
              <strong>上传简历面试</strong>
              <small>支持 PDF / .docx，会根据简历和自我介绍动态追问</small>
              <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? <Loader2 className="spin" size={18} /> : <FileText size={18} />}
                解析并创建面试
              </button>
            </form>

            <section className="practice-card">
              <span className="role-card-icon" aria-hidden="true">
                <ClipboardList size={26} />
              </span>
              <strong>快速练题</strong>
              <small>跳过简历上传和自我介绍，直接开始通用能力问答</small>
              <button className="primary-button" type="button" disabled={busy} onClick={startPractice}>
                {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                直接开始答题
              </button>
            </section>
          </div>
        </section>
      )}

      {stage === 'intro' && profile && (
        <section className="workbench">
          <aside className="side-panel">
            <FileText size={24} />
            <p className="eyebrow">简历画像</p>
            <h2>{profile.name || '候选人'}</h2>
            <p>{profile.summary}</p>
            <div className="tag-list">
              {profile.skills.slice(0, 8).map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </aside>

          <form className="interview-panel" onSubmit={submitIntro}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">面试官</p>
                <h2>请先进行自我介绍</h2>
              </div>
              <button className="ghost-button" type="button" onClick={reset}>
                <RotateCcw size={18} />
                重来
              </button>
            </div>
            <div className="answer-box expanded">
              <textarea
                value={intro}
                onChange={(event) => setIntro(event.target.value)}
                placeholder="请用 1-2 分钟介绍你的项目经历、AI 应用经验和应聘优势..."
              />
              <div className="answer-actions">
                <span>{intro.trim().length} 字</span>
                <button className="primary-button" type="submit" disabled={busy || intro.trim().length < 20}>
                  {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                  提交自我介绍
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {(stage === 'interview' || stage === 'result') && (
        <section className="workbench">
          <aside className="side-panel">
            <div className="progress-ring" style={{ '--progress': `${progress}%` } as CSSProperties}>
              <span>{progress}%</span>
            </div>
            <p className="eyebrow">面试进度</p>
            <h2>
              {answeredRounds} / {TARGET_ROUNDS}
            </h2>
            <div className="mode-pill">
              <span>当前模式</span>
              <strong>{mode === 'practice' ? '快速练题' : '简历面试'}</strong>
            </div>
            <div className="competency-list">
              {scores.map((score) => (
                <div className="competency-item done" key={score.questionId}>
                  <span>{score.competency}</span>
                  <strong>{score.score}</strong>
                </div>
              ))}
            </div>
          </aside>

          <div className="interview-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">面试官</p>
                <h2>AI 应用开发工程师</h2>
              </div>
              <button className="ghost-button" type="button" onClick={reset}>
                <RotateCcw size={18} />
                重来
              </button>
            </div>

            <div className="chat-stream">
              {messages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="message-meta">
                    <span>
                      {message.role === 'candidate'
                        ? '候选人'
                        : message.role === 'score'
                          ? '评分官'
                          : message.role === 'system'
                            ? '系统'
                            : '面试官'}
                    </span>
                    {typeof message.score === 'number' && <strong>{message.score} 分</strong>}
                    {message.streaming && <strong>生成中</strong>}
                  </div>
                  <p>{message.content}</p>
                </article>
              ))}
              {busy && (
                <article className="message system">
                  <div className="message-meta">
                    <span>系统</span>
                  </div>
                  <p>{statusText || 'Agent 正在处理本轮回答...'}</p>
                </article>
              )}
            </div>

            {stage === 'interview' && (
              <form className="answer-box" onSubmit={submitAnswer}>
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="请输入你的回答，尽量包含真实项目、设计取舍、指标和风险..."
                />
                <div className="answer-actions">
                  <span>{answer.trim().length} 字</span>
                  <button className="primary-button" type="submit" disabled={busy || !answer.trim()}>
                    {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                    提交回答
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}

      {stage === 'result' && report && (
        <section className="result-band">
          <div className={`result-score ${report.passed ? 'passed' : 'failed'}`}>
            {report.passed ? <CheckCircle2 size={34} /> : <XCircle size={34} />}
            <div>
              <p>综合得分</p>
              <strong>{report.totalScore}</strong>
            </div>
            <span>{report.passed ? '通过' : '未通过'}</span>
          </div>
          <div className="result-grid">
            <ResultBlock icon={<ClipboardList size={20} />} title="总结" text={report.summary} />
            <ResultBlock icon={<CheckCircle2 size={20} />} title="优势" text={report.strengths.join('、') || '暂无明显优势'} />
            <ResultBlock icon={<XCircle size={20} />} title="短板" text={report.weaknesses.join('、') || '暂无明显短板'} />
            <ResultBlock icon={<BrainCircuit size={20} />} title="学习建议" text={report.learningAdvice.join('；')} />
          </div>
        </section>
      )}
    </main>
  )
}

function ResultBlock({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="result-block">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}
