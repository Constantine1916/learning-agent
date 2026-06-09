import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import * as cheerio from 'cheerio'
import { ROLE_ID } from '@/lib/types'

type Reliability = 'official' | 'vendor-docs' | 'engineering-article' | 'community-reference' | 'standard'

type SourceConfig = {
  id: string
  title: string
  url: string
  publisher: string
  licenseUsage: string
  reliability: Reliability
  sourceKind: 'api-doc' | 'framework-doc' | 'vector-db-doc' | 'engineering-guide' | 'security-standard' | 'web-platform-doc' | 'interview-reference'
  primaryCompetency: string
  topics: TopicConfig[]
}

type TopicConfig = {
  title: string
  competency: string
  content: string
  rubric: string[]
  tags: string[]
  classification: {
    stage: 'ingestion' | 'retrieval' | 'generation' | 'evaluation' | 'agent' | 'safety' | 'frontend' | 'production' | 'system-design'
    depth: 'foundation' | 'production' | 'senior'
    interviewUse: 'core-question' | 'follow-up' | 'rubric-evidence' | 'calibration'
  }
}

type FetchedSource = {
  ok: boolean
  status?: number
  finalUrl: string
  title: string
  text: string
  error?: string
  textHash: string
  rawCharCount: number
  cleanedCharCount: number
  wordLikeCount: number
}

type CollectedChunk = {
  id: string
  roleId: string
  source: string
  sourceUrl: string
  sourceFinalUrl: string
  sourceTitle: string
  publisher: string
  licenseUsage: string
  reliability: Reliability
  sourceKind: SourceConfig['sourceKind']
  title: string
  competency: string
  content: string
  rubric: string[]
  tags: string[]
  classification: TopicConfig['classification']
  quality: {
    score: number
    reasons: string[]
  }
  textStats: {
    extractedTitle: string
    textHash: string
    rawCharCount: number
    cleanedCharCount: number
    wordLikeCount: number
    sourceEvidence: string
    fetchOk: boolean
    fetchStatus?: number
    fetchError?: string
  }
  cleaning: {
    parser: 'cheerio'
    removedSelectors: string[]
    normalizedWhitespace: boolean
    storedRawPageText: false
    copyrightPolicy: string
  }
  collectedAt: string
}

const OUTPUT_DIR = path.join(process.cwd(), 'content/interview-bank/ai-application-engineer')
const JSONL_PATH = path.join(OUTPUT_DIR, 'collected-knowledge.jsonl')
const MARKDOWN_PATH = path.join(OUTPUT_DIR, 'collected-knowledge.md')
const REPORT_PATH = path.join(OUTPUT_DIR, 'collected-knowledge-report.json')

const REMOVED_SELECTORS = [
  'script',
  'style',
  'nav',
  'header',
  'footer',
  'aside',
  'noscript',
  'svg',
  '[aria-hidden="true"]',
  '.cookie',
  '.cookies',
  '.banner',
]

const sources: SourceConfig[] = [
  {
    id: 'openai_prompt_engineering',
    title: 'OpenAI Prompt Engineering Guide',
    url: 'https://platform.openai.com/docs/guides/prompt-engineering',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'api-doc',
    primaryCompetency: 'Prompt 工程',
    topics: [
      {
        title: 'Prompt 指令设计与评估',
        competency: 'Prompt 工程',
        content:
          '高质量 AI 应用需要把任务目标、角色边界、上下文、输出格式和失败处理写成可测试的 prompt 规范。面试中应重点考察候选人是否能把 prompt 改动纳入版本管理、评估集、回归测试和线上指标，而不是只凭主观感觉调文案。',
        rubric: ['能说明指令层级和上下文边界', '能结合 schema 和示例稳定输出', '能用评估集验证 prompt 改动', '能处理 prompt injection 和上下文污染'],
        tags: ['prompt', 'context-engineering', 'evaluation', 'structured-output'],
        classification: { stage: 'generation', depth: 'production', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'openai_structured_outputs',
    title: 'OpenAI Structured Outputs Guide',
    url: 'https://platform.openai.com/docs/guides/structured-outputs',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'api-doc',
    primaryCompetency: '结构化输出',
    topics: [
      {
        title: '严格 Schema 输出与后端校验',
        competency: '结构化输出',
        content:
          '企业 AI 应用不能把自然语言直接当业务数据消费。面试应要求候选人解释 schema-first 设计、字段约束、枚举、范围、嵌套对象、解析失败重试、越界修复和后端类型校验，并能说明结构化输出如何服务简历解析、评分 JSON、工具参数和最终报告。',
        rubric: ['能设计严格 JSON schema 和必填字段', '能处理脏 JSON、缺字段和越界值', '能说明模型输出与后端校验的责任边界', '能把结构化输出用于评分和工具调用'],
        tags: ['structured-output', 'json-schema', 'validation', 'zod', 'llm-judge'],
        classification: { stage: 'generation', depth: 'production', interviewUse: 'core-question' },
      },
      {
        title: '结构化输出的失败恢复策略',
        competency: '结构化输出',
        content:
          '结构化输出上线后常见问题包括模型输出 markdown、字段缺失、类型错误、分数越界和枚举漂移。优秀候选人应能设计可恢复错误：保留原始响应、执行 schema 校验、给模型最小修复提示、限制重试次数、记录失败样本，并在关键流程触发人工复核。',
        rubric: ['能列出结构化输出常见失败模式', '能设计校验、修复、重试和人工复核', '能把失败样本沉淀到 regression eval', '能避免业务代码消费未校验结果'],
        tags: ['structured-output', 'error-recovery', 'regression-eval', 'schema-repair'],
        classification: { stage: 'production', depth: 'senior', interviewUse: 'follow-up' },
      },
    ],
  },
  {
    id: 'openai_function_calling',
    title: 'OpenAI Function Calling Guide',
    url: 'https://platform.openai.com/docs/guides/function-calling',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'api-doc',
    primaryCompetency: 'Agent 工具调用',
    topics: [
      {
        title: '工具调用参数协议与权限边界',
        competency: 'Agent 工具调用',
        content:
          'Function calling 的核心不是让模型自由执行代码，而是把工具能力暴露成严格参数协议。面试应追问候选人如何定义工具 schema、校验参数、注入用户/租户权限、处理工具错误、保证幂等、记录审计，并在高风险动作前要求人工确认。',
        rubric: ['能设计 tool schema 和参数校验', '能把权限、租户和用户上下文带入工具层', '能处理超时、重试、幂等和审计', '能识别高风险工具需要人工确认'],
        tags: ['function-calling', 'tool-schema', 'permissions', 'idempotency', 'audit'],
        classification: { stage: 'agent', depth: 'production', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'openai_tools',
    title: 'OpenAI Tools Guide',
    url: 'https://platform.openai.com/docs/guides/tools',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'api-doc',
    primaryCompetency: 'Agent 工具调用',
    topics: [
      {
        title: '内置工具与业务工具的选择边界',
        competency: 'Agent 工具调用',
        content:
          '面试官应区分模型自带工具、平台工具和业务自定义工具。候选人需要能判断何时使用检索、代码执行、文件解析、浏览器或业务 API，并说明工具结果如何进入上下文、如何标注来源、如何隔离不可信结果，以及如何限制工具调用成本和循环。',
        rubric: ['能判断不同工具适用场景', '能说明工具结果进入上下文的边界', '能设计工具调用成本和循环限制', '能结合安全策略隔离不可信工具输出'],
        tags: ['tools', 'tool-use', 'agent-boundaries', 'cost-control'],
        classification: { stage: 'agent', depth: 'production', interviewUse: 'follow-up' },
      },
    ],
  },
  {
    id: 'openai_embeddings',
    title: 'OpenAI Embeddings Guide',
    url: 'https://platform.openai.com/docs/guides/embeddings',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'api-doc',
    primaryCompetency: '向量检索',
    topics: [
      {
        title: 'Embedding 与语义检索能力',
        competency: '向量检索',
        content:
          'Embedding 数据适合语义搜索、聚类、推荐和相似度比较。面试中应追问候选人如何选择 embedding 模型、维度、相似度算法、索引和评估方式，以及为什么切换 embedding 模型时需要重新生成文档向量和查询向量。',
        rubric: ['能解释 embedding 的语义空间和适用场景', '能说明维度、相似度和索引取舍', '能处理跨模型迁移和重建索引', '能用 recall@k、MRR、延迟评估检索效果'],
        tags: ['embedding', 'semantic-search', 'vector-db', 'recall-at-k'],
        classification: { stage: 'retrieval', depth: 'foundation', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'openai_evals',
    title: 'OpenAI Evals Guide',
    url: 'https://platform.openai.com/docs/guides/evals',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'api-doc',
    primaryCompetency: 'RAG 评估',
    topics: [
      {
        title: 'LLM 应用评估与回归测试',
        competency: 'RAG 评估',
        content:
          'AI 应用上线前后都需要评估闭环。面试题应考察候选人如何构建 golden set、bad case、自动化 eval、人工 review、LLM judge 校准和 regression test，并能区分检索质量、生成质量、安全质量和业务指标。',
        rubric: ['能构建 golden set 和 bad case 集', '能区分检索、生成、安全和业务指标', '能说明 LLM judge 偏差和校准', '能把线上反馈回流到回归评估'],
        tags: ['evals', 'llm-judge', 'golden-set', 'regression'],
        classification: { stage: 'evaluation', depth: 'production', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'openai_production_best_practices',
    title: 'OpenAI Production Best Practices',
    url: 'https://platform.openai.com/docs/guides/production-best-practices',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'api-doc',
    primaryCompetency: '生产排查',
    topics: [
      {
        title: '生产级 LLM 调用可靠性',
        competency: '生产排查',
        content:
          '生产级 LLM 应用需要把超时、重试、限流、错误分类、请求追踪、成本控制和容量规划当作核心工程问题。面试应让候选人拆解 P95 延迟、token 消耗、模型失败率、供应商限流和 fallback，并要求说明如何做灰度、回滚和 regression eval。',
        rubric: ['能拆解延迟、成本、限流和失败率', '能设计 timeout、retry、fallback 和熔断', '能记录 request id、model version、token 和错误', '能用灰度与回归评估验证改动'],
        tags: ['production', 'timeout', 'retry', 'rate-limit', 'cost', 'observability'],
        classification: { stage: 'production', depth: 'senior', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'openai_safety_best_practices',
    title: 'OpenAI Safety Best Practices',
    url: 'https://platform.openai.com/docs/guides/safety-best-practices',
    publisher: 'OpenAI',
    licenseUsage: 'Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'api-doc',
    primaryCompetency: 'AI 安全',
    topics: [
      {
        title: 'AI 应用安全评估与缓解',
        competency: 'AI 安全',
        content:
          '安全不是只在 system prompt 写一句规则。面试应考察候选人是否能结合输入校验、输出过滤、敏感数据最小化、安全 eval、红队样本、人工复核和事故回放来治理 AI 风险，尤其是面试系统中的简历、评分和个人信息。',
        rubric: ['能识别输入、输出、检索、工具和隐私风险', '能设计安全 eval、红队和人工复核', '能限制敏感信息进入上下文', '能记录并复盘安全事件'],
        tags: ['safety', 'red-team', 'privacy', 'moderation', 'security-eval'],
        classification: { stage: 'safety', depth: 'production', interviewUse: 'rubric-evidence' },
      },
    ],
  },
  {
    id: 'langgraph_overview',
    title: 'LangGraph Overview',
    url: 'https://docs.langchain.com/oss/javascript/langgraph/overview',
    publisher: 'LangChain',
    licenseUsage: 'Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'framework-doc',
    primaryCompetency: 'Agent 工具调用',
    topics: [
      {
        title: 'Stateful Agent 工作流',
        competency: 'Agent 工具调用',
        content:
          '企业级面试官 Agent 需要显式状态和可恢复流程。题目应考察候选人是否能设计 state、node、edge、conditional routing、checkpoint、message history、tool result、human-in-the-loop 和终止条件，而不是只写一个长 prompt。',
        rubric: ['能设计状态图和流程节点', '能处理条件路由和中断恢复', '能保存题目计划、消息和评分', '能用 trace 调试多轮 Agent'],
        tags: ['langgraph', 'agent', 'workflow', 'checkpoint', 'state-machine'],
        classification: { stage: 'agent', depth: 'senior', interviewUse: 'core-question' },
      },
      {
        title: '面试流程的条件路由与中断恢复',
        competency: '对话状态管理',
        content:
          '面试官 Agent 的流程不是线性脚本。候选人回答质量低时要追问，能力项覆盖不足时要换题，候选人中断后要恢复 session，最终报告生成失败时要可重试。LangGraph 类工作流适合把这些条件显式写成状态转移，并把 checkpoint 用作审计和恢复基础。',
        rubric: ['能把低分追问、覆盖补齐和结束条件写成路由', '能说明 checkpoint 与 session state 的关系', '能处理节点失败和报告重试', '能保证重复提交不会破坏状态'],
        tags: ['langgraph', 'conditional-routing', 'checkpoint', 'session-state'],
        classification: { stage: 'agent', depth: 'senior', interviewUse: 'follow-up' },
      },
    ],
  },
  {
    id: 'langchain_rag',
    title: 'LangChain RAG Documentation',
    url: 'https://docs.langchain.com/oss/javascript/langchain/rag',
    publisher: 'LangChain',
    licenseUsage: 'Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'framework-doc',
    primaryCompetency: 'RAG 数据治理',
    topics: [
      {
        title: 'RAG 应用链路与组件',
        competency: 'RAG 数据治理',
        content:
          'RAG 应用通常包含数据加载、文档切分、向量化、检索、上下文组织和生成。面试题应要求候选人说明 ingestion、retrieval、generation 和 evaluation 的边界，以及如何把 metadata、权限和更新策略纳入工程设计。',
        rubric: ['能拆分 RAG ingestion、retrieval 和 generation', '能说明文档切分和 metadata', '能结合权限和更新策略', '能评估检索和生成质量'],
        tags: ['rag', 'ingestion', 'retrieval', 'metadata', 'generation'],
        classification: { stage: 'ingestion', depth: 'foundation', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'langsmith_observability',
    title: 'LangSmith Observability',
    url: 'https://docs.langchain.com/langsmith/observability',
    publisher: 'LangChain',
    licenseUsage: 'Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'framework-doc',
    primaryCompetency: '生产排查',
    topics: [
      {
        title: 'Agent Trace 与线上排障',
        competency: '生产排查',
        content:
          '多轮 Agent 出错时，需要能回放每个步骤：用户输入、检索 query、召回 chunk、rerank 分数、prompt、模型响应、工具调用、错误、token 和延迟。面试应要求候选人说明 trace 字段、span 粒度、采样策略、隐私脱敏和如何把 bad case 加入评估集。',
        rubric: ['能列出 RAG/Agent trace 关键字段', '能按检索、生成、工具和前端分段排查', '能处理隐私脱敏和采样', '能把线上坏例回流到 eval'],
        tags: ['observability', 'trace', 'langsmith', 'bad-case', 'latency'],
        classification: { stage: 'production', depth: 'senior', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'llamaindex_production_rag',
    title: 'LlamaIndex Production RAG',
    url: 'https://docs.llamaindex.ai/en/stable/optimizing/production_rag/',
    publisher: 'LlamaIndex',
    licenseUsage: 'Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'vendor-docs',
    sourceKind: 'engineering-guide',
    primaryCompetency: 'RAG 数据治理',
    topics: [
      {
        title: '生产级 RAG 数据摄取与调优',
        competency: 'RAG 数据治理',
        content:
          '生产级 RAG 的关键不是一次性上传文档，而是持续管理解析、清洗、chunk size、overlap、标题层级、metadata、增量更新、删除同步和质量验证。面试应要求候选人说明如何通过实验比较不同切分策略对召回和回答质量的影响。',
        rubric: ['能说明解析、清洗、chunking 和 metadata 的关系', '能处理增量更新、删除和版本', '能用实验比较 chunk size、overlap 和标题保留', '能把数据质量问题回流到 ingestion'],
        tags: ['production-rag', 'chunking', 'metadata', 'incremental-indexing', 'data-quality'],
        classification: { stage: 'ingestion', depth: 'senior', interviewUse: 'core-question' },
      },
      {
        title: '面试题库采集清洗与标签治理',
        competency: 'RAG 数据治理',
        content:
          '面试题库的 RAG 数据不应该是“网上搜题后直接入库”。更可靠的流程是先定义岗位能力模型，再选择可信来源，抓取页面后去噪清洗，按主题和语义切分，给每个 chunk 标注 role、competency、difficulty、source、publisher、license、tags、qualityScore、collectedAt 和审核状态，最后用召回评测确认这些标签确实提升选题、追问和评分依据。',
        rubric: ['能先定义岗位能力模型再采集', '能说明清洗、切分、标签和审核字段', '能区分结构化题库与向量知识块', '能用召回评测验证入库质量'],
        tags: ['interview-bank', 'collection', 'cleaning', 'chunking', 'tags', 'metadata', 'quality-score'],
        classification: { stage: 'ingestion', depth: 'senior', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'llamaindex_evaluating',
    title: 'LlamaIndex Evaluating Guide',
    url: 'https://docs.llamaindex.ai/en/stable/module_guides/evaluating/',
    publisher: 'LlamaIndex',
    licenseUsage: 'Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'vendor-docs',
    sourceKind: 'engineering-guide',
    primaryCompetency: 'RAG 评估',
    topics: [
      {
        title: '检索质量与回答质量分层评估',
        competency: 'RAG 评估',
        content:
          'RAG 评估要拆成检索、上下文和答案三层。检索层看 recall、MRR、NDCG 和 source 覆盖；上下文层看噪声、冲突和权限；答案层看 faithfulness、relevance、引用准确和拒答。面试应追问候选人如何用人工样本和 LLM judge 互相校准。',
        rubric: ['能区分 retrieval eval、context eval 和 answer eval', '能设计 golden set 与 bad case', '能说明 LLM judge 需要人工校准', '能把评估接入 CI 或发布门槛'],
        tags: ['rag-evaluation', 'retrieval-eval', 'faithfulness', 'llm-judge', 'golden-set'],
        classification: { stage: 'evaluation', depth: 'senior', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'pinecone_rerankers',
    title: 'Pinecone Rerankers for RAG',
    url: 'https://www.pinecone.io/learn/series/rag/rerankers/',
    publisher: 'Pinecone',
    licenseUsage: 'Engineering article; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'engineering-article',
    sourceKind: 'engineering-guide',
    primaryCompetency: '向量检索',
    topics: [
      {
        title: '两阶段召回与 Rerank',
        competency: '向量检索',
        content:
          '向量 topK 召回不等于最终上下文质量。企业级 RAG 常先用向量或混合检索扩大候选集，再用 cross-encoder 或 reranker 精排，最后做去重和上下文压缩。面试应要求候选人说明 rerank 的质量收益、延迟成本和何时不值得引入。',
        rubric: ['能解释召回和精排的职责差异', '能说明 rerank 对质量、延迟和成本的影响', '能设计 topK、rerankK、去重和压缩策略', '能用评估数据判断是否上线 rerank'],
        tags: ['rerank', 'two-stage-retrieval', 'cross-encoder', 'context-compression'],
        classification: { stage: 'retrieval', depth: 'senior', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'azure_hybrid_search',
    title: 'Azure AI Search Hybrid Search Overview',
    url: 'https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview',
    publisher: 'Microsoft',
    licenseUsage: 'Microsoft Learn content; store derived notes with attribution. Check Microsoft Learn terms for redistribution limits.',
    reliability: 'official',
    sourceKind: 'engineering-guide',
    primaryCompetency: '向量检索',
    topics: [
      {
        title: 'BM25 与向量混合检索',
        competency: '向量检索',
        content:
          '混合检索适合同时处理关键词精确匹配和语义相似。面试应让候选人比较 BM25、dense vector、sparse vector、metadata filter 和 fusion 策略，说明为什么企业知识库不能只依赖向量相似度，以及如何评估 hybrid search 的召回收益。',
        rubric: ['能比较关键词、向量和混合检索', '能说明 metadata filter 与权限过滤', '能解释 fusion、权重和 rerank', '能用 recall@k 和坏例分析验证收益'],
        tags: ['hybrid-search', 'bm25', 'dense-vector', 'metadata-filter', 'fusion'],
        classification: { stage: 'retrieval', depth: 'production', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'azure_vector_search',
    title: 'Azure AI Search Vector Search Overview',
    url: 'https://learn.microsoft.com/en-us/azure/search/vector-search-overview',
    publisher: 'Microsoft',
    licenseUsage: 'Microsoft Learn content; store derived notes with attribution. Check Microsoft Learn terms for redistribution limits.',
    reliability: 'official',
    sourceKind: 'engineering-guide',
    primaryCompetency: '向量检索',
    topics: [
      {
        title: '向量索引与过滤设计',
        competency: '向量检索',
        content:
          '向量搜索的工程设计要同时考虑 embedding 模型、向量字段、索引参数、近似检索、过滤字段、权限条件和更新策略。面试应追问候选人如何设计 doc id、chunk id、source id、version、tenant id 和 ACL metadata，避免召回越权或过期内容。',
        rubric: ['能设计向量字段、索引和过滤字段', '能处理 tenant、ACL、version 和 source id', '能说明近似检索与精确评估的差异', '能避免权限污染和过期召回'],
        tags: ['vector-index', 'acl', 'metadata-filter', 'versioning', 'tenant'],
        classification: { stage: 'retrieval', depth: 'production', interviewUse: 'follow-up' },
      },
    ],
  },
  {
    id: 'pgvector_indexing',
    title: 'pgvector README',
    url: 'https://github.com/pgvector/pgvector',
    publisher: 'pgvector',
    licenseUsage: 'Open source project documentation; store derived notes with attribution.',
    reliability: 'community-reference',
    sourceKind: 'vector-db-doc',
    primaryCompetency: '向量检索',
    topics: [
      {
        title: 'pgvector 索引、维度与重建',
        competency: '向量检索',
        content:
          '使用 pgvector 时要理解 vector 维度、相似度操作符、HNSW/IVFFlat 索引、写入成本和重建策略。面试应追问候选人为什么切换 embedding 模型或维度后必须重建列和索引，以及如何在小规模精确搜索和大规模近似搜索之间取舍。',
        rubric: ['能解释 vector 维度和相似度操作符', '能比较 HNSW、IVFFlat 和精确搜索', '能说明模型/维度切换需要重建索引', '能考虑写入、查询、内存和迁移成本'],
        tags: ['pgvector', 'hnsw', 'ivfflat', 'embedding-dimensions', 'index-rebuild'],
        classification: { stage: 'retrieval', depth: 'production', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'qdrant_hybrid_queries',
    title: 'Qdrant Hybrid Queries',
    url: 'https://qdrant.tech/documentation/concepts/hybrid-queries/',
    publisher: 'Qdrant',
    licenseUsage: 'Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'vendor-docs',
    sourceKind: 'vector-db-doc',
    primaryCompetency: '向量检索',
    topics: [
      {
        title: 'Dense/Sparse Hybrid 与多路召回',
        competency: '向量检索',
        content:
          '复杂企业问答经常需要 dense 向量、sparse 向量、关键词和业务过滤多路召回，再通过 fusion、rerank 和去重合成上下文。面试可要求候选人设计多路检索计划，并说明如何防止某一路召回过强、重复 chunk 太多或权限过滤位置错误。',
        rubric: ['能设计 dense、sparse、keyword 和 filter 多路召回', '能说明 fusion 和 rerank 的顺序', '能处理重复 chunk 和上下文预算', '能把权限过滤放在正确阶段'],
        tags: ['hybrid-search', 'sparse-vector', 'dense-vector', 'fusion', 'multi-retrieval'],
        classification: { stage: 'retrieval', depth: 'senior', interviewUse: 'follow-up' },
      },
    ],
  },
  {
    id: 'anthropic_effective_agents',
    title: 'Anthropic Building Effective Agents',
    url: 'https://www.anthropic.com/engineering/building-effective-agents',
    publisher: 'Anthropic',
    licenseUsage: 'Engineering article; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'engineering-article',
    sourceKind: 'engineering-guide',
    primaryCompetency: 'Agent 工具调用',
    topics: [
      {
        title: 'Agent 简单优先与可控编排',
        competency: 'Agent 工具调用',
        content:
          'Agent 不应为了复杂而复杂。面试中应考察候选人能否先用简单 workflow 解决问题，再在需要动态决策、工具调用和多步骤恢复时引入更复杂 Agent；同时要能说明工具边界、人工确认、失败恢复和观测。',
        rubric: ['能判断 workflow 和 autonomous agent 的边界', '能解释工具调用适用场景', '能设计失败恢复和人工确认', '能保持流程可解释和可观测'],
        tags: ['agent', 'workflow', 'tool-use', 'human-in-the-loop', 'observability'],
        classification: { stage: 'agent', depth: 'senior', interviewUse: 'rubric-evidence' },
      },
    ],
  },
  {
    id: 'mcp_tools',
    title: 'Model Context Protocol Tools',
    url: 'https://modelcontextprotocol.io/docs/concepts/tools',
    publisher: 'Model Context Protocol',
    licenseUsage: 'Protocol documentation; store derived notes and short evidence snippets only. Link to source for attribution.',
    reliability: 'official',
    sourceKind: 'framework-doc',
    primaryCompetency: 'Agent 工具调用',
    topics: [
      {
        title: 'MCP 工具协议与能力发现',
        competency: 'Agent 工具调用',
        content:
          'MCP 类协议让 Agent 以统一方式发现和调用外部工具。面试应考察候选人是否理解工具描述、参数 schema、权限授权、用户确认、错误返回和审计日志，并能说明远程工具和本地工具在安全边界、延迟和可观测性上的差异。',
        rubric: ['能说明工具发现、描述和参数 schema', '能设计授权、确认和审计', '能处理远程工具错误、超时和权限', '能评估 MCP 与内置工具/自定义 API 的边界'],
        tags: ['mcp', 'tool-protocol', 'capability-discovery', 'remote-tools', 'authorization'],
        classification: { stage: 'agent', depth: 'senior', interviewUse: 'follow-up' },
      },
    ],
  },
  {
    id: 'microsoft_rag_design',
    title: 'Microsoft Azure RAG solution design and evaluation guide',
    url: 'https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide',
    publisher: 'Microsoft',
    licenseUsage: 'Microsoft Learn content; store derived notes with attribution. Check Microsoft Learn terms for redistribution limits.',
    reliability: 'official',
    sourceKind: 'engineering-guide',
    primaryCompetency: 'RAG 评估',
    topics: [
      {
        title: '企业级 RAG 设计与评估',
        competency: 'RAG 评估',
        content:
          '企业级 RAG 需要从数据质量、检索质量、生成质量、延迟、成本、安全和用户反馈多个维度评估。面试题应要求候选人设计评估集、质量指标、上线门槛、灰度、回滚和持续改进流程。',
        rubric: ['能设计端到端 RAG 评估体系', '能区分质量、成本、延迟和安全指标', '能设计上线门槛和回滚', '能持续吸收线上反馈'],
        tags: ['rag-evaluation', 'enterprise', 'quality-gate', 'rollback', 'feedback-loop'],
        classification: { stage: 'evaluation', depth: 'senior', interviewUse: 'rubric-evidence' },
      },
    ],
  },
  {
    id: 'owasp_llm_top_10',
    title: 'OWASP Top 10 for LLM and Gen AI Apps',
    url: 'https://genai.owasp.org/llm-top-10/',
    publisher: 'OWASP',
    licenseUsage: 'OWASP community resource; store derived notes and attribution. Verify current OWASP license before redistribution.',
    reliability: 'standard',
    sourceKind: 'security-standard',
    primaryCompetency: 'AI 安全',
    topics: [
      {
        title: 'LLM 应用安全风险',
        competency: 'AI 安全',
        content:
          'AI 应用要防范 prompt injection、敏感信息泄露、供应链风险、越权工具调用和不安全输出。面试中应重点追问候选人如何把用户输入、检索文档和工具结果视为不可信数据，并通过权限、沙箱、审计、红队和拒答策略降低风险。',
        rubric: ['能识别直接和间接 prompt injection', '能设计工具权限和人工确认', '能保护敏感信息和用户数据', '能建立红队、安全日志和修复闭环'],
        tags: ['owasp', 'llm-security', 'prompt-injection', 'data-leakage', 'tool-permissions'],
        classification: { stage: 'safety', depth: 'production', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'nist_ai_rmf',
    title: 'NIST AI Risk Management Framework',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    publisher: 'NIST',
    licenseUsage: 'US government/public standards resource; store derived notes with attribution.',
    reliability: 'standard',
    sourceKind: 'security-standard',
    primaryCompetency: 'AI 安全',
    topics: [
      {
        title: 'AI 风险治理与责任闭环',
        competency: 'AI 安全',
        content:
          '企业级 AI 面试系统涉及候选人隐私、公平性、可解释性和人工复核。面试应要求候选人把风险识别、评估、缓解、监控和治理责任落到流程中，例如题库审核、评分偏差检测、数据保留、申诉机制和审计报告。',
        rubric: ['能识别隐私、公平性、透明度和安全风险', '能设计治理角色、审核流程和人工复核', '能说明监控、审计和事故响应', '能把风险治理纳入产品指标和发布门槛'],
        tags: ['ai-risk', 'governance', 'fairness', 'audit', 'human-review'],
        classification: { stage: 'safety', depth: 'senior', interviewUse: 'follow-up' },
      },
    ],
  },
  {
    id: 'developer_experience_streaming',
    title: 'MDN Server-sent events',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events',
    publisher: 'MDN Web Docs',
    licenseUsage: 'MDN content is generally CC-BY-SA; store derived notes with attribution and verify current page license.',
    reliability: 'official',
    sourceKind: 'web-platform-doc',
    primaryCompetency: 'AI 前端工程',
    topics: [
      {
        title: 'AI 前端流式协议',
        competency: 'AI 前端工程',
        content:
          'AI 前端常用 streaming 降低首 token 等待并提升可感知进度。面试题应要求候选人比较 SSE、NDJSON 和 WebSocket，说明取消、重试、部分结果、错误恢复、幂等提交和 session 状态一致性。',
        rubric: ['能比较 SSE、NDJSON 和 WebSocket', '能处理取消、重试和网络中断', '能展示 partial response 和最终状态', '能保证前后端 session 一致'],
        tags: ['sse', 'streaming', 'frontend', 'partial-response', 'idempotency'],
        classification: { stage: 'frontend', depth: 'production', interviewUse: 'core-question' },
      },
    ],
  },
  {
    id: 'mdn_websocket',
    title: 'MDN WebSocket API',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API',
    publisher: 'MDN Web Docs',
    licenseUsage: 'MDN content is generally CC-BY-SA; store derived notes with attribution and verify current page license.',
    reliability: 'official',
    sourceKind: 'web-platform-doc',
    primaryCompetency: 'AI 前端工程',
    topics: [
      {
        title: 'WebSocket 与双向 Agent 交互',
        competency: 'AI 前端工程',
        content:
          'WebSocket 更适合需要双向实时交互、协同状态或服务端主动事件的 AI 应用；SSE 更适合单向 token 流。面试应追问候选人如何处理连接生命周期、心跳、重连、消息顺序、幂等、鉴权和服务端扩容。',
        rubric: ['能区分 WebSocket 与 SSE 的适用场景', '能处理重连、心跳、消息顺序和幂等', '能设计鉴权和租户隔离', '能说明服务端扩容与状态同步'],
        tags: ['websocket', 'realtime', 'frontend-state', 'auth', 'reconnect'],
        classification: { stage: 'frontend', depth: 'senior', interviewUse: 'follow-up' },
      },
    ],
  },
  {
    id: 'llm_interview_questions',
    title: 'llmgenai/LLMInterviewQuestions',
    url: 'https://github.com/llmgenai/LLMInterviewQuestions',
    publisher: 'llmgenai',
    licenseUsage: 'Public GitHub repository; use only as topic coverage reference. Do not copy question wording.',
    reliability: 'community-reference',
    sourceKind: 'interview-reference',
    primaryCompetency: '系统设计',
    topics: [
      {
        title: '公开题型覆盖校准',
        competency: '系统设计',
        content:
          '公开 LLM 面试题库可用于检查覆盖面，但不应直接复制题目。企业题库应把公开题型抽象成能力项，例如模型调用、prompt、RAG、检索、评估、Agent、安全、前端和生产化，再为真实业务场景重写问题、rubric、追问和校准样本。',
        rubric: ['能把公开题型转成企业能力模型', '能避免复制题目原文和版权风险', '能补齐场景题、排障题和系统设计题', '能用校准样本验证评分一致性'],
        tags: ['interview-bank', 'coverage', 'copyright-safe', 'calibration', 'question-design'],
        classification: { stage: 'system-design', depth: 'production', interviewUse: 'calibration' },
      },
    ],
  },
]

await mkdir(OUTPUT_DIR, { recursive: true })

const collectedAt = new Date().toISOString()
const chunks: CollectedChunk[] = []
const failures: Array<{ source: string; url: string; error: string }> = []

for (const source of sources) {
  const fetched = await fetchSourceText(source.url)
  if (!fetched.ok) {
    failures.push({ source: source.id, url: source.url, error: fetched.error ?? 'unknown fetch error' })
  }

  for (const [index, topic] of source.topics.entries()) {
    const quality = scoreChunkQuality(source, topic, fetched)
    chunks.push({
      id: stableId(`${source.id}:${index}:${topic.title}`),
      roleId: ROLE_ID,
      source: source.id,
      sourceUrl: source.url,
      sourceFinalUrl: fetched.finalUrl,
      sourceTitle: source.title,
      publisher: source.publisher,
      licenseUsage: source.licenseUsage,
      reliability: source.reliability,
      sourceKind: source.sourceKind,
      title: topic.title,
      competency: topic.competency,
      content: topic.content,
      rubric: topic.rubric,
      tags: normalizeTags([...topic.tags, source.primaryCompetency, source.publisher]),
      classification: topic.classification,
      quality,
      textStats: {
        extractedTitle: fetched.title,
        textHash: fetched.textHash,
        rawCharCount: fetched.rawCharCount,
        cleanedCharCount: fetched.cleanedCharCount,
        wordLikeCount: fetched.wordLikeCount,
        sourceEvidence: excerptEvidence(fetched.text, topic.tags),
        fetchOk: fetched.ok,
        fetchStatus: fetched.status,
        fetchError: fetched.error,
      },
      cleaning: {
        parser: 'cheerio',
        removedSelectors: REMOVED_SELECTORS,
        normalizedWhitespace: true,
        storedRawPageText: false,
        copyrightPolicy: 'Only derived notes, metadata, hashes, and very short evidence snippets are stored; raw page text is not persisted.',
      },
      collectedAt,
    })
  }
}

await writeFile(JSONL_PATH, `${chunks.map((chunk) => JSON.stringify(chunk)).join('\n')}\n`, 'utf8')
await writeFile(MARKDOWN_PATH, renderMarkdown(chunks), 'utf8')
await writeFile(REPORT_PATH, `${JSON.stringify(buildReport(chunks, failures, collectedAt), null, 2)}\n`, 'utf8')

console.log(`Collected ${chunks.length} derived knowledge chunks from ${sources.length} sources.`)
console.log(`Wrote ${path.relative(process.cwd(), JSONL_PATH)}`)
console.log(`Wrote ${path.relative(process.cwd(), MARKDOWN_PATH)}`)
console.log(`Wrote ${path.relative(process.cwd(), REPORT_PATH)}`)
if (failures.length > 0) {
  console.warn(`Fetch warnings: ${failures.length} source(s) failed; see report for details.`)
}

async function fetchSourceText(url: string): Promise<FetchedSource> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'learning-agent-research/1.0 (+https://github.com/Constantine1916/learning-agent)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })
    if (!response.ok) {
      return emptyFetchedSource(url, response.url, response.status, `${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    const rawCharCount = html.length
    const $ = cheerio.load(html)
    $(REMOVED_SELECTORS.join(',')).remove()
    const title = normalizeWhitespace($('title').first().text() || $('h1').first().text() || response.url || url)
    const text = normalizeWhitespace(
      $('main').text() ||
        $('article').text() ||
        $('[role="main"]').text() ||
        $('.markdown-body').text() ||
        $('body').text(),
    )

    return {
      ok: true,
      status: response.status,
      finalUrl: response.url || url,
      title,
      text,
      textHash: createHash('sha256').update(text).digest('hex'),
      rawCharCount,
      cleanedCharCount: text.length,
      wordLikeCount: text.match(/[\p{L}\p{N}_-]+/gu)?.length ?? 0,
    }
  } catch (error) {
    return emptyFetchedSource(url, url, undefined, error instanceof Error ? error.message : String(error))
  }
}

function emptyFetchedSource(url: string, finalUrl: string, status: number | undefined, error: string): FetchedSource {
  return {
    ok: false,
    status,
    finalUrl,
    title: url,
    text: '',
    error,
    textHash: createHash('sha256').update('').digest('hex'),
    rawCharCount: 0,
    cleanedCharCount: 0,
    wordLikeCount: 0,
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

function scoreChunkQuality(source: SourceConfig, topic: TopicConfig, fetched: FetchedSource) {
  const reasons: string[] = []
  let score = 60

  if (source.reliability === 'official' || source.reliability === 'standard') {
    score += 18
    reasons.push('authoritative-source')
  } else if (source.reliability === 'vendor-docs') {
    score += 12
    reasons.push('vendor-docs')
  } else if (source.reliability === 'engineering-article') {
    score += 8
    reasons.push('engineering-article')
  } else {
    score += 4
    reasons.push('coverage-reference')
  }

  if (fetched.ok && fetched.cleanedCharCount > 1000) {
    score += 8
    reasons.push('source-page-fetched-and-cleaned')
  } else if (!fetched.ok) {
    score -= 12
    reasons.push('source-fetch-failed')
  }

  if (topic.classification.depth === 'senior') {
    score += 5
    reasons.push('senior-depth')
  }

  if (topic.rubric.length >= 4 && topic.tags.length >= 4) {
    score += 7
    reasons.push('rubric-and-tags-complete')
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
  }
}

function renderMarkdown(chunksToRender: CollectedChunk[]) {
  return [
    '# AI 应用开发工程师采集知识块',
    '',
    '本文件由 `npm run collect:knowledge` 生成。内容为基于官方/高质量来源的整理改写知识块，并保留 source、url、title、competency、tags、license/usage、清洗统计和短证据片段。为避免版权风险，不保存整页原文。',
    '',
    ...chunksToRender.flatMap((chunk) => [
      `## ${chunk.title}`,
      `Competency: ${chunk.competency}`,
      `Tags: ${chunk.tags.join(', ')}`,
      `Source: ${chunk.sourceTitle}`,
      `URL: ${chunk.sourceUrl}`,
      `Final URL: ${chunk.sourceFinalUrl}`,
      `Publisher: ${chunk.publisher}`,
      `Reliability: ${chunk.reliability}`,
      `Classification: ${chunk.classification.stage}/${chunk.classification.depth}/${chunk.classification.interviewUse}`,
      `Quality: ${chunk.quality.score} (${chunk.quality.reasons.join(', ')})`,
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

function buildReport(chunksToReport: CollectedChunk[], failuresToReport: typeof failures, collectedAtValue: string) {
  return {
    roleId: ROLE_ID,
    collectedAt: collectedAtValue,
    sourceCount: sources.length,
    chunkCount: chunksToReport.length,
    failedSourceCount: failuresToReport.length,
    failures: failuresToReport,
    cleaningPolicy: {
      parser: 'cheerio',
      removedSelectors: REMOVED_SELECTORS,
      normalizedWhitespace: true,
      rawPageTextPersisted: false,
      copyrightPolicy: 'Persist only derived notes, metadata, hashes, and short evidence snippets.',
    },
    counts: {
      byCompetency: countBy(chunksToReport.map((chunk) => chunk.competency)),
      byStage: countBy(chunksToReport.map((chunk) => chunk.classification.stage)),
      byDepth: countBy(chunksToReport.map((chunk) => chunk.classification.depth)),
      byReliability: countBy(chunksToReport.map((chunk) => chunk.reliability)),
      bySourceKind: countBy(chunksToReport.map((chunk) => chunk.sourceKind)),
    },
    sources: sources.map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      reliability: source.reliability,
      sourceKind: source.sourceKind,
      primaryCompetency: source.primaryCompetency,
      topicCount: source.topics.length,
    })),
    chunks: chunksToReport.map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      competency: chunk.competency,
      source: chunk.source,
      sourceUrl: chunk.sourceUrl,
      tags: chunk.tags,
      classification: chunk.classification,
      quality: chunk.quality,
      textStats: chunk.textStats,
    })),
  }
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.toLowerCase().trim()).filter(Boolean))]
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function stableId(value: string) {
  return createHash('sha1').update(value).digest('hex').slice(0, 12)
}
