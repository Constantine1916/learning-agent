# AI 应用开发工程师面试参考知识库

本文件是面试官 Agent 的 RAG 参考知识库，不等同于结构化题库。结构化出题使用 `questions.json` 和 `rubrics.json`，本文件用于给 LLM 提供能力背景、参考答案要点、生产化信号和追问依据。

## LLM API 工程与模型适配
Competency: LLM API 工程

企业级 AI 应用需要把模型调用抽象成稳定的 provider adapter，而不是在业务代码里散落 SDK 调用。适配层通常包括 baseURL、model、timeout、retry、streaming、response schema、token usage、trace id、错误分类和灰度配置。模型选择需要综合质量、延迟、成本、上下文窗口、结构化输出能力、工具调用能力、中文效果、限流策略和供应商稳定性。上线后要能做模型版本管理、A/B、降级和回滚。

- 能说明模型选择的质量、成本、延迟和稳定性权衡
- 能设计 OpenAI-compatible provider adapter
- 能处理 streaming、timeout、retry、rate limit 和 fallback
- 能记录 token、latency、model version 和错误信息

## Prompt 与上下文工程
Competency: Prompt 工程

Prompt 工程不是简单写提示词，而是把系统指令、开发者约束、用户输入、检索证据和工具结果按可信度和优先级组织起来。稳定输出需要结合 schema、示例、response format、后端校验和可恢复错误处理。上下文过长时要做相关性排序、摘要、压缩和窗口预算管理。企业级系统还需要 prompt 版本管理、评估集、A/B 测试和 prompt injection 防护。

- 能区分 system、developer、user、retrieval content 和 tool result 的边界
- 能用 schema、few-shot、校验和重试稳定输出
- 能处理上下文排序、裁剪、摘要和压缩
- 能建立 prompt 版本评估、回归测试和注入防护

## 结构化输出与工具协议
Competency: 结构化输出

真实业务不能直接消费模型自然语言输出。结构化输出需要 schema-first 设计，明确字段类型、必填项、枚举、范围、嵌套对象和错误恢复策略。工具调用也是一种结构化协议，需要参数校验、权限上下文、结果校验、幂等、审计和高风险动作确认。LLM judge、简历解析、题目生成和最终报告都应该经过后端类型校验后才能入库。

- 能设计 JSON schema、字段约束和类型校验
- 能处理缺字段、脏 JSON、越界值和可恢复错误
- 能把 tool schema、权限、幂等和审计纳入协议
- 能避免模型输出直接触发高风险业务动作

## RAG 数据治理
Competency: RAG 数据治理

企业级 RAG 的质量首先取决于数据治理。数据源可能包括 PDF、DOCX、网页、知识库、工单、数据库和代码仓库。摄取流程需要解析、清洗、去重、标题层级保留、语义 chunking、metadata、权限标签、版本、更新时间、owner、doc id 和 source id。文档新增、更新、删除和权限变化都必须同步到索引，且最好有索引版本、灰度发布和回滚能力。

- 能说明多格式解析、清洗、去重和质量校验
- 能设计 chunking、metadata、权限和版本字段
- 能处理增量更新、删除、权限变化和索引回滚
- 能用 golden set 验证数据治理策略对召回和回答质量的影响

## Embedding 与向量检索
Competency: 向量检索

Embedding 模型决定文本映射到语义空间的方式，不同模型或不同维度生成的向量不能混用。向量检索需要考虑 cosine、dot product、L2、向量维度、索引类型、召回速度、存储成本和写入成本。pgvector 常用 HNSW 或 IVFFlat 做近似检索，小规模或评估时可以用精确搜索。企业级 RAG 通常还会结合 BM25、metadata filter、query rewrite、multi-query、hybrid search、rerank、MMR、去重和上下文压缩。

- 能解释 embedding 质量、维度、相似度和索引的关系
- 能说明不同 embedding 模型不能混用并需要重建索引
- 能设计 BM25、向量召回、metadata filter、hybrid search 和 rerank
- 能用 recall@k、MRR、NDCG、延迟和坏例分析评估检索

## RAG 生成控制与评估
Competency: RAG 评估

RAG 不是把检索结果直接塞给模型，而是要控制回答必须被证据支持。生成阶段需要引用 source id、处理多来源冲突、证据不足拒答、低置信度提示和 unsupported claims 检测。评估体系要拆成检索指标和生成指标，包括 recall@k、context precision、faithfulness、answer relevance、groundedness、人工 review、LLM judge 校准、线上反馈和 regression eval。

- 能设计引用、拒答、冲突处理和 groundedness 约束
- 能区分检索指标、生成指标、人工评审和业务指标
- 能构建 golden set、bad case 和回归评估
- 能把线上反馈回流到题库、知识库和评估集

## Agent 工具调用与工作流
Competency: Agent 工具调用

Agent 适合处理需要实时数据、外部系统操作、多步骤业务流程、数据库查询和动态决策的任务。工具调用要设计清晰 schema、参数校验、权限、沙箱、幂等、重试、超时、人工确认和审计日志。LangGraph 这类 stateful workflow 适合面试官 Agent，因为流程需要保存简历、画像、消息、题目计划、评分、状态、轮次、检索结果和最终报告。

- 能判断何时需要工具调用而不是直接回答
- 能设计工具 schema、权限、沙箱、幂等和人工确认
- 能用 state、node、edge、conditional routing 和 checkpoint 编排流程
- 能处理工具失败、脏数据、超时、补偿和 trace

## Agent 状态与记忆
Competency: 对话状态管理

多轮 Agent 的记忆要分层：短期消息历史、结构化 session state、候选人画像、题目计划、历史评分、长期用户画像和外部知识库。不是所有内容都应该长期保存，也不是所有历史都应该进入 prompt。企业级系统要支持中断恢复、重复问题规避、低分能力补问、上下文摘要、相关性选择、权限隔离、TTL、用户同意和删除。

- 能区分短期消息、结构化状态、长期画像和外部知识库
- 能设计 session、messages、questionPlan、scores、status 和 checkpoint
- 能通过摘要、裁剪和相关性选择控制上下文
- 能处理隐私、权限、用户同意、TTL 和删除请求

## 生产化与可观测性
Competency: 生产排查

AI 应用上线后要能解释每次回答是如何产生的。关键 trace 字段包括 request id、session id、user id、prompt version、model version、temperature、retrieved chunks、rerank scores、tool calls、latency breakdown、token usage、errors、feedback 和安全事件。质量监控不能只看接口 200，还要看回答质量、无答案率、幻觉率、用户反馈、成本、延迟、缓存命中和评估回归。

- 能记录 prompt、model、RAG、tool、latency、token 和 error trace
- 能按 prompt、RAG、模型参数、工具、缓存和数据源排查线上问题
- 能设计质量、成本、延迟、安全和业务指标看板
- 能做灰度发布、A/B、报警、回滚和 regression eval

## AI 安全与权限治理
Competency: AI 安全

AI 应用要把用户输入、上传文件、网页内容、检索结果和工具结果都视为潜在不可信数据。常见风险包括直接 prompt injection、间接 prompt injection、RAG 污染、敏感信息泄露、越权工具调用、恶意文件和不安全输出。安全设计需要输入校验、指令隔离、敏感信息不入上下文、最小权限、工具审批、沙箱、输出过滤、审计日志、红队测试和事故回放。

- 能识别直接注入、间接注入、RAG 注入和工具越权风险
- 能隔离不可信上下文，避免检索内容覆盖系统指令
- 能设计权限、沙箱、人工确认、审计和敏感信息保护
- 能建立红队样本、安全报警和修复闭环

## AI 前端与交互体验
Competency: AI 前端工程

AI 前端需要处理 streaming、取消生成、重试、加载状态、错误提示、引用展示、评分反馈、最终报告和 session 恢复。协议上可以选择 SSE、NDJSON 或 WebSocket。用户体验上要让 Agent 流程可解释、可控、可恢复，避免用户不知道系统是在检索、思考、评分还是失败。对面试系统来说，还要展示进度和反馈边界，避免泄露完整评分答案。

- 能比较 SSE、NDJSON、WebSocket 的适用场景
- 能设计 loading、partial response、cancel、retry 和 idempotency
- 能展示引用、评分依据、错误状态和报告
- 能保证前端状态和后端 session 一致

## 系统设计与产品判断
Competency: 系统设计

企业级 AI 面试官 Agent 应该把岗位、能力项、题目、追问、rubric、校准样本、知识库、面试 session、消息、评分和报告分开治理。MVP 可以先实现一个岗位，但数据结构要支持多岗位、多难度、多租户和题库版本。产品上要澄清岗位级别、通过标准、题库来源、人工复核、候选人体验、隐私合规、成功指标和上线风险。

- 能拆分前端、API、Agent workflow、RAG、结构化题库和数据层
- 能设计 roles、competencies、questions、rubrics、calibration、sessions 和 reports
- 能明确 MVP 边界、业务指标、人工兜底和风险等级
- 能设计题库版本、审核、发布、回滚和持续校准流程
