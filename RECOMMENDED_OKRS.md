# Hasiki 2026 Q2 推荐 OKR (一人公司版)

> **日期**: 2026-03-08
> **阶段**: Solo Founder → 产品市场验证 (PMF)
> **原则**: 一个人 + AI = 10人团队的产出

---

## OKR 1: 产品-市场验证 (Product-Market Fit)

**O1: 在三亚完成首批真实维修订单，证明AI诊断+派工模型可行**

| KR | 指标 | 目标 | 衡量方式 | 截止日 |
|---|---|---|---|---|
| KR1.1 | 完成付费维修订单数 | ≥ 10 单 | 系统 `orders` 表 `status='completed'` | 4月30日 |
| KR1.2 | AI诊断准确率 | ≥ 70% | 实验 E01: `diagnosisAccurate` 比率 | 4月30日 |
| KR1.3 | 客户满意度 | ≥ 4.0/5 | `record-repair` 中 `customerSatisfaction` 均值 | 4月30日 |
| KR1.4 | 客户推荐意愿 | ≥ 60% | `customerWouldRecommend = true` 比率 | 4月30日 |

---

## OKR 2: 数据护城河 (Data Moat)

**O2: 积累不可复制的三亚本地维修私有知识库**

| KR | 指标 | 目标 | 衡量方式 | 截止日 |
|---|---|---|---|---|
| KR2.1 | 私有知识条目 | ≥ 50 条 | `knowledge_entries` 表行数 | 5月31日 |
| KR2.2 | 材料价格观测 | ≥ 30 条 | `materialPriceObservations` 表行数 | 5月31日 |
| KR2.3 | BOM报价偏差率 | ≤ 15% | 实验 E02: AI预测 vs 实际价格 | 5月31日 |
| KR2.4 | 故障模式记录 | ≥ 20 条 | `failurePatterns` 表行数 | 5月31日 |

---

## OKR 3: 渠道验证 (Channel Validation)

**O3: 建立可复制的获客渠道，从0到1获取物业经理客户**

| KR | 指标 | 目标 | 衡量方式 | 截止日 |
|---|---|---|---|---|
| KR3.1 | 物业经理拜访 | ≥ 10 次 | `FIELD_INTERVIEW_PLAYBOOK` 完成记录 | 4月30日 |
| KR3.2 | 获得12345投诉数据 | ≥ 1 份 | 住建局黑榜名单到手 | 3月31日 |
| KR3.3 | 物业公司免费试用 | ≥ 3 家 | 签署试用协议/口头同意 | 5月15日 |
| KR3.4 | 第一个付费B2B合同 | ≥ 1 家 | 签署付费合同 | 5月31日 |

---

## OKR 4: 工程交付 (Engineering Delivery)

**O4: 保持生产级代码质量，系统稳定运行**

| KR | 指标 | 目标 | 衡量方式 | 截止日 |
|---|---|---|---|---|
| KR4.1 | CI/CD通过率 | ≥ 95% | GitHub Actions `ci.yml` 成功率 | 持续 |
| KR4.2 | 测试覆盖率 | Lines ≥ 60% | Vitest coverage report | 持续 |
| KR4.3 | API可用性 | ≥ 99% | Render 健康检查 + Sentry | 持续 |
| KR4.4 | 推理成本控制 | IVR < 0.01 | `inferenceValue.ts` 中间件日志 | 持续 |

---

## OKR 5: 运营效率 (Operational Efficiency)

**O5: 用AI替代传统团队职能，实现一人公司运作**

| KR | 指标 | 目标 | 衡量方式 | 截止日 |
|---|---|---|---|---|
| KR5.1 | AI代理覆盖率 | ≥ 6 个业务Agent | 系统中可用Agent数 | 已达成 ✅ |
| KR5.2 | 每单平均AI成本 | ≤ ¥0.10 | IVR追踪 `tokenCost` 均值 | 持续 |
| KR5.3 | 实验完成率 | ≥ 3/4 实验 | Field Experiment Tracker E01-E04 | 5月31日 |
| KR5.4 | WebIntel扫描频率 | ≥ 1次/周 | Web Intelligence Agent 扫描日志 | 持续 |

---

## 90天里程碑与 OKR 对齐

```
Sprint 1 (Day 1-30): 地基
├── OKR 3: KR3.1 拜访物业经理 ×5
├── OKR 3: KR3.2 获取12345数据
├── OKR 1: KR1.1 完成首单
└── OKR 2: 开始积累数据

Sprint 2 (Day 31-60): 验证
├── OKR 1: KR1.1 推进到 5-8 单
├── OKR 1: KR1.2 验证AI诊断准确率
├── OKR 2: KR2.2 材料价格 15+ 条
├── OKR 3: KR3.3 获得 2 家试用
└── OKR 5: KR5.3 完成实验 E01

Sprint 3 (Day 61-90): 增长
├── OKR 1: KR1.1 达到 10 单
├── OKR 2: KR2.1 知识库 30+ 条
├── OKR 3: KR3.4 签第一个付费合同
└── OKR 5: 所有Agent稳定运行
```

---

## 你 vs. AI 的 OKR 分工

| OKR | 你的部分(物理) | AI的部分(数字) |
|---|---|---|
| **OKR 1** PMF | 跑现场、交付维修、收集反馈 | AI诊断、自动派工、满意度追踪 |
| **OKR 2** 数据 | 记录材料价格、拍照、录入 | 价格Oracle校准、故障模式分析 |
| **OKR 3** 渠道 | 拜访物业经理、建立信任 | WebIntel扫描、投诉数据收割 |
| **OKR 4** 工程 | 报bug、提需求 | CI/CD、监控、代码迭代 |
| **OKR 5** 效率 | 验证AI输出是否靠谱 | 自动运行所有Agent |

---

## VC 演示指标 (Demo Day Metrics)

当你站在投资人面前，核心展示这5个数字:

```
1. "我们完成了 X 单付费维修" (PMF验证)
2. "AI诊断准确率 X%" (技术可行性)
3. "每单AI成本仅 ¥X" (IVR效率)
4. "私有知识库 X 条" (数据护城河)
5. "客户NPS X" (市场拉力)
```
