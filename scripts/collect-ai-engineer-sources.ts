import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import * as cheerio from 'cheerio'
import { ROLE_ID } from '@/lib/types'

type SourceConfig = {
  id: string
  title: string
  url: string
  publisher: string
  licenseUsage: string
  competency: string
  topics: Array<{
    title: string
    competency: string
    content: string
    rubric: string[]
    tags: string[]
  }>
}

type CollectedChunk = {
  id: string
  roleId: string
  source: string
  sourceUrl: string
  sourceTitle: string
  publisher: string
  licenseUsage: string
  title: string
  competency: string
  content: string
  rubric: string[]
  tags: string[]
  textStats: {
    extractedTitle: string
    textHash: string
    charCount: number
    wordLikeCount: number
    sourceEvidence: string
  }
  collectedAt: string
}

const OUTPUT_DIR = path.join(process.cwd(), 'content/interview-bank/ai-application-engineer')
const JSONL_PATH = path.join(OUTPUT_DIR, 'collected-knowledge.jsonl')
const MARKDOWN_PATH = path.join(OUTPUT_DIR, 'collected-knowledge.md')

const sources: SourceConfig[] = [
  {
    id: 'openai_prompt_engineering',
    title: 'OpenAI Prompt Engineering Guide',
    url: 'https://platform.openai.com/docs/guides/prompt-engineering',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    competency: 'Prompt 工程',
    topics: [
      {
        title: 'Prompt 指令设计与评估',
        competency: 'Prompt 工程',
        content:
          '高质量 AI 应用需要把任务目标、角色边界、上下文、输出格式和失败处理写成可测试的 prompt 规范。面试中应重点考察候选人是否能把 prompt 改动纳入版本管理、评估集、回归测试和线上指标，而不是只凭主观感觉调文案。',
        rubric: ['能说明指令层级和上下文边界', '能结合 schema 和示例稳定输出', '能用评估集验证 prompt 改动', '能处理 prompt injection 和上下文污染'],
        tags: ['prompt', 'evaluation', 'structured-output'],
      },
    ],
  },
  {
    id: 'openai_embeddings',
    title: 'OpenAI Embeddings Guide',
    url: 'https://platform.openai.com/docs/guides/embeddings',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    competency: '向量检索',
    topics: [
      {
        title: 'Embedding 与语义检索能力',
        competency: '向量检索',
        content:
          'Embedding 数据适合语义搜索、聚类、推荐和相似度比较。面试中应追问候选人如何选择 embedding 模型、维度、相似度算法、索引和评估方式，以及为什么切换 embedding 模型时需要重新生成文档向量和查询向量。',
        rubric: ['能解释 embedding 的语义空间和适用场景', '能说明维度、相似度和索引取舍', '能处理跨模型迁移和重建索引', '能用 recall@k、MRR、延迟评估检索效果'],
        tags: ['embedding', 'semantic-search', 'vector-db'],
      },
    ],
  },
  {
    id: 'openai_evals',
    title: 'OpenAI Evals Guide',
    url: 'https://platform.openai.com/docs/guides/evals',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    competency: 'RAG 评估',
    topics: [
      {
        title: 'LLM 应用评估与回归测试',
        competency: 'RAG 评估',
        content:
          'AI 应用上线前后都需要评估闭环。面试题应考察候选人如何构建 golden set、bad case、自动化 eval、人工 review、LLM judge 校准和 regression test，并能区分检索质量、生成质量、安全质量和业务指标。',
        rubric: ['能构建 golden set 和 bad case 集', '能区分检索、生成、安全和业务指标', '能说明 LLM judge 偏差和校准', '能把线上反馈回流到回归评估'],
        tags: ['evals', 'llm-judge', 'regression'],
      },
    ],
  },
  {
    id: 'langgraph_overview',
    title: 'LangGraph Overview',
    url: 'https://docs.langchain.com/oss/javascript/langgraph/overview',
    publisher: 'LangChain',
    licenseUsage: 'Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    competency: 'Agent 工具调用',
    topics: [
      {
        title: 'Stateful Agent 工作流',
        competency: 'Agent 工具调用',
        content:
          '企业级面试官 Agent 需要显式状态和可恢复流程。题目应考察候选人是否能设计 state、node、edge、conditional routing、checkpoint、message history、tool result、human-in-the-loop 和终止条件，而不是只写一个长 prompt。',
        rubric: ['能设计状态图和流程节点', '能处理条件路由和中断恢复', '能保存题目计划、消息和评分', '能用 trace 调试多轮 Agent'],
        tags: ['langgraph', 'agent', 'workflow'],
      },
    ],
  },
  {
    id: 'langchain_rag',
    title: 'LangChain RAG Documentation',
    url: 'https://docs.langchain.com/oss/javascript/langchain/rag',
    publisher: 'LangChain',
    licenseUsage: 'Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    competency: 'RAG 数据治理',
    topics: [
      {
        title: 'RAG 应用链路与组件',
        competency: 'RAG 数据治理',
        content:
          'RAG 应用通常包含数据加载、文档切分、向量化、检索、上下文组织和生成。面试题应要求候选人说明 ingestion、retrieval、generation 和 evaluation 的边界，以及如何把 metadata、权限和更新策略纳入工程设计。',
        rubric: ['能拆分 RAG ingestion、retrieval 和 generation', '能说明文档切分和 metadata', '能结合权限和更新策略', '能评估检索和生成质量'],
        tags: ['rag', 'ingestion', 'retrieval'],
      },
    ],
  },
  {
    id: 'anthropic_effective_agents',
    title: 'Anthropic Building Effective Agents',
    url: 'https://www.anthropic.com/engineering/building-effective-agents',
    publisher: 'Anthropic',
    licenseUsage: 'Engineering article; store derived notes and short evidence snippets only. Link to source for attribution.',
    competency: 'Agent 工具调用',
    topics: [
      {
        title: 'Agent 简单优先与可控编排',
        competency: 'Agent 工具调用',
        content:
          'Agent 不应为了复杂而复杂。面试中应考察候选人能否先用简单 workflow 解决问题，再在需要动态决策、工具调用和多步骤恢复时引入更复杂 Agent；同时要能说明工具边界、人工确认、失败恢复和观测。',
        rubric: ['能判断 workflow 和 autonomous agent 的边界', '能解释工具调用适用场景', '能设计失败恢复和人工确认', '能保持流程可解释和可观测'],
        tags: ['agent', 'workflow', 'tool-use'],
      },
    ],
  },
  {
    id: 'microsoft_rag_design',
    title: 'Microsoft Azure RAG solution design and evaluation guide',
    url: 'https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide',
    publisher: 'Microsoft',
    licenseUsage: 'Microsoft Learn content; store derived notes with attribution. Check Microsoft Learn terms for redistribution limits.',
    competency: 'RAG 评估',
    topics: [
      {
        title: '企业级 RAG 设计与评估',
        competency: 'RAG 评估',
        content:
          '企业级 RAG 需要从数据质量、检索质量、生成质量、延迟、成本、安全和用户反馈多个维度评估。面试题应要求候选人设计评估集、质量指标、上线门槛、灰度、回滚和持续改进流程。',
        rubric: ['能设计端到端 RAG 评估体系', '能区分质量、成本、延迟和安全指标', '能设计上线门槛和回滚', '能持续吸收线上反馈'],
        tags: ['rag-evaluation', 'enterprise', 'azure'],
      },
    ],
  },
  {
    id: 'owasp_llm_top_10',
    title: 'OWASP Top 10 for LLM and Gen AI Apps',
    url: 'https://genai.owasp.org/llm-top-10/',
    publisher: 'OWASP',
    licenseUsage: 'OWASP community resource; store derived notes and attribution. Verify current OWASP license before redistribution.',
    competency: 'AI 安全',
    topics: [
      {
        title: 'LLM 应用安全风险',
        competency: 'AI 安全',
        content:
          'AI 应用要防范 prompt injection、敏感信息泄露、供应链风险、越权工具调用和不安全输出。面试中应重点追问候选人如何把用户输入、检索文档和工具结果视为不可信数据，并通过权限、沙箱、审计、红队和拒答策略降低风险。',
        rubric: ['能识别直接和间接 prompt injection', '能设计工具权限和人工确认', '能保护敏感信息和用户数据', '能建立红队、安全日志和修复闭环'],
        tags: ['owasp', 'llm-security', 'prompt-injection'],
      },
    ],
  },
  {
    id: 'developer_experience_streaming',
    title: 'MDN Server-sent events',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events',
    publisher: 'MDN Web Docs',
    licenseUsage: 'MDN content is generally CC-BY-SA; store derived notes with attribution and verify current page license.',
    competency: 'AI 前端工程',
    topics: [
      {
        title: 'AI 前端流式协议',
        competency: 'AI 前端工程',
        content:
          'AI 前端常用 streaming 降低首 token 等待并提升可感知进度。面试题应要求候选人比较 SSE、NDJSON 和 WebSocket，说明取消、重试、部分结果、错误恢复、幂等提交和 session 状态一致性。',
        rubric: ['能比较 SSE、NDJSON 和 WebSocket', '能处理取消、重试和网络中断', '能展示 partial response 和最终状态', '能保证前后端 session 一致'],
        tags: ['sse', 'streaming', 'frontend'],
      },
    ],
  },
]

await mkdir(OUTPUT_DIR, { recursive: true })

const collectedAt = new Date().toISOString()
const chunks: CollectedChunk[] = []

for (const source of sources) {
  const fetched = await fetchSourceText(source.url)
  for (const [index, topic] of source.topics.entries()) {
    chunks.push({
      id: stableId(`${source.id}:${index}:${topic.title}`),
      roleId: ROLE_ID,
      source: source.id,
      sourceUrl: source.url,
      sourceTitle: source.title,
      publisher: source.publisher,
      licenseUsage: source.licenseUsage,
      title: topic.title,
      competency: topic.competency,
      content: topic.content,
      rubric: topic.rubric,
      tags: topic.tags,
      textStats: {
        extractedTitle: fetched.title,
        textHash: fetched.hash,
        charCount: fetched.charCount,
        wordLikeCount: fetched.wordLikeCount,
        sourceEvidence: excerptEvidence(fetched.text, topic.tags),
      },
      collectedAt,
    })
  }
}

await writeFile(JSONL_PATH, `${chunks.map((chunk) => JSON.stringify(chunk)).join('\n')}\n`, 'utf8')
await writeFile(MARKDOWN_PATH, renderMarkdown(chunks), 'utf8')

console.log(`Collected ${chunks.length} derived knowledge chunks from ${sources.length} sources.`)
console.log(`Wrote ${path.relative(process.cwd(), JSONL_PATH)}`)
console.log(`Wrote ${path.relative(process.cwd(), MARKDOWN_PATH)}`)

async function fetchSourceText(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'learning-agent-research/1.0 (+https://github.com/Constantine1916/learning-agent)',
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  $('script, style, nav, header, footer, aside, noscript, svg').remove()
  const title = normalizeWhitespace($('title').first().text() || $('h1').first().text() || url)
  const text = normalizeWhitespace(
    $('main').text() ||
      $('article').text() ||
      $('[role="main"]').text() ||
      $('body').text(),
  )

  return {
    title,
    text,
    hash: createHash('sha256').update(text).digest('hex'),
    charCount: text.length,
    wordLikeCount: text.match(/[\p{L}\p{N}_-]+/gu)?.length ?? 0,
  }
}

function excerptEvidence(text: string, tags: string[]) {
  const sentences = text
    .split(/(?<=[。！？.!?])\s+/u)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length > 20)
  const matched =
    sentences.find((sentence) => tags.some((tag) => sentence.toLowerCase().includes(tag.toLowerCase()))) ??
    sentences[0] ??
    ''
  const shortSnippet = (matched.match(/[\p{L}\p{N}_-]+/gu) ?? []).slice(0, 18).join(' ')
  return shortSnippet.slice(0, 160)
}

function renderMarkdown(chunksToRender: CollectedChunk[]) {
  return [
    '# AI 应用开发工程师采集知识块',
    '',
    '本文件由 `npm run collect:knowledge` 生成。内容为基于官方/高质量来源的整理改写知识块，并保留 source、url、title、competency、license/usage 和短证据片段。为避免版权风险，不保存整页原文。',
    '',
    ...chunksToRender.flatMap((chunk) => [
      `## ${chunk.title}`,
      `Competency: ${chunk.competency}`,
      `Source: ${chunk.sourceTitle}`,
      `URL: ${chunk.sourceUrl}`,
      `License/Usage: ${chunk.licenseUsage}`,
      `Evidence: ${chunk.textStats.sourceEvidence}`,
      '',
      chunk.content,
      '',
      ...chunk.rubric.map((item) => `- ${item}`),
      '',
    ]),
  ].join('\n')
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function stableId(value: string) {
  return createHash('sha1').update(value).digest('hex').slice(0, 12)
}
