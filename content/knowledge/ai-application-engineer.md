# AI 应用开发工程师面试题库

## RAG 系统设计
Competency: RAG 设计

候选人需要能解释知识库问答系统的数据摄取、清洗、切分、embedding、向量检索、混合检索、rerank、上下文压缩、引用和拒答策略。优秀回答会主动讲到评估集、召回率、groundedness、线上监控、用户反馈闭环和成本延迟。

- 能说明 chunking、metadata 和文档更新策略
- 能说明 embedding、向量库、BM25/hybrid search 和 rerank
- 能说明引用来源、拒答和幻觉控制
- 能说明离线评估和线上监控指标

## Agent 工具调用
Competency: Agent 工程

候选人需要理解 tool calling 的适用场景：实时数据、外部系统操作、多步骤任务、数据库查询和业务流程编排。需要知道 schema、参数校验、权限、沙箱、幂等、重试、人工确认和审计日志。

- 能判断何时需要工具调用而不是单纯聊天
- 能设计清晰的 tool schema 和参数校验
- 能说明权限隔离、沙箱、幂等和高风险动作确认
- 能说明状态编排、trace 和可观测性

## LLM 应用评估
Competency: 上线评估

候选人需要知道 AI 应用不能只看 demo 效果，还要建立 golden set、离线评测、人工验收、红队安全测试、业务指标、成本、延迟、监控、灰度和回滚策略。

- 能设计离线测试集和自动化 eval
- 能结合人工 review、红队和安全边界
- 能说明业务指标、延迟、成本、并发和缓存
- 能说明灰度发布、监控报警和回滚

## Prompt 与上下文工程
Competency: Prompt 工程

候选人需要能把系统角色、任务边界、输出格式、few-shot 示例、上下文裁剪和失败处理讲清楚。优秀回答会提到 prompt 版本管理、A/B 测试和 prompt injection 防护。

- 能区分 system/developer/user 指令
- 能设计结构化输出和错误恢复
- 能处理上下文窗口、压缩和优先级
- 能识别 prompt injection 和越权风险

## 生产问题排查
Competency: 问题排查

候选人需要能按链路排查不稳定和幻觉问题：复现样本、请求日志、模型版本、参数、prompt 模板、检索结果、rerank、工具调用、缓存、安全策略和回滚。

- 能收集复现样本和 trace 日志
- 能定位 prompt、RAG、模型参数和工具链路
- 能提出 guardrail、监控报警和灰度回滚
- 能把问题沉淀到 eval 数据集中

## AI 应用工程架构
Competency: 系统设计

候选人需要能把前端交互、后端 API、模型服务、RAG、数据库、队列、对象存储、观测系统、安全合规和部署运维串成完整架构。

- 能拆分前端、API、agent workflow、RAG 和数据层
- 能说明队列、异步任务、限流和缓存
- 能说明日志、trace、成本统计和质量看板
- 能说明隐私、权限、数据留存和合规
