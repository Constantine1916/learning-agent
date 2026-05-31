# Learning Agent

Learning Agent 是一个真实的 AI 应用开发工程师面试官 Agent。它从简历和自我介绍开始，基于 AI 应用工程师知识题库 RAG 动态提问，并用结构化评分系统给出每题反馈和最终通过结果。

综合得分达到 `80` 分及以上视为通过。

## 技术栈

- Next.js App Router
- LangGraph JS
- OpenAI
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

启动本地 pgvector：

```bash
docker compose up -d
npm run db:migrate
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

> 如果没有配置 `OPENAI_API_KEY` 或 `DATABASE_URL`，应用会使用开发 fallback，方便本地 UI 和测试跑通。真实面试效果需要配置 OpenAI key，并启动 pgvector。

## 环境变量

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.aicave.cn/v1
OPENAI_MODEL=gpt-5.4-mini
OPENAI_EMBEDDING_MODEL=local-hash
DATABASE_URL=postgres://learning_agent:learning_agent@127.0.0.1:5432/learning_agent
```

## 题库

默认题库在：

```bash
content/knowledge/ai-application-engineer.md
```

更新题库后执行：

```bash
npm run ingest:knowledge
```

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
