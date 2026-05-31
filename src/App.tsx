import {
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Gauge,
  RotateCcw,
  Send,
  ShieldCheck,
  Trophy,
  XCircle,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import './App.css'

type Phase = 'role' | 'interview' | 'result'

type Criterion = {
  label: string
  keywords: string[]
  weight: number
}

type InterviewQuestion = {
  id: string
  competency: string
  prompt: string
  idealSignal: string
  criteria: Criterion[]
}

type AnswerResult = {
  questionId: string
  competency: string
  score: number
  matched: string[]
  missing: string[]
  feedback: string
}

type ChatEntry = {
  id: string
  role: 'interviewer' | 'candidate' | 'feedback'
  content: string
  score?: number
}

const role = {
  id: 'ai-application-engineer',
  title: 'AI 应用开发工程师',
  level: '应用工程 / Agent / RAG',
  rounds: 6,
}

const interviewQuestions: InterviewQuestion[] = [
  {
    id: 'role-difference',
    competency: '岗位认知',
    prompt:
      '请先说说你理解的 AI 应用开发工程师和传统后端开发，在工作重点上有什么差异？',
    idealSignal: '能把业务场景、模型能力、工程交付、评估迭代放在同一张图里说明。',
    criteria: [
      {
        label: '业务场景和用户任务',
        keywords: ['业务', '用户', '场景', '任务', '需求', 'product', 'user'],
        weight: 16,
      },
      {
        label: '模型/API 能力边界',
        keywords: ['模型', 'llm', 'api', '能力边界', '上下文', 'token', '多模态'],
        weight: 16,
      },
      {
        label: '提示词与上下文工程',
        keywords: ['prompt', '提示词', '上下文', 'system prompt', 'few-shot', '指令'],
        weight: 16,
      },
      {
        label: '评估和持续迭代',
        keywords: ['评估', 'eval', '测试集', '指标', '迭代', '反馈'],
        weight: 16,
      },
      {
        label: '可靠性、成本和延迟',
        keywords: ['可靠', '稳定', '成本', '延迟', 'latency', '监控', '降级'],
        weight: 16,
      },
    ],
  },
  {
    id: 'rag-design',
    competency: 'RAG 设计',
    prompt:
      '如果要做一个企业知识库问答系统，你会怎样设计 RAG 架构？请讲到关键模块和质量保障。',
    idealSignal: '能覆盖数据处理、召回、重排、生成、引用、评估和线上监控。',
    criteria: [
      {
        label: '文档处理与切分',
        keywords: ['切分', 'chunk', '清洗', '解析', 'metadata', '元数据', 'ingestion'],
        weight: 16,
      },
      {
        label: '向量化与检索',
        keywords: ['embedding', '向量', 'vector', '召回', '检索', 'hybrid', 'bm25'],
        weight: 16,
      },
      {
        label: '重排和上下文组装',
        keywords: ['rerank', '重排', 'topk', '上下文', '去重', '压缩'],
        weight: 16,
      },
      {
        label: '引用和拒答策略',
        keywords: ['引用', '来源', 'citation', '不知道', '拒答', 'grounded', '幻觉'],
        weight: 16,
      },
      {
        label: '离线评估与线上监控',
        keywords: ['评估', '测试集', '命中率', '召回率', '监控', '日志', '反馈'],
        weight: 16,
      },
    ],
  },
  {
    id: 'debug-hallucination',
    competency: '问题排查',
    prompt:
      '上线后用户反馈模型有时回答不稳定，甚至编造内容。你会按什么顺序排查？',
    idealSignal: '能从复现、链路日志、提示词、检索、模型参数、安全策略逐层定位。',
    criteria: [
      {
        label: '复现样本和日志链路',
        keywords: ['复现', '样本', '日志', 'trace', '请求', '链路', 'case'],
        weight: 16,
      },
      {
        label: '提示词和上下文检查',
        keywords: ['prompt', '提示词', '上下文', 'system', '模板', '变量'],
        weight: 16,
      },
      {
        label: '检索质量定位',
        keywords: ['检索', '召回', 'rerank', '知识库', 'chunk', 'embedding'],
        weight: 16,
      },
      {
        label: '模型参数与版本',
        keywords: ['temperature', '模型版本', '参数', 'top_p', '升级', '回滚'],
        weight: 16,
      },
      {
        label: '防护、评估和监控闭环',
        keywords: ['guardrail', '安全', '评估', '监控', '报警', '人工', '灰度'],
        weight: 16,
      },
    ],
  },
  {
    id: 'tool-calling',
    competency: 'Agent 工程',
    prompt:
      '什么时候你会使用 tool calling 或 Agent 工作流？设计时如何控制工具调用风险？',
    idealSignal: '能解释适用边界、工具 schema、编排状态、权限隔离和人工确认。',
    criteria: [
      {
        label: '适用场景判断',
        keywords: ['外部系统', '实时', '数据库', '动作', '查询', 'tool', '函数'],
        weight: 16,
      },
      {
        label: '工具 schema 和参数校验',
        keywords: ['schema', '参数', '校验', '类型', '函数', 'json'],
        weight: 16,
      },
      {
        label: '状态编排和可观测性',
        keywords: ['状态', '编排', 'workflow', 'trace', '日志', '步骤'],
        weight: 16,
      },
      {
        label: '权限、沙箱和幂等',
        keywords: ['权限', '沙箱', '幂等', '重试', '限流', '隔离'],
        weight: 16,
      },
      {
        label: '高风险动作人工确认',
        keywords: ['人工确认', 'human', '审核', '确认', '审批', '回滚'],
        weight: 16,
      },
    ],
  },
  {
    id: 'launch-eval',
    competency: '上线评估',
    prompt:
      '你如何判断一个 AI 应用已经可以上线？请给出你会看的评估维度。',
    idealSignal: '能把效果、安全、成本、性能、监控和业务指标都纳入上线门槛。',
    criteria: [
      {
        label: '离线测试集和基准',
        keywords: ['离线', '测试集', 'benchmark', 'eval', '基准', 'golden'],
        weight: 16,
      },
      {
        label: '人工验收和红队',
        keywords: ['人工', '验收', '红队', 'review', '标注', '安全测试'],
        weight: 16,
      },
      {
        label: '业务指标',
        keywords: ['业务', '转化', '留存', '满意度', '准确率', '完成率'],
        weight: 16,
      },
      {
        label: '性能与成本',
        keywords: ['延迟', '成本', '并发', 'token', '缓存', '降级'],
        weight: 16,
      },
      {
        label: '安全、监控和回滚',
        keywords: ['安全', '监控', '报警', '灰度', '回滚', '合规'],
        weight: 16,
      },
    ],
  },
  {
    id: 'mvp-design',
    competency: '方案设计',
    prompt:
      '现场题：如果让你设计这个“面试问答 Agent”的最小可用版本，你会包含哪些模块？',
    idealSignal: '能从角色、问题库、对话状态、评分、报告和后续扩展说清楚 MVP。',
    criteria: [
      {
        label: '角色和流程入口',
        keywords: ['角色', '入口', '选择', '流程', '岗位', '候选人'],
        weight: 16,
      },
      {
        label: '问题库和题目策略',
        keywords: ['问题库', '题库', '题目', '策略', '难度', '能力模型'],
        weight: 16,
      },
      {
        label: '对话状态管理',
        keywords: ['状态', '对话', '轮次', '历史', '上下文', 'session'],
        weight: 16,
      },
      {
        label: '评分规则和反馈报告',
        keywords: ['评分', 'rubric', '反馈', '报告', '通过', '得分'],
        weight: 16,
      },
      {
        label: '数据持久化和迭代',
        keywords: ['数据库', '持久化', '分析', '迭代', '记录', '指标'],
        weight: 16,
      },
    ],
  },
]

const structureSignals = [
  '首先',
  '其次',
  '最后',
  '步骤',
  '指标',
  '风险',
  '取舍',
  '例如',
  '因为',
  '所以',
  '方案',
  '上线',
  '监控',
  'tradeoff',
  'metric',
  'risk',
]

function scoreAnswer(question: InterviewQuestion, answer: string): AnswerResult {
  const normalized = answer.toLowerCase()
  const matchedCriteria = question.criteria.filter((criterion) =>
    criterion.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  )
  const rubricScore = matchedCriteria.reduce((sum, criterion) => sum + criterion.weight, 0)
  const detailScore =
    answer.length >= 180 ? 12 : answer.length >= 110 ? 9 : answer.length >= 60 ? 5 : 2
  const structureScore = Math.min(
    8,
    structureSignals.filter((signal) => normalized.includes(signal.toLowerCase())).length * 2,
  )
  const score = Math.min(100, Math.round(rubricScore + detailScore + structureScore))
  const missing = question.criteria
    .filter((criterion) => !matchedCriteria.includes(criterion))
    .map((criterion) => criterion.label)

  const feedback =
    score >= 85
      ? '回答覆盖了核心工程面，表达也比较有条理。'
      : score >= 70
        ? '方向基本正确，但还可以补充工程细节、指标或风险控制。'
        : '回答还偏概念化，需要把方案拆成可执行模块，并给出评估标准。'

  return {
    questionId: question.id,
    competency: question.competency,
    score,
    matched: matchedCriteria.map((criterion) => criterion.label),
    missing,
    feedback,
  }
}

function summarize(results: AnswerResult[]) {
  const score =
    results.length === 0
      ? 0
      : Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
  const strengths = results
    .filter((result) => result.score >= 80)
    .map((result) => result.competency)
  const gaps = results
    .filter((result) => result.score < 80)
    .map((result) => result.competency)

  return {
    score,
    passed: score >= 80 && results.length === interviewQuestions.length,
    strengths: [...new Set(strengths)].slice(0, 3),
    gaps: [...new Set(gaps)].slice(0, 3),
  }
}

function App() {
  const [phase, setPhase] = useState<Phase>('role')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draft, setDraft] = useState('')
  const [transcript, setTranscript] = useState<ChatEntry[]>([])
  const [results, setResults] = useState<AnswerResult[]>([])

  const currentQuestion = interviewQuestions[currentIndex]
  const report = useMemo(() => summarize(results), [results])
  const progress = Math.round((results.length / interviewQuestions.length) * 100)

  function startInterview() {
    setPhase('interview')
    setCurrentIndex(0)
    setDraft('')
    setResults([])
    setTranscript([
      {
        id: 'intro',
        role: 'interviewer',
        content:
          '你好，我是本轮 AI 应用开发工程师面试官。我们会围绕 AI 应用工程、RAG、Agent、评估和上线展开。',
      },
      {
        id: interviewQuestions[0].id,
        role: 'interviewer',
        content: interviewQuestions[0].prompt,
      },
    ])
  }

  function resetInterview() {
    setPhase('role')
    setCurrentIndex(0)
    setDraft('')
    setTranscript([])
    setResults([])
  }

  function submitAnswer() {
    const answer = draft.trim()
    if (!answer) {
      return
    }

    const result = scoreAnswer(currentQuestion, answer)
    const nextResults = [...results, result]
    const isLastQuestion = currentIndex === interviewQuestions.length - 1
    const nextEntries: ChatEntry[] = [
      ...transcript,
      {
        id: `${currentQuestion.id}-answer`,
        role: 'candidate',
        content: answer,
      },
      {
        id: `${currentQuestion.id}-feedback`,
        role: 'feedback',
        score: result.score,
        content: `${result.feedback} 命中：${
          result.matched.length > 0 ? result.matched.join('、') : '暂无明显命中'
        }。${
          result.missing.length > 0 ? `可补充：${result.missing.slice(0, 2).join('、')}。` : ''
        }`,
      },
    ]

    if (isLastQuestion) {
      const finalReport = summarize(nextResults)
      nextEntries.push({
        id: 'final',
        role: 'interviewer',
        content: `本轮面试结束。你的综合得分是 ${finalReport.score} 分，${
          finalReport.score >= 80 ? '达到通过线。' : '还没有达到通过线。'
        }`,
      })
      setPhase('result')
    } else {
      const nextQuestion = interviewQuestions[currentIndex + 1]
      nextEntries.push({
        id: nextQuestion.id,
        role: 'interviewer',
        content: nextQuestion.prompt,
      })
      setCurrentIndex((index) => index + 1)
    }

    setResults(nextResults)
    setTranscript(nextEntries)
    setDraft('')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          <BrainCircuit size={24} />
        </div>
        <div>
          <p className="eyebrow">Learning Agent</p>
          <h1>AI 应用工程面试舱</h1>
        </div>
        <div className="topbar-status">
          <Gauge size={18} />
          <span>通过线 80</span>
        </div>
      </header>

      {phase === 'role' && (
        <section className="role-layout" aria-label="选择应聘角色">
          <div className="role-copy">
            <div className="section-kicker">
              <BriefcaseBusiness size={18} />
              <span>应聘角色</span>
            </div>
            <h2>AI 应用开发工程师</h2>
            <p>
              当前版本聚焦 AI 应用工程师面试：RAG、Agent 工作流、评估上线、工程排查和方案设计。
            </p>
            <div className="role-stats" aria-label="面试配置">
              <span>{role.rounds} 题</span>
              <span>综合评分</span>
              <span>80 分通过</span>
            </div>
          </div>

          <button className="role-card selected" type="button" onClick={startInterview}>
            <span className="role-card-icon" aria-hidden="true">
              <ClipboardList size={24} />
            </span>
            <span>
              <strong>{role.title}</strong>
              <small>{role.level}</small>
            </span>
            <span className="start-chip">开始</span>
          </button>
        </section>
      )}

      {phase !== 'role' && (
        <section className="workbench" aria-label="面试对话">
          <aside className="side-panel">
            <div
              className="progress-ring"
              style={{ '--progress': `${progress}%` } as CSSProperties}
            >
              <span>{progress}%</span>
            </div>
            <div>
              <p className="eyebrow">当前轮次</p>
              <h2>
                {Math.min(results.length + 1, interviewQuestions.length)} /{' '}
                {interviewQuestions.length}
              </h2>
            </div>
            <div className="competency-list">
              {interviewQuestions.map((question, index) => {
                const result = results.find((item) => item.questionId === question.id)
                const isActive = index === currentIndex && phase === 'interview'
                return (
                  <div
                    className={`competency-item ${isActive ? 'active' : ''} ${
                      result ? 'done' : ''
                    }`}
                    key={question.id}
                  >
                    <span>{question.competency}</span>
                    <strong>{result ? `${result.score}` : index + 1}</strong>
                  </div>
                )
              })}
            </div>
          </aside>

          <div className="interview-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">面试官</p>
                <h2>{role.title}</h2>
              </div>
              <button className="ghost-button" type="button" onClick={resetInterview}>
                <RotateCcw size={18} />
                重来
              </button>
            </div>

            <div className="chat-stream" aria-live="polite">
              {transcript.map((entry) => (
                <article className={`message ${entry.role}`} key={entry.id}>
                  <div className="message-meta">
                    <span>
                      {entry.role === 'candidate'
                        ? '候选人'
                        : entry.role === 'feedback'
                          ? '即时评分'
                          : '面试官'}
                    </span>
                    {typeof entry.score === 'number' && <strong>{entry.score} 分</strong>}
                  </div>
                  <p>{entry.content}</p>
                </article>
              ))}
            </div>

            {phase === 'interview' && (
              <div className="answer-box">
                <div className="answer-context">
                  <ShieldCheck size={18} />
                  <span>{currentQuestion.idealSignal}</span>
                </div>
                <textarea
                  aria-label="输入面试回答"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="请输入你的回答..."
                />
                <div className="answer-actions">
                  <span>{draft.trim().length} 字</span>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={submitAnswer}
                    disabled={!draft.trim()}
                    title="提交回答"
                  >
                    <Send size={18} />
                    提交回答
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {phase === 'result' && (
        <section className="result-band" aria-label="面试结果">
          <div className={`result-score ${report.score >= 80 ? 'passed' : 'failed'}`}>
            {report.score >= 80 ? <CheckCircle2 size={34} /> : <XCircle size={34} />}
            <div>
              <p>综合得分</p>
              <strong>{report.score}</strong>
            </div>
            <span>{report.score >= 80 ? '通过' : '未通过'}</span>
          </div>

          <div className="result-grid">
            <div className="result-block">
              <Trophy size={20} />
              <h3>优势能力</h3>
              <p>
                {report.strengths.length > 0
                  ? report.strengths.join('、')
                  : '暂未形成稳定优势，需要提升回答完整度。'}
              </p>
            </div>
            <div className="result-block">
              <ClipboardList size={20} />
              <h3>补强方向</h3>
              <p>
                {report.gaps.length > 0
                  ? report.gaps.join('、')
                  : '继续补充真实项目案例、指标和上线后的监控闭环。'}
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
