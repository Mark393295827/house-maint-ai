# House Maint AI 项目系统性差异化与架构一致性审计报告

## 1. 审计结论

图片中的架构图与当前项目代码 **中高一致，但不是完全一致**。更准确的定位是：

- 图片是 `2.0 目标架构 / 商业化展示图`。
- 当前代码是 `可运行 MVP + 多个生产化基础件 + 部分静态演示控制台`。
- 核心技术栈、P0/P1 Agent、Redis/DB/Sentry/Mixpanel/S3/Socket.io 等基础件基本存在。
- 主要差距集中在：微信小程序端不完整、企业后台动态化不足、支付链路口径不一致、自动诊断到规划再派工的后台链路断开、PIPL 脱敏为 mock、数据库 schema 来源不统一。

综合一致性评分：**72 / 100**

| 维度 | 一致性 | 判断 |
|---|---:|---|
| 技术栈 | 90% | React 19 / Tailwind v4 / Vite 7 / Express / TS / tsx 基本一致 |
| 客户端三端 | 65% | React Web 端完整，小程序目录很浅，企业端部分静态 |
| Access Layer | 70% | Express、JWT、限流、Vite proxy 存在；Nginx/Render 口径部分一致 |
| AI Agent Matrix | 78% | P0、S1-S3、Research Swarm 有实现；后台编排链路有断点 |
| Core Services | 62% | AI、Research、WorkerMatch 存在；Executive 和 Payment 未完整闭环 |
| Data & Infra | 70% | SQLite/PostgreSQL/Redis/S3/Mixpanel/Sentry 存在；schema 有漂移 |
| Realtime/Monitoring | 75% | Socket.io、Sentry、Mixpanel 都有，但部分生产接入未完全启用 |
| Deploy | 60% | Render/GitHub Actions/Docker/Nginx 有，但和图中 load balancer 表达不完全一致 |

## 2. 图片目标架构拆解

图片定义的系统分层如下：

| 图中层级 | 图中目标能力 |
|---|---|
| Clients Layer | Homeowner App、Worker App、Enterprise Dashboard |
| Access Layer | Nginx/Render、Express Gateway、JWT Auth、Rate Limiting、PIPL Blur、Sentry、Vite Dev Server proxy |
| AI Agent Matrix | DiagnosisAgent、PlanningAgent、MaterialAgent S1、FaultAgent S2、TurnoverAgent S3、CFO/COO/DataMiner/SocialObserver/Simulator |
| Core Services | AIService、ExecutiveService、ResearchOrchestrator、WorkerMatchService、PaymentService |
| Data & Infrastructure | PostgreSQL/SQLite、Redis、Mixpanel、Sentry、AWS S3 |
| Tech Stack | React 19、Tailwind v4、Vite 7、Express、TypeScript、tsx、Gemini 1.5 Flash、DeepSeek R1、Socket.io、Drizzle |

## 3. 逐层一致性审计

### 3.1 技术栈

判定：**基本一致**

证据：

- 前端依赖包含 React 19、Tailwind v4、Vite 7、Sentry、Mixpanel、Socket.io、Stripe、AWS S3 SDK、Drizzle：`package.json`。
- 后端依赖包含 Express、TypeScript/tsx、Gemini SDK、Sentry Node、ioredis、Mixpanel、PostgreSQL、multer-s3：`server/package.json`。
- Vite dev proxy 指向 `http://localhost:3001`，与图片中的 `Vite Dev Server proxy to :3001` 一致：`vite.config.ts`。

差异：

- 图片写的是 `Express Gateway`，当前不是独立 API Gateway 产品，而是 Express app + middleware + `/api/v1` router。
- 图片写 `Stripe integration`，当前代码实际支付主线更偏 WeChat Pay mock，本层存在口径冲突。

### 3.2 Clients Layer

判定：**部分一致**

实际情况：

- Homeowner/用户端：React 路由包含 `/diagnosis`、`/cases`、`/library`、`/calendar`、`/profile`、`/assets` 等。
- Worker/师傅端：React 路由包含 `/worker/dashboard`、`/worker/job/:id`、`/worker/match`、`/worker/register`、`/workers`。
- Enterprise Dashboard：React 路由包含 `/enterprise/*` 和 `/enterpriseUI/*`，并加载 `EnterpriseDashboard`。

差异：

- `miniprogram/` 只有 `app.json`、`project.config.json` 和页面 JSON，没有完整 WXML/JS/WXSS 业务页面。它不能证明“100% WeChat Mini Program”已经落地。
- 企业后台的 Agent 状态、4D 分数、策略告警主要是 `useState` 静态数据；只有 Research Swarm 按钮真实调用 `/ai/research-market`。
- 企业地图显示 Sanya mock workers，并用 interval 做位置漂移，不是实时 worker 数据流。

### 3.3 Access Layer

判定：**部分一致**

已实现：

- Express server 监听 `3001`，挂载 `/api/v1`。
- 使用 `helmet`、`hpp`、`csrfGuard`、standard limiter、user limiter。
- AI 路由使用 `strictLimiter`。
- JWT 鉴权和 Socket.io token 验证存在。
- Vite proxy 存在。

差异：

- `nginx.conf` 只服务静态前端和 SPA fallback，没有 `/api` 的 `proxy_pass`，因此不是图中意义上的 Nginx API load balancer。
- Render 部署存在于 GitHub Action `deploy-backend.yml`，但前端另有 GitHub Pages 部署；图中没有表达这一分离。
- Sentry server integration 在 `server/index.ts` 中有注释掉的 `Sentry.setupExpressErrorHandler(app)`，不是完整 Express Sentry handler 状态。
- PIPL blur middleware 是 mock：代码把原 image 原样赋回 `req.body.image`，只模拟“已脱敏”。

### 3.4 AI Agent Matrix

判定：**核心类存在，但自动编排链路部分断开**

已实现：

- `DiagnosisAgent` 使用 Gemini 1.5 Flash。
- `PlanningAgent` 使用 DeepSeek `deepseek-reasoner`，无 key 时有 mock fallback。
- `MaterialAgent S1`、`FaultAgent S2`、`TurnoverAgent S3` 都有独立类和 API endpoint。
- Research Swarm 包含 `DataMinerAgent`、`SocialObserverAgent`、`SimulatorAgent` 和 `ResearchOrchestrator`，并用 `Promise.all` 并行运行，再生成 Go/No-Go。

关键差异：

- `server/worker.ts` 只启动 `diagnosticsClaw` 和 `vendorClaw`，没有启动 `planningClaw`。
- `DiagnosticsClaw` 完成后把 report 状态设为 `matching`。
- `PlanningClaw` 监听的是 `status = 'analyzed'`，因此自动诊断结果不会自然进入规划阶段。
- 结果是：图片中的 `DiagnosisAgent -> PlanningAgent -> WorkerMatchService` 后台自动链路，在当前 worker 进程里并不完整。
- Planning 仍可通过 `/api/v1/reports/:id/plan` 手动调用，但这不是图片表达的全自动 Agent Matrix。

测试状态：

- 已运行相关测试：`tests/diagnostics_claw.test.ts`、`tests/vendor_claw.test.ts`、`tests/ai_planning.test.ts`、`server/tests/ai.test.ts`。
- 结果：4 个测试文件、8 个测试全部通过。
- 解释：测试证明局部 Agent/API 能工作，但不覆盖 `worker.ts` 未启动 PlanningClaw 和状态链路不一致的问题。

### 3.5 Core Services

判定：**部分一致**

| 图中服务 | 当前项目状态 | 结论 |
|---|---|---|
| AIService facade | `server/services/ai.ts` 统一代理 Diagnosis/Planning/S1/S2/S3/Research | 一致 |
| ExecutiveService | `server/services/executive.ts` 有 CFO/COO 规则 | 代码存在，但 UI/API 未完整接入 |
| ResearchOrchestrator | `server/agents/research/swarm.ts` 有 3-agent cross-validation | 一致 |
| WorkerMatchService | `server/services/matching.ts` 有 skill/rating/geo/speed 评分 | 一致 |
| PaymentService | 后端是 WeChat Pay JSAPI mock，前端仍按 Stripe checkout URL 预期 | 不一致 |

PaymentService 是最大产品口径差异：

- 图片写 `Stripe integration`。
- README/PRD 写的是 WeChat Pay / escrow。
- 后端 `/payments/checkout` 返回 WeChat JSAPI 参数。
- 前端 `PaymentCheckout` 调用 `createCheckoutSession` 并期望 `{ id, url }`，随后 `window.location.href = url`。
- 当前支付前后端协议不一致，商业化闭环风险高。

### 3.6 Data & Infrastructure

判定：**基础件存在，但 schema 统一性不足**

已实现：

- SQLite fallback 与 PostgreSQL pool 双路径。
- SQLite 初始化会加载 `schema.sql` 和 `blackboard.sql`。
- Redis 有真实连接和 In-Memory mock fallback。
- S3 上传支持 AWS/R2/MinIO 配置，缺配置时 fallback 到本地磁盘。
- Mixpanel 前端和后端 AI usage tracking 都有接入点。
- Sentry 前端初始化、worker 初始化存在。

差异：

- `server/models/schema.sql`、`server/models/schema.pg.sql`、`server/db/schema.ts`、`server/scripts/init-db.ts`、补丁脚本之间字段不完全一致。
- PostgreSQL schema 比 SQLite schema 更旧，status enum 缺 `broadcasted`、`failed_analysis`、`flagged_for_review`、`analyzed`、`planned` 等状态。
- 关键 report 字段如 `diagnosis_result`、`issue_type`、`resolution_plan`、`priority_protocol` 依赖 init/patch 脚本补齐，而不是统一 migration 体系。
- 图中没有表达 schema/migration 风险，但它是生产化的核心隐患。

## 4. 系统性差异化资产

### 已经较强的差异化

1. **多 Agent 维修决策矩阵**
   - 不是单一聊天机器人，而是 Diagnosis、Planning、Material、Fault、Turnover、Research、Executive 的分工模型。
   - 对比普通本地维修平台，差异点在“报修前置结构化”和“派工前置推理”。

2. **三亚本地化知识嵌入**
   - MaterialAgent 明确使用三亚价格和盐雾腐蚀逻辑。
   - FaultAgent 明确引入三亚湿度、盐雾、台风和民法典租赁责任判断。
   - TurnoverAgent 明确切入三亚度假短租交接。

3. **工单到师傅匹配闭环**
   - Report、Worker、Match、Review、Order、Notification、Message、Socket.io 这些对象已经形成基础工作流。
   - WorkerMatchService 的 skill/rating/geo/speed 评分已经超过静态列表展示。

4. **数据飞轮雏形**
   - Completed report 可以进入 learning loop，沉淀 repair pattern。
   - AI usage logs、feedback、reviews、first_time_fix 等字段支持后续模型与履约质量闭环。

### 仍偏概念或半落地的差异化

1. **WeChat-native moat**
   - PRD/README 非常强，但小程序代码不完整。
   - 登录和支付有 WeChat 路由/接口，但业务端还不是完整微信原生体验。

2. **Enterprise Digital Twin**
   - 企业控制台视觉上很接近图片，但 Agent 状态、地图节点、4D 分数、策略告警大量是静态或 mock。
   - 它目前更像 demo dashboard，而不是真实 mission control。

3. **Executive Agent**
   - CFO/COO 规则写得较完整，但没有形成稳定 API 和前端绑定。
   - 目前无法证明“策略告警实时驱动运营动作”。

4. **PIPL compliance moat**
   - 有 middleware 和失败策略表达，但真实人脸/隐私区域脱敏未实现。
   - 如果用于商业化材料，应标注为 `PIPL-ready architecture`，不是 `PIPL production anonymization`。

## 5. 与图片不一致的主要风险

| 风险 | 严重度 | 说明 |
|---|---:|---|
| 支付口径冲突 | 高 | 图写 Stripe，战略文档写 WeChat Pay，后端返回 JSAPI，前端期望 URL |
| PlanningClaw 未纳入 worker | 高 | 自动诊断后直接进入 matching，跳过 PlanningAgent 后台规划 |
| report 状态机漂移 | 高 | diagnostics 设置 `matching`，planning 监听 `analyzed`，schema 状态枚举不统一 |
| 企业后台静态数据过多 | 中高 | 图中 mission control 看似实时，但当前多处为 useState/mock |
| 小程序端不完整 | 中高 | 与 WeChat Native 定位冲突 |
| PIPL blur mock | 中高 | 商业化合规表述需谨慎 |
| Nginx/API 部署图不精确 | 中 | Nginx 不是 API 反代/load balancer |
| PostgreSQL schema 旧 | 中 | 生产使用 PostgreSQL 时可能缺字段/状态 |

## 6. 修正优先级

### P0：必须先对齐，否则图片会过度承诺

1. **统一支付战略**
   - 选择 A：把图中 `Stripe integration` 改成 `WeChat Pay JSAPI + Escrow`，并修正前端 `PaymentCheckout`。
   - 选择 B：保留 Stripe，则实现真实 Stripe checkout session，并把 WeChat Pay 标为 China roadmap。
   - 当前更符合项目定位的是选择 A。

2. **修复 Agent 自动链路**
   - 在 `server/worker.ts` 启动 `planningClaw`。
   - 统一状态链：`pending -> analyzed -> planned -> matching -> matched/broadcasted -> in_progress -> completed`。
   - 或者明确设计为 `diagnosis -> matching`，把图片中的 PlanningAgent 改成按需服务。

3. **企业后台接入真实后端**
   - 增加 `/api/v1/executive/dashboard`，返回 `executiveAgentService.generateExecutiveDashboard()`。
   - Agent cards 从 `ai_usage_logs` / metrics 读取真实调用、成本、状态。
   - 地图节点从 workers/report active jobs 读取，而不是 mockWorkers。

4. **统一数据库 schema/migration**
   - 以 Drizzle migration 或 SQL migration 为唯一事实源。
   - 更新 PostgreSQL schema，补齐 SQLite 当前使用字段。
   - 把状态机 enum 与业务流程一起固定。

5. **PIPL 真实脱敏**
   - 将 `piplBlur.ts` 从 mock 改成真实图像处理服务或可验证 SDK。
   - 记录脱敏前后 audit metadata，但不要保存原始敏感图像。

### P1：增强商业化可信度

1. 补齐微信小程序页面和登录/支付/报修端到端流程。
2. 接入 WeChat Official Account / 小程序订阅消息给师傅推送。
3. Nginx 增加 `/api` proxy 或把图改成当前 GitHub Pages + Render 分离部署。
4. Sentry Express handler 启用并验证 error tracing。
5. Research Swarm 增加真实数据源接口，否则 DataMiner/SocialObserver 更像 prompt simulation。

## 7. 建议修改架构图

如果图片用于对外展示，建议改成以下口径，避免投资人或技术审查时被问穿：

1. `PaymentService: Stripe integration` 改为 `PaymentService: WeChat Pay primary / Stripe legacy optional`。
2. 在 AI Agent Matrix 旁加 `Background Worker Process`，明确 Diagnostics/Planning/Vendor claw 的状态机。
3. Enterprise Dashboard 标注 `Live where wired / Demo where mocked`，或尽快接真实 metrics。
4. Access Layer 中 `Nginx / Render load balancer` 改为 `Render backend + GitHub Pages frontend + Docker Nginx static gateway`，除非补上 Nginx API 反代。
5. PIPL Blur 标注 `mock in current code; production anonymizer required`，或直接实现真实 blur 后再对外声明。
6. Data Layer 增加 `Migrations / Schema Governance`，因为当前 schema drift 是系统性风险。

## 8. 最终判断

当前项目已经具备一个可讲通的系统性差异化骨架：**AI 诊断、三亚本地化、师傅匹配、Research Swarm、CFO/COO 规则、数据飞轮、实时通知基础件** 都不是空白。

但如果严格按图片审核，图片仍比代码领先一个阶段。最重要的差距不是“有没有 Agent 类”，而是 **Agent 编排、支付闭环、企业实时数据、微信原生端、合规脱敏和 schema 治理** 还没有完全产品化。

对外表述建议：

> House Maint AI 当前已实现核心多 Agent 维修平台 MVP，并具备商业化架构雏形；2.0 架构图应被定义为目标系统架构，其中 AI Agent 与基础设施大部分已落地，微信原生端、支付托管、企业实时控制台和生产合规仍需 P0 加固。

