# AI 应用开发工程师采集知识块

本文件由 `npm run collect:knowledge` 生成。内容为基于官方/高质量来源的整理改写知识块，并保留 source、url、title、competency、license/usage 和短证据片段。为避免版权风险，不保存整页原文。

## Prompt 指令设计与评估
Competency: Prompt 工程
Source: OpenAI Prompt Engineering Guide
URL: https://platform.openai.com/docs/guides/prompt-engineering
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Responses Copy Page Responses With the OpenAI API you can use a large language model to generate text

高质量 AI 应用需要把任务目标、角色边界、上下文、输出格式和失败处理写成可测试的 prompt 规范。面试中应重点考察候选人是否能把 prompt 改动纳入版本管理、评估集、回归测试和线上指标，而不是只凭主观感觉调文案。

- 能说明指令层级和上下文边界
- 能结合 schema 和示例稳定输出
- 能用评估集验证 prompt 改动
- 能处理 prompt injection 和上下文污染

## Embedding 与语义检索能力
Competency: 向量检索
Source: OpenAI Embeddings Guide
URL: https://platform.openai.com/docs/guides/embeddings
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Copy Page New embedding modelstext-embedding-3-small and text-embedding-3-large our newest and most performant embedding models are now available

Embedding 数据适合语义搜索、聚类、推荐和相似度比较。面试中应追问候选人如何选择 embedding 模型、维度、相似度算法、索引和评估方式，以及为什么切换 embedding 模型时需要重新生成文档向量和查询向量。

- 能解释 embedding 的语义空间和适用场景
- 能说明维度、相似度和索引取舍
- 能处理跨模型迁移和重建索引
- 能用 recall@k、MRR、延迟评估检索效果

## LLM 应用评估与回归测试
Competency: RAG 评估
Source: OpenAI Evals Guide
URL: https://platform.openai.com/docs/guides/evals
License/Usage: Official documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Responses Copy Page Responses Evaluations often called evals test model outputs to ensure they meet style and content

AI 应用上线前后都需要评估闭环。面试题应考察候选人如何构建 golden set、bad case、自动化 eval、人工 review、LLM judge 校准和 regression test，并能区分检索质量、生成质量、安全质量和业务指标。

- 能构建 golden set 和 bad case 集
- 能区分检索、生成、安全和业务指标
- 能说明 LLM judge 偏差和校准
- 能把线上反馈回流到回归评估

## Stateful Agent 工作流
Competency: Agent 工具调用
Source: LangGraph Overview
URL: https://docs.langchain.com/oss/javascript/langgraph/overview
License/Usage: Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Trusted by companies shaping the future of agents including Klarna Uber J P

企业级面试官 Agent 需要显式状态和可恢复流程。题目应考察候选人是否能设计 state、node、edge、conditional routing、checkpoint、message history、tool result、human-in-the-loop 和终止条件，而不是只写一个长 prompt。

- 能设计状态图和流程节点
- 能处理条件路由和中断恢复
- 能保存题目计划、消息和评分
- 能用 trace 调试多轮 Agent

## RAG 应用链路与组件
Competency: RAG 数据治理
Source: LangChain RAG Documentation
URL: https://docs.langchain.com/oss/javascript/langchain/rag
License/Usage: Product documentation; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: These applications use a technique known as Retrieval Augmented Generation or RAG

RAG 应用通常包含数据加载、文档切分、向量化、检索、上下文组织和生成。面试题应要求候选人说明 ingestion、retrieval、generation 和 evaluation 的边界，以及如何把 metadata、权限和更新策略纳入工程设计。

- 能拆分 RAG ingestion、retrieval 和 generation
- 能说明文档切分和 metadata
- 能结合权限和更新策略
- 能评估检索和生成质量

## Agent 简单优先与可控编排
Competency: Agent 工具调用
Source: Anthropic Building Effective Agents
URL: https://www.anthropic.com/engineering/building-effective-agents
License/Usage: Engineering article; store derived notes and short evidence snippets only. Link to source for attribution.
Evidence: Engineering at AnthropicBuilding effective agentsPublished Dec 19 2024We ve worked with dozens of teams building LLM agents across

Agent 不应为了复杂而复杂。面试中应考察候选人能否先用简单 workflow 解决问题，再在需要动态决策、工具调用和多步骤恢复时引入更复杂 Agent；同时要能说明工具边界、人工确认、失败恢复和观测。

- 能判断 workflow 和 autonomous agent 的边界
- 能解释工具调用适用场景
- 能设计失败恢复和人工确认
- 能保持流程可解释和可观测

## 企业级 RAG 设计与评估
Competency: RAG 评估
Source: Microsoft Azure RAG solution design and evaluation guide
URL: https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide
License/Usage: Microsoft Learn content; store derived notes with attribution. Check Microsoft Learn terms for redistribution limits.
Evidence: You can implement the orchestrator with tools or platforms like the Microsoft Agent Framework Semantic Kernel Azure AI

企业级 RAG 需要从数据质量、检索质量、生成质量、延迟、成本、安全和用户反馈多个维度评估。面试题应要求候选人设计评估集、质量指标、上线门槛、灰度、回滚和持续改进流程。

- 能设计端到端 RAG 评估体系
- 能区分质量、成本、延迟和安全指标
- 能设计上线门槛和回滚
- 能持续吸收线上反馈

## LLM 应用安全风险
Competency: AI 安全
Source: OWASP Top 10 for LLM and Gen AI Apps
URL: https://genai.owasp.org/llm-top-10/
License/Usage: OWASP community resource; store derived notes and attribution. Verify current OWASP license before redistribution.
Evidence: A Prompt Injection Vulnerability occurs when user prompts alter the Read More Sensitive information can affect both the

AI 应用要防范 prompt injection、敏感信息泄露、供应链风险、越权工具调用和不安全输出。面试中应重点追问候选人如何把用户输入、检索文档和工具结果视为不可信数据，并通过权限、沙箱、审计、红队和拒答策略降低风险。

- 能识别直接和间接 prompt injection
- 能设计工具权限和人工确认
- 能保护敏感信息和用户数据
- 能建立红队、安全日志和修复闭环

## AI 前端流式协议
Competency: AI 前端工程
Source: MDN Server-sent events
URL: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
License/Usage: MDN content is generally CC-BY-SA; store derived notes with attribution and verify current page license.
Evidence: Examples Simple SSE demo using PHP Specifications Specification HTML server-sent-events See also Tools Mercure a real-time communication protocol

AI 前端常用 streaming 降低首 token 等待并提升可感知进度。面试题应要求候选人比较 SSE、NDJSON 和 WebSocket，说明取消、重试、部分结果、错误恢复、幂等提交和 session 状态一致性。

- 能比较 SSE、NDJSON 和 WebSocket
- 能处理取消、重试和网络中断
- 能展示 partial response 和最终状态
- 能保证前后端 session 一致
