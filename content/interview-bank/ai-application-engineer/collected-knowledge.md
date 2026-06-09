# AI 应用开发工程师采集知识块

本文件由 `npm run collect:knowledge` 生成。内容为基于官方/高质量来源的整理改写知识块，并保留 source、url、title、competency、tags、license/usage、清洗统计和短证据片段。为避免版权风险，不保存整页原文。

## Prompt 指令设计与评估
Competency: Prompt 工程
Tags: prompt, context-engineering, evaluation, structured-output, prompt 工程, openai
Source: OpenAI Prompt Engineering Guide
URL: https://platform.openai.com/docs/guides/prompt-engineering
Final URL: https://developers.openai.com/api/docs/guides/prompt-engineering
Publisher: OpenAI
Reliability: official
Classification: generation/production/core-question
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Responses Copy Page Responses With the OpenAI API you can use a large language model to generate text

高质量 AI 应用需要把任务目标、角色边界、上下文、输出格式和失败处理写成可测试的 prompt 规范。面试中应重点考察候选人是否能把 prompt 改动纳入版本管理、评估集、回归测试和线上指标，而不是只凭主观感觉调文案。

- 能说明指令层级和上下文边界
- 能结合 schema 和示例稳定输出
- 能用评估集验证 prompt 改动
- 能处理 prompt injection 和上下文污染

## 严格 Schema 输出与后端校验
Competency: 结构化输出
Tags: structured-output, json-schema, validation, zod, llm-judge, 结构化输出, openai
Source: OpenAI Structured Outputs Guide
URL: https://platform.openai.com/docs/guides/structured-outputs
Final URL: https://developers.openai.com/api/docs/guides/structured-outputs
Publisher: OpenAI
Reliability: official
Classification: generation/production/core-question
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Some benefits of Structured Outputs include Reliable type-safety No need to validate or retry incorrectly formatted responses Explicit

企业 AI 应用不能把自然语言直接当业务数据消费。面试应要求候选人解释 schema-first 设计、字段约束、枚举、范围、嵌套对象、解析失败重试、越界修复和后端类型校验，并能说明结构化输出如何服务简历解析、评分 JSON、工具参数和最终报告。

- 能设计严格 JSON schema 和必填字段
- 能处理脏 JSON、缺字段和越界值
- 能说明模型输出与后端校验的责任边界
- 能把结构化输出用于评分和工具调用

## 结构化输出的失败恢复策略
Competency: 结构化输出
Tags: structured-output, error-recovery, regression-eval, schema-repair, 结构化输出, openai
Source: OpenAI Structured Outputs Guide
URL: https://platform.openai.com/docs/guides/structured-outputs
Final URL: https://developers.openai.com/api/docs/guides/structured-outputs
Publisher: OpenAI
Reliability: official
Classification: production/senior/follow-up
Quality: 98 (authoritative-source, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Responses Copy Page Responses JSON is one of the most widely used formats in the world for applications

结构化输出上线后常见问题包括模型输出 markdown、字段缺失、类型错误、分数越界和枚举漂移。优秀候选人应能设计可恢复错误：保留原始响应、执行 schema 校验、给模型最小修复提示、限制重试次数、记录失败样本，并在关键流程触发人工复核。

- 能列出结构化输出常见失败模式
- 能设计校验、修复、重试和人工复核
- 能把失败样本沉淀到 regression eval
- 能避免业务代码消费未校验结果

## 工具调用参数协议与权限边界
Competency: Agent 工具调用
Tags: function-calling, tool-schema, permissions, idempotency, audit, agent 工具调用, openai
Source: OpenAI Function Calling Guide
URL: https://platform.openai.com/docs/guides/function-calling
Final URL: https://developers.openai.com/api/docs/guides/function-calling
Publisher: OpenAI
Reliability: official
Classification: agent/production/core-question
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Responses Copy Page Responses Function calling also known as tool calling provides a powerful and flexible way for

Function calling 的核心不是让模型自由执行代码，而是把工具能力暴露成严格参数协议。面试应追问候选人如何定义工具 schema、校验参数、注入用户/租户权限、处理工具错误、保证幂等、记录审计，并在高风险动作前要求人工确认。

- 能设计 tool schema 和参数校验
- 能把权限、租户和用户上下文带入工具层
- 能处理超时、重试、幂等和审计
- 能识别高风险工具需要人工确认

## 内置工具与业务工具的选择边界
Competency: Agent 工具调用
Tags: tools, tool-use, agent-boundaries, cost-control, agent 工具调用, openai
Source: OpenAI Tools Guide
URL: https://platform.openai.com/docs/guides/tools
Final URL: https://developers.openai.com/api/docs/guides/tools
Publisher: OpenAI
Reliability: official
Classification: agent/production/follow-up
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Starter app Experiment with built-in tools in the Responses API

面试官应区分模型自带工具、平台工具和业务自定义工具。候选人需要能判断何时使用检索、代码执行、文件解析、浏览器或业务 API，并说明工具结果如何进入上下文、如何标注来源、如何隔离不可信结果，以及如何限制工具调用成本和循环。

- 能判断不同工具适用场景
- 能说明工具结果进入上下文的边界
- 能设计工具调用成本和循环限制
- 能结合安全策略隔离不可信工具输出

## Embedding 与语义检索能力
Competency: 向量检索
Tags: embedding, semantic-search, vector-db, recall-at-k, 向量检索, openai
Source: OpenAI Embeddings Guide
URL: https://platform.openai.com/docs/guides/embeddings
Final URL: https://developers.openai.com/api/docs/guides/embeddings
Publisher: OpenAI
Reliability: official
Classification: retrieval/foundation/core-question
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Copy Page New embedding modelstext-embedding-3-small and text-embedding-3-large our newest and most performant embedding models are now available

Embedding 数据适合语义搜索、聚类、推荐和相似度比较。面试中应追问候选人如何选择 embedding 模型、维度、相似度算法、索引和评估方式，以及为什么切换 embedding 模型时需要重新生成文档向量和查询向量。

- 能解释 embedding 的语义空间和适用场景
- 能说明维度、相似度和索引取舍
- 能处理跨模型迁移和重建索引
- 能用 recall@k、MRR、延迟评估检索效果

## LLM 应用评估与回归测试
Competency: RAG 评估
Tags: evals, llm-judge, golden-set, regression, rag 评估, openai
Source: OpenAI Evals Guide
URL: https://platform.openai.com/docs/guides/evals
Final URL: https://developers.openai.com/api/docs/guides/evals
Publisher: OpenAI
Reliability: official
Classification: evaluation/production/core-question
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Responses Copy Page Responses Evaluations often called evals test model outputs to ensure they meet style and content

AI 应用上线前后都需要评估闭环。面试题应考察候选人如何构建 golden set、bad case、自动化 eval、人工 review、LLM judge 校准和 regression test，并能区分检索质量、生成质量、安全质量和业务指标。

- 能构建 golden set 和 bad case 集
- 能区分检索、生成、安全和业务指标
- 能说明 LLM judge 偏差和校准
- 能把线上反馈回流到回归评估

## 生产级 LLM 调用可靠性
Competency: 生产排查
Tags: production, timeout, retry, rate-limit, cost, observability, 生产排查, openai
Source: OpenAI Production Best Practices
URL: https://platform.openai.com/docs/guides/production-best-practices
Final URL: https://developers.openai.com/api/docs/guides/production-best-practices
Publisher: OpenAI
Reliability: official
Classification: production/senior/core-question
Quality: 98 (authoritative-source, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Copy Page This guide provides a comprehensive set of best practices to help you transition from prototype to

生产级 LLM 应用需要把超时、重试、限流、错误分类、请求追踪、成本控制和容量规划当作核心工程问题。面试应让候选人拆解 P95 延迟、token 消耗、模型失败率、供应商限流和 fallback，并要求说明如何做灰度、回滚和 regression eval。

- 能拆解延迟、成本、限流和失败率
- 能设计 timeout、retry、fallback 和熔断
- 能记录 request id、model version、token 和错误
- 能用灰度与回归评估验证改动

## AI 应用安全评估与缓解
Competency: AI 安全
Tags: safety, red-team, privacy, moderation, security-eval, ai 安全, openai
Source: OpenAI Safety Best Practices
URL: https://platform.openai.com/docs/guides/safety-best-practices
Final URL: https://developers.openai.com/api/docs/guides/safety-best-practices
Publisher: OpenAI
Reliability: official
Classification: safety/production/rubric-evidence
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Copy Page Use our free Moderation API OpenAI s Moderation API is free-to-use and can help reduce the

安全不是只在 system prompt 写一句规则。面试应考察候选人是否能结合输入校验、输出过滤、敏感数据最小化、安全 eval、红队样本、人工复核和事故回放来治理 AI 风险，尤其是面试系统中的简历、评分和个人信息。

- 能识别输入、输出、检索、工具和隐私风险
- 能设计安全 eval、红队和人工复核
- 能限制敏感信息进入上下文
- 能记录并复盘安全事件

## Stateful Agent 工作流
Competency: Agent 工具调用
Tags: langgraph, agent, workflow, checkpoint, state-machine, agent 工具调用, langchain
Source: LangGraph Overview
URL: https://docs.langchain.com/oss/javascript/langgraph/overview
Final URL: https://docs.langchain.com/oss/javascript/langgraph/overview
Publisher: LangChain
Reliability: official
Classification: agent/senior/core-question
Quality: 98 (authoritative-source, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Trusted by companies shaping the future of agents including Klarna Uber J P

企业级面试官 Agent 需要显式状态和可恢复流程。题目应考察候选人是否能设计 state、node、edge、conditional routing、checkpoint、message history、tool result、human-in-the-loop 和终止条件，而不是只写一个长 prompt。

- 能设计状态图和流程节点
- 能处理条件路由和中断恢复
- 能保存题目计划、消息和评分
- 能用 trace 调试多轮 Agent

## 面试流程的条件路由与中断恢复
Competency: 对话状态管理
Tags: langgraph, conditional-routing, checkpoint, session-state, agent 工具调用, langchain
Source: LangGraph Overview
URL: https://docs.langchain.com/oss/javascript/langgraph/overview
Final URL: https://docs.langchain.com/oss/javascript/langgraph/overview
Publisher: LangChain
Reliability: official
Classification: agent/senior/follow-up
Quality: 98 (authoritative-source, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Morgan and more LangGraph is a low-level orchestration framework and runtime for building managing and deploying long-running stateful

面试官 Agent 的流程不是线性脚本。候选人回答质量低时要追问，能力项覆盖不足时要换题，候选人中断后要恢复 session，最终报告生成失败时要可重试。LangGraph 类工作流适合把这些条件显式写成状态转移，并把 checkpoint 用作审计和恢复基础。

- 能把低分追问、覆盖补齐和结束条件写成路由
- 能说明 checkpoint 与 session state 的关系
- 能处理节点失败和报告重试
- 能保证重复提交不会破坏状态

## RAG 应用链路与组件
Competency: RAG 数据治理
Tags: rag, ingestion, retrieval, metadata, generation, rag 数据治理, langchain
Source: LangChain RAG Documentation
URL: https://docs.langchain.com/oss/javascript/langchain/rag
Final URL: https://docs.langchain.com/oss/javascript/langchain/rag
Publisher: LangChain
Reliability: official
Classification: ingestion/foundation/core-question
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: These applications use a technique known as Retrieval Augmented Generation or RAG

RAG 应用通常包含数据加载、文档切分、向量化、检索、上下文组织和生成。面试题应要求候选人说明 ingestion、retrieval、generation 和 evaluation 的边界，以及如何把 metadata、权限和更新策略纳入工程设计。

- 能拆分 RAG ingestion、retrieval 和 generation
- 能说明文档切分和 metadata
- 能结合权限和更新策略
- 能评估检索和生成质量

## Agent Trace 与线上排障
Competency: 生产排查
Tags: observability, trace, langsmith, bad-case, latency, 生产排查, langchain
Source: LangSmith Observability
URL: https://docs.langchain.com/langsmith/observability
Final URL: https://docs.langchain.com/langsmith/observability
Publisher: LangChain
Reliability: official
Classification: production/senior/core-question
Quality: 98 (authoritative-source, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: LangSmith Observability provides full visibility into your LLM application from individual traces to production-wide performance metrics

多轮 Agent 出错时，需要能回放每个步骤：用户输入、检索 query、召回 chunk、rerank 分数、prompt、模型响应、工具调用、错误、token 和延迟。面试应要求候选人说明 trace 字段、span 粒度、采样策略、隐私脱敏和如何把 bad case 加入评估集。

- 能列出 RAG/Agent trace 关键字段
- 能按检索、生成、工具和前端分段排查
- 能处理隐私脱敏和采样
- 能把线上坏例回流到 eval

## 生产级 RAG 数据摄取与调优
Competency: RAG 数据治理
Tags: production-rag, chunking, metadata, incremental-indexing, data-quality, rag 数据治理, llamaindex
Source: LlamaIndex Production RAG
URL: https://docs.llamaindex.ai/en/stable/optimizing/production_rag/
Final URL: https://developers.llamaindex.ai/python/framework/optimizing/production_rag/
Publisher: LlamaIndex
Reliability: vendor-docs
Classification: ingestion/senior/core-question
Quality: 92 (vendor-docs, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Resources Metadata Replacement Postprocessor Structured Retrieval for Larger Document SetsSection titled Structured Retrieval for Larger Document Sets Motivatio

生产级 RAG 的关键不是一次性上传文档，而是持续管理解析、清洗、chunk size、overlap、标题层级、metadata、增量更新、删除同步和质量验证。面试应要求候选人说明如何通过实验比较不同切分策略对召回和回答质量的影响。

- 能说明解析、清洗、chunking 和 metadata 的关系
- 能处理增量更新、删除和版本
- 能用实验比较 chunk size、overlap 和标题保留
- 能把数据质量问题回流到 ingestion

## 面试题库采集清洗与标签治理
Competency: RAG 数据治理
Tags: interview-bank, collection, cleaning, chunking, tags, metadata, quality-score, rag 数据治理, llamaindex
Source: LlamaIndex Production RAG
URL: https://docs.llamaindex.ai/en/stable/optimizing/production_rag/
Final URL: https://developers.llamaindex.ai/python/framework/optimizing/production_rag/
Publisher: LlamaIndex
Reliability: vendor-docs
Classification: ingestion/senior/core-question
Quality: 92 (vendor-docs, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Resources Metadata Replacement Postprocessor Structured Retrieval for Larger Document SetsSection titled Structured Retrieval for Larger Document Sets Motivatio

面试题库的 RAG 数据不应该是“网上搜题后直接入库”。更可靠的流程是先定义岗位能力模型，再选择可信来源，抓取页面后去噪清洗，按主题和语义切分，给每个 chunk 标注 role、competency、difficulty、source、publisher、license、tags、qualityScore、collectedAt 和审核状态，最后用召回评测确认这些标签确实提升选题、追问和评分依据。

- 能先定义岗位能力模型再采集
- 能说明清洗、切分、标签和审核字段
- 能区分结构化题库与向量知识块
- 能用召回评测验证入库质量

## 检索质量与回答质量分层评估
Competency: RAG 评估
Tags: rag-evaluation, retrieval-eval, faithfulness, llm-judge, golden-set, rag 评估, llamaindex
Source: LlamaIndex Evaluating Guide
URL: https://docs.llamaindex.ai/en/stable/module_guides/evaluating/
Final URL: https://developers.llamaindex.ai/python/framework/module_guides/evaluating/
Publisher: LlamaIndex
Reliability: vendor-docs
Classification: evaluation/senior/core-question
Quality: 92 (vendor-docs, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Faithfulness Evaluates if the answer is faithful to the retrieved contexts in other words whether if there s

RAG 评估要拆成检索、上下文和答案三层。检索层看 recall、MRR、NDCG 和 source 覆盖；上下文层看噪声、冲突和权限；答案层看 faithfulness、relevance、引用准确和拒答。面试应追问候选人如何用人工样本和 LLM judge 互相校准。

- 能区分 retrieval eval、context eval 和 answer eval
- 能设计 golden set 与 bad case
- 能说明 LLM judge 需要人工校准
- 能把评估接入 CI 或发布门槛

## 两阶段召回与 Rerank
Competency: 向量检索
Tags: rerank, two-stage-retrieval, cross-encoder, context-compression, 向量检索, pinecone
Source: Pinecone Rerankers for RAG
URL: https://www.pinecone.io/learn/series/rag/rerankers/
Final URL: https://www.pinecone.io/learn/series/rag/rerankers/
Publisher: Pinecone
Reliability: engineering-article
Classification: retrieval/senior/core-question
Quality: 88 (engineering-article, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Engineering article; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Rerankers and Two-Stage RetrievalJump to section Recall vs

向量 topK 召回不等于最终上下文质量。企业级 RAG 常先用向量或混合检索扩大候选集，再用 cross-encoder 或 reranker 精排，最后做去重和上下文压缩。面试应要求候选人说明 rerank 的质量收益、延迟成本和何时不值得引入。

- 能解释召回和精排的职责差异
- 能说明 rerank 对质量、延迟和成本的影响
- 能设计 topK、rerankK、去重和压缩策略
- 能用评估数据判断是否上线 rerank

## BM25 与向量混合检索
Competency: 向量检索
Tags: hybrid-search, bm25, dense-vector, metadata-filter, fusion, 向量检索, microsoft
Source: Azure AI Search Hybrid Search Overview
URL: https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview
Final URL: https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview
Publisher: Microsoft
Reliability: official
Classification: retrieval/production/core-question
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Microsoft Learn content; store derived notes with attribution. Check Microsoft Learn terms for redistribution limits.
Evidence: Merges results from each query by using Reciprocal Rank Fusion RRF

混合检索适合同时处理关键词精确匹配和语义相似。面试应让候选人比较 BM25、dense vector、sparse vector、metadata filter 和 fusion 策略，说明为什么企业知识库不能只依赖向量相似度，以及如何评估 hybrid search 的召回收益。

- 能比较关键词、向量和混合检索
- 能说明 metadata filter 与权限过滤
- 能解释 fusion、权重和 rerank
- 能用 recall@k 和坏例分析验证收益

## 向量索引与过滤设计
Competency: 向量检索
Tags: vector-index, acl, metadata-filter, versioning, tenant, 向量检索, microsoft
Source: Azure AI Search Vector Search Overview
URL: https://learn.microsoft.com/en-us/azure/search/vector-search-overview
Final URL: https://learn.microsoft.com/en-us/azure/search/vector-search-overview
Publisher: Microsoft
Reliability: official
Classification: retrieval/production/follow-up
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Microsoft Learn content; store derived notes with attribution. Check Microsoft Learn terms for redistribution limits.
Evidence: Table of contents Exit editor mode Ask Learn Ask Learn Reading mode Table of contents Read in English

向量搜索的工程设计要同时考虑 embedding 模型、向量字段、索引参数、近似检索、过滤字段、权限条件和更新策略。面试应追问候选人如何设计 doc id、chunk id、source id、version、tenant id 和 ACL metadata，避免召回越权或过期内容。

- 能设计向量字段、索引和过滤字段
- 能处理 tenant、ACL、version 和 source id
- 能说明近似检索与精确评估的差异
- 能避免权限污染和过期召回

## pgvector 索引、维度与重建
Competency: 向量检索
Tags: pgvector, hnsw, ivfflat, embedding-dimensions, index-rebuild, 向量检索
Source: pgvector README
URL: https://github.com/pgvector/pgvector
Final URL: https://github.com/pgvector/pgvector
Publisher: pgvector
Reliability: community-reference
Classification: retrieval/production/core-question
Quality: 79 (coverage-reference, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Open source project documentation; store derived notes with attribution.
Evidence: pgvector pgvector Public Notifications You must be signed in to change notification settings Fork 1 2k Star 21

使用 pgvector 时要理解 vector 维度、相似度操作符、HNSW/IVFFlat 索引、写入成本和重建策略。面试应追问候选人为什么切换 embedding 模型或维度后必须重建列和索引，以及如何在小规模精确搜索和大规模近似搜索之间取舍。

- 能解释 vector 维度和相似度操作符
- 能比较 HNSW、IVFFlat 和精确搜索
- 能说明模型/维度切换需要重建索引
- 能考虑写入、查询、内存和迁移成本

## Dense/Sparse Hybrid 与多路召回
Competency: 向量检索
Tags: hybrid-search, sparse-vector, dense-vector, fusion, multi-retrieval, 向量检索, qdrant
Source: Qdrant Hybrid Queries
URL: https://qdrant.tech/documentation/concepts/hybrid-queries/
Final URL: https://qdrant.tech/documentation/search/hybrid-queries/
Publisher: Qdrant
Reliability: vendor-docs
Classification: retrieval/senior/follow-up
Quality: 92 (vendor-docs, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: DocumentationSearchHybrid QueriesHybrid and Multi-Stage QueriesAvailable as of v1 10 0With the introduction of multiple named vectors per point

复杂企业问答经常需要 dense 向量、sparse 向量、关键词和业务过滤多路召回，再通过 fusion、rerank 和去重合成上下文。面试可要求候选人设计多路检索计划，并说明如何防止某一路召回过强、重复 chunk 太多或权限过滤位置错误。

- 能设计 dense、sparse、keyword 和 filter 多路召回
- 能说明 fusion 和 rerank 的顺序
- 能处理重复 chunk 和上下文预算
- 能把权限过滤放在正确阶段

## Agent 简单优先与可控编排
Competency: Agent 工具调用
Tags: agent, workflow, tool-use, human-in-the-loop, observability, agent 工具调用, anthropic
Source: Anthropic Building Effective Agents
URL: https://www.anthropic.com/engineering/building-effective-agents
Final URL: https://www.anthropic.com/engineering/building-effective-agents
Publisher: Anthropic
Reliability: engineering-article
Classification: agent/senior/rubric-evidence
Quality: 88 (engineering-article, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Engineering article; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Engineering at AnthropicBuilding effective agentsPublished Dec 19 2024We ve worked with dozens of teams building LLM agents across

Agent 不应为了复杂而复杂。面试中应考察候选人能否先用简单 workflow 解决问题，再在需要动态决策、工具调用和多步骤恢复时引入更复杂 Agent；同时要能说明工具边界、人工确认、失败恢复和观测。

- 能判断 workflow 和 autonomous agent 的边界
- 能解释工具调用适用场景
- 能设计失败恢复和人工确认
- 能保持流程可解释和可观测

## MCP 工具协议与能力发现
Competency: Agent 工具调用
Tags: mcp, tool-protocol, capability-discovery, remote-tools, authorization, agent 工具调用, model context protocol
Source: Model Context Protocol Tools
URL: https://modelcontextprotocol.io/docs/concepts/tools
Final URL: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
Publisher: Model Context Protocol
Reliability: official
Classification: agent/senior/follow-up
Quality: 98 (authoritative-source, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Protocol documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: The Model Context Protocol MCP allows servers to expose tools that can be invoked by language models

MCP 类协议让 Agent 以统一方式发现和调用外部工具。面试应考察候选人是否理解工具描述、参数 schema、权限授权、用户确认、错误返回和审计日志，并能说明远程工具和本地工具在安全边界、延迟和可观测性上的差异。

- 能说明工具发现、描述和参数 schema
- 能设计授权、确认和审计
- 能处理远程工具错误、超时和权限
- 能评估 MCP 与内置工具/自定义 API 的边界

## 企业级 RAG 设计与评估
Competency: RAG 评估
Tags: rag-evaluation, enterprise, quality-gate, rollback, feedback-loop, rag 评估, microsoft
Source: Microsoft Azure RAG solution design and evaluation guide
URL: https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide
Final URL: https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide
Publisher: Microsoft
Reliability: official
Classification: evaluation/senior/rubric-evidence
Quality: 98 (authoritative-source, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: Microsoft Learn content; store derived notes with attribution. Check Microsoft Learn terms for redistribution limits.
Evidence: Table of contents Exit editor mode Ask Learn Ask Learn Reading mode Table of contents Read in English

企业级 RAG 需要从数据质量、检索质量、生成质量、延迟、成本、安全和用户反馈多个维度评估。面试题应要求候选人设计评估集、质量指标、上线门槛、灰度、回滚和持续改进流程。

- 能设计端到端 RAG 评估体系
- 能区分质量、成本、延迟和安全指标
- 能设计上线门槛和回滚
- 能持续吸收线上反馈

## LLM 应用安全风险
Competency: AI 安全
Tags: owasp, llm-security, prompt-injection, data-leakage, tool-permissions, ai 安全
Source: OWASP Top 10 for LLM and Gen AI Apps
URL: https://genai.owasp.org/llm-top-10/
Final URL: https://genai.owasp.org/llm-top-10/
Publisher: OWASP
Reliability: standard
Classification: safety/production/core-question
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: OWASP community resource; store derived notes and attribution. Verify current OWASP license before redistribution.
Evidence: A Prompt Injection Vulnerability occurs when user prompts alter the Read More Sensitive information can affect both the

AI 应用要防范 prompt injection、敏感信息泄露、供应链风险、越权工具调用和不安全输出。面试中应重点追问候选人如何把用户输入、检索文档和工具结果视为不可信数据，并通过权限、沙箱、审计、红队和拒答策略降低风险。

- 能识别直接和间接 prompt injection
- 能设计工具权限和人工确认
- 能保护敏感信息和用户数据
- 能建立红队、安全日志和修复闭环

## AI 风险治理与责任闭环
Competency: AI 安全
Tags: ai-risk, governance, fairness, audit, human-review, ai 安全, nist
Source: NIST AI Risk Management Framework
URL: https://www.nist.gov/itl/ai-risk-management-framework
Final URL: https://www.nist.gov/itl/ai-risk-management-framework
Publisher: NIST
Reliability: standard
Classification: safety/senior/follow-up
Quality: 90 (authoritative-source, senior-depth, rubric-and-tags-complete)
License/Usage: US government/public standards resource; store derived notes with attribution.
Evidence: New guidance seeks to cultivate trust in AI technologies and promote AI innovation while mitigating risk

企业级 AI 面试系统涉及候选人隐私、公平性、可解释性和人工复核。面试应要求候选人把风险识别、评估、缓解、监控和治理责任落到流程中，例如题库审核、评分偏差检测、数据保留、申诉机制和审计报告。

- 能识别隐私、公平性、透明度和安全风险
- 能设计治理角色、审核流程和人工复核
- 能说明监控、审计和事故响应
- 能把风险治理纳入产品指标和发布门槛

## AI 前端流式协议
Competency: AI 前端工程
Tags: sse, streaming, frontend, partial-response, idempotency, ai 前端工程, mdn web docs
Source: MDN Server-sent events
URL: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
Final URL: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
Publisher: MDN Web Docs
Reliability: official
Classification: frontend/production/core-question
Quality: 93 (authoritative-source, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: MDN content is generally CC-BY-SA; store derived notes with attribution and verify current page license.
Evidence: Examples Simple SSE demo using PHP Specifications Specification HTML server-sent-events See also Tools Mercure a real-time communication protocol

AI 前端常用 streaming 降低首 token 等待并提升可感知进度。面试题应要求候选人比较 SSE、NDJSON 和 WebSocket，说明取消、重试、部分结果、错误恢复、幂等提交和 session 状态一致性。

- 能比较 SSE、NDJSON 和 WebSocket
- 能处理取消、重试和网络中断
- 能展示 partial response 和最终状态
- 能保证前后端 session 一致

## WebSocket 与双向 Agent 交互
Competency: AI 前端工程
Tags: websocket, realtime, frontend-state, auth, reconnect, ai 前端工程, mdn web docs
Source: MDN WebSocket API
URL: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
Final URL: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
Publisher: MDN Web Docs
Reliability: official
Classification: frontend/senior/follow-up
Quality: 98 (authoritative-source, source-page-fetched-and-cleaned, senior-depth, rubric-and-tags-complete)
License/Usage: MDN content is generally CC-BY-SA; store derived notes with attribution and verify current page license.
Evidence: WebSocket API WebSockets Note This feature is available in Web Workers

WebSocket 更适合需要双向实时交互、协同状态或服务端主动事件的 AI 应用；SSE 更适合单向 token 流。面试应追问候选人如何处理连接生命周期、心跳、重连、消息顺序、幂等、鉴权和服务端扩容。

- 能区分 WebSocket 与 SSE 的适用场景
- 能处理重连、心跳、消息顺序和幂等
- 能设计鉴权和租户隔离
- 能说明服务端扩容与状态同步

## 公开题型覆盖校准
Competency: 系统设计
Tags: interview-bank, coverage, copyright-safe, calibration, question-design, 系统设计, llmgenai
Source: llmgenai/LLMInterviewQuestions
URL: https://github.com/llmgenai/LLMInterviewQuestions
Final URL: https://github.com/llmgenai/LLMInterviewQuestions
Publisher: llmgenai
Reliability: community-reference
Classification: system-design/production/calibration
Quality: 79 (coverage-reference, source-page-fetched-and-cleaned, rubric-and-tags-complete)
License/Usage: Public GitHub repository; use only as topic coverage reference. Do not copy question wording.
Evidence: llmgenai LLMInterviewQuestions Public Notifications You must be signed in to change notification settings Fork 384 Star 1 8k

公开 LLM 面试题库可用于检查覆盖面，但不应直接复制题目。企业题库应把公开题型抽象成能力项，例如模型调用、prompt、RAG、检索、评估、Agent、安全、前端和生产化，再为真实业务场景重写问题、rubric、追问和校准样本。

- 能把公开题型转成企业能力模型
- 能避免复制题目原文和版权风险
- 能补齐场景题、排障题和系统设计题
- 能用校准样本验证评分一致性
