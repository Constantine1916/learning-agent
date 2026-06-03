# Learning Agent

Learning Agent 是一个真实的 AI 应用开发工程师面试官 Agent。它从简历和自我介绍开始，基于 AI 应用工程师知识题库 RAG 动态提问，并用结构化评分系统给出每题反馈和最终通过结果。

综合得分达到 `80` 分及以上视为通过。

## 技术栈

- Next.js App Router
- LangGraph JS
- OpenAI
- Ollama 本地 embedding
- Postgres + pgvector
- Drizzle ORM
- PDF / DOCX 简历解析

## 当前能力

- 上传 PDF / `.docx` 简历并抽取结构化候选人画像
- 要求候选人自我介绍，并结合简历生成面试策略
- 使用 LangGraph 编排面试流程
- 从 AI 应用工程师知识题库检索 RAG 上下文
- 动态生成面试问题、追问方向和评分 rubric
- 每轮回答后输出结构化评分
- 面试结束后生成总分、通过状态、优势、短板和学习建议

## 本地启动

复制环境变量示例：

```bash
cp .env.example .env.local
```

安装并启动本地 embedding 服务：

```bash
brew install ollama
brew services start ollama
ollama pull qwen3-embedding:4b
```

本地默认使用 `qwen3-embedding:4b`，并通过 MRL 输出 `1536` 维向量。这样比 0.6B 模型更适合中文 RAG 质量，同时避开 pgvector HNSW 对高维向量索引的限制，也方便后续在 VPS 上切换到同为 1536 维的 API embedding。

启动本地 Postgres + pgvector 后，初始化数据库并导入题库：

```bash
set -a
source .env.local
set +a
psql "$DATABASE_URL" -f drizzle/0000_init.sql
psql "$DATABASE_URL" -f drizzle/0002_embedding_ollama_4b_1536.sql
npm run ingest:knowledge
```

启动应用：

```bash
npm install
npm run dev
```

默认地址：

```bash
http://127.0.0.1:5173
```

> 当前默认使用 Ollama 本地 embedding，不再使用 `local-hash` 向量兜底。真实面试对话仍需要配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `OPENAI_MODEL`。

## 环境变量

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.aicave.cn/v1
OPENAI_MODEL=gpt-5.4-mini
OPENAI_TIMEOUT_MS=60000

EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_EMBEDDING_MODEL=qwen3-embedding:4b
EMBEDDING_DIMENSIONS=1536
RAG_LEXICAL_FALLBACK=false

DATABASE_URL=postgres://learning_agent:learning_agent@127.0.0.1:5432/learning_agent
```

如果部署到 VPS 后不想运行本地 embedding 模型，可以切换为 API embedding，但必须同步重建 pgvector 列维度并重新导入题库：

```bash
EMBEDDING_PROVIDER=openai
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

## 企业级面试题库

AI 应用开发工程师的第一版企业级题库资产包在：

```bash
content/interview-bank/ai-application-engineer/
```

目录结构：

```bash
role.json                 # 岗位定义、轮次、通过线、选题策略
competencies.json         # 能力模型和权重
questions.json            # 结构化主问题、追问策略、期望信号
rubrics.json              # 企业级评分 rubric
calibration-samples.json  # 高/中/低分校准样本
sources.json              # 公开资料来源和使用说明
knowledge.md              # RAG 参考知识库
```

更新 `knowledge.md` 后执行：

```bash
npm run ingest:knowledge
```

结构化题库 JSON 会在面试流程中由 `lib/interview-bank` 直接读取；`knowledge.md` 会被切成 `knowledge_chunks` 并写入 pgvector，作为 Agent 出题和评分时的 RAG 背景知识。

## API

- `POST /api/resumes/upload`
- `POST /api/interviews`
- `POST /api/interviews/:id/self-introduction`
- `POST /api/interviews/:id/messages`
- `GET /api/interviews/:id/report`

## 检查命令

```bash
npm run lint
npm run build
npm test
```

## 迁移说明

当前项目不实现登录注册，使用 `dev-user` 占位。后续迁移到 `aicave.cn` 时，可以替换 `lib/auth.ts` 里的 `getCurrentUser()` 来接入已有用户体系。

## 安全说明

不要提交 `.env`、`.env.local` 或任何 API key。OpenAI key 和数据库连接只应配置在本地环境变量或部署平台密钥管理中。
