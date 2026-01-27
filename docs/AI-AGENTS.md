# 🤖 AI Agents 详细说明

本文档详细说明House Maint AI项目中使用的6个AI Agent及其配置方法。

---

## 概览

| AI Agent | 功能 | 工具 | 月成本 | 替代人力 |
|----------|------|------|--------|----------|
| 智能客服 | 24/7自动客服 | Claude 3.5 | ¥300-500 | 2名客服 |
| 内容创作 | 自动生成营销内容 | GPT-4 + Midjourney | ¥500 | 1名运营 |
| 数据分析 | 自动生成报表 | Claude | ¥200 | 1名分析师 |
| 代码助手 | AI辅助开发 | Cursor + Copilot | ¥300 | 0.5名工程师 |
| 匹配优化 | 智能算法优化 | GPT-4 API | ¥200 | 算法工程师 |
| 自动测试 | 生成&执行测试 | Playwright + GPT-4 | ¥100 | QA工程师 |

**总成本:** ¥1,600-2,100/月  
**总替代:** ~¥50,000/月人力成本  
**ROI:** 2400%+

---

## AI Agent #1: 智能客服

### 功能
- 24/7在线回答用户问题
- 多轮对话理解
- 情感识别与安抚
- 自动分类与转接

### 技术架构

```javascript
// server/services/ai-agents/customer-support.js
import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

export class AICustomerSupport {
  async handleQuery(userMessage, conversationHistory = []) {
    const systemPrompt = `
你是House Maint AI的客服助手。

知识库:
- 平台使用指南
- 常见问题FAQ
- 服务流程说明

规则:
1. 礼貌专业
2. 如果不确定，诚实告知并转人工
3. 优先给出解决方案
4. 收集用户满意度
    `;
    
    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ]
    });
    
    return response.content[0].text;
  }
  
  // 判断是否需要转人工
  shouldEscalate(message, aiResponse) {
    const escalationKeywords = ['投诉', '退款', '不满意', '经理'];
    return escalationKeywords.some(kw => message.includes(kw));
  }
}
```

### 使用方式

```javascript
// 在API路由中集成
import { AICustomerSupport } from './services/ai-agents/customer-support.js';

const aiSupport = new AICustomerSupport();

router.post('/api/support/chat', async (req, res) => {
  const { message, history } = req.body;
  
  const reply = await aiSupport.handleQuery(message, history);
  
  if (aiSupport.shouldEscalate(message, reply)) {
    // 通知人工介入
    await notifyHuman(message);
  }
  
  res.json({ reply, escalated: false });
});
```

### 配置

1. 获取Claude API Key: https://console.anthropic.com/
2. 添加到`.env`:
   ```bash
   CLAUDE_API_KEY=sk-ant-xxxxx
   ```

### 成本控制

- 使用缓存减少重复查询
- 设置每日配额上限
- 监控异常调用

---

## AI Agent #2: 内容创作引擎

### 功能
- 自动生成社交媒体内容
- SEO文章撰写
- 维修教程制作
- 图片自动生成

### 工具栈

1. **GPT-4**: 文案生成
2. **Midjourney**: 图片生成
3. **DALL-E 3**: 快速配图

### 实现

```javascript
// tools/content-generator.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class ContentGenerator {
  // 生成小红书种草文案
  async generateXiaohongshu(topic) {
    const prompt = `
写一篇小红书种草笔记:
主题: ${topic}
要求:
- 200-300字
- 口语化
- 包含emoji
- 结尾有互动话题
    `;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    });
    
    return response.choices[0].message.content;
  }
  
  // 生成配图
  async generateImage(description) {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: description,
      size: '1024x1024',
      quality: 'standard'
    });
    
    return response.data[0].url;
  }
  
  // 每日自动发布
  async dailyPost() {
    const topics = [
      '冬季暖气不热怎么办',
      '洗衣机异味去除小妙招',
      '家电安全使用指南'
    ];
    
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const content = await this.generateXiaohongshu(topic);
    const image = await this.generateImage(topic);
    
    return { content, image };
  }
}
```

### 定时任务

```javascript
// scripts/daily-content.js
import cron from 'node-cron';
import { ContentGenerator } from '../tools/content-generator.js';

const generator = new ContentGenerator();

// 每天早上9点自动生成并发布
cron.schedule('0 9 * * *', async () => {
  const { content, image } = await generator.dailyPost();
  
  // 发布到社交媒体
  await publishToXiaohongshu(content, image);
  await publishToWeibo(content, image);
  
  console.log('✅ Daily content published');
});
```

---

## AI Agent #3: 数据分析师

### 功能
- 每日报表自动生成
- 异常检测
- 趋势分析
- 优化建议

### 实现

```python
# scripts/ai-analyst.py
import anthropic
import pandas as pd
from database import fetch_metrics

client = anthropic.Anthropic(api_key=os.environ.get("CLAUDE_API_KEY"))

def generate_daily_report():
    # 获取数据
    metrics = fetch_metrics()
    
    prompt = f"""
    分析以下业务数据并生成报告:
    
    {metrics}
    
    请提供:
    1. 关键指标解读
    2. 异常情况分析
    3. 优化建议 (具体可执行)
    """
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return message.content[0].text

# 每日执行
if __name__ == "__main__":
    report = generate_daily_report()
    send_email(report)
```

---

## AI Agent #4: 代码助手

### 推荐工具: Cursor

1. **安装**: https://cursor.sh/
2. **订阅**: $20/月 (Pro版)
3. **配置**: 选择Claude 3.5 Sonnet

### 使用技巧

#### A. Chat驱动开发
```
You: 帮我实现一个AI客服功能,需要支持多轮对话

AI: [生成完整代码]

You: 添加情感识别功能

AI: [更新代码]
```

#### B. 代码审查
- 选中代码 → Cmd+K → "review this code"
- AI自动检查bug、性能问题、安全隐患

#### C. 测试生成
- 选中函数 → "generate tests for this"
- AI自动生成完整测试用例

### GitHub Copilot集成

```bash
# 安装
gh copilot install

# 使用
# 写注释,AI自动补全代码
```

---

## AI Agent #5: 智能匹配优化

### 功能
- 动态调整匹配权重
- 预测工人接单率
- 优化派单策略

### 实现

```javascript
// server/services/ai-agents/matcher-optimizer.js
import OpenAI from 'openai';

export class MatcherOptimizer {
  async optimizeWeights(historicalData) {
    const prompt = `
基于以下历史匹配数据优化权重:
${JSON.stringify(historicalData)}

当前权重:
- 距离: 0.3
- 评分: 0.4
- 技能: 0.3

目标: 提升匹配成功率和用户满意度

返回优化后的权重 (JSON格式)
    `;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
  
  // 预测接单概率
  async predictAcceptance(worker, report) {
    // 基于历史数据训练的AI模型
    const features = {
      distance: calculateDistance(worker, report),
      rating: worker.rating,
      previousOrders: worker.total_jobs,
      timeOfDay: new Date().getHours()
    };
    
    const prediction = await this.mlModel.predict(features);
    return prediction.probability;
  }
}
```

---

## AI Agent #6: 自动化测试员

### 功能
- 自动生成测试用例
- 执行回归测试
- 发现边界情况

### 实现

```javascript
// tests/ai-test-generator.js
import { test, expect } from '@playwright/test';
import OpenAI from 'openai';

const openai = new OpenAI();

async function generateTests(componentPath) {
  const code = fs.readFileSync(componentPath, 'utf8');
  
  const prompt = `
  为以下React组件生成Playwright E2E测试:
  
  ${code}
  
  要求:
  - 正常流程
  - 边界情况
  - 错误处理
  `;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  });
  
  // 提取测试代码
  const testCode = extractCode(response.choices[0].message.content);
  
  // 写入测试文件
  fs.writeFileSync(`${componentPath}.test.js`, testCode);
}

// 批量生成
const components = glob.sync('src/components/**/*.jsx');
for (const comp of components) {
  await generateTests(comp);
}
```

---

## 成本监控

### 实时成本追踪

```javascript
// tools/cost-monitor.js
export class CostMonitor {
  track(service, tokens, cost) {
    // 记录每次API调用
    db.insert('ai_costs', {
      service,
      tokens,
      cost,
      timestamp: new Date()
    });
  }
  
  // 每日成本报告
  async dailyReport() {
    const costs = await db.query(`
      SELECT service, SUM(cost) as total
      FROM ai_costs
      WHERE DATE(timestamp) = CURRENT_DATE
      GROUP BY service
    `);
    
    return costs;
  }
  
  // 预警
  async checkBudget() {
    const monthlyTotal = await this.getMonthlyTotal();
    if (monthlyTotal > 3000) {
      alert('AI成本超预算!');
    }
  }
}
```

---

## 最佳实践

### 1. Prompt Engineering

**好的Prompt:**
```
明确目标 + 提供上下文 + 指定格式

示例:
你是客服助手。用户说: "水管漏了"
背景: 用户可能不懂维修
目标: 先诊断问题,再推荐工人
格式: JSON {diagnosis, recommendation}
```

**避免:**
- 模糊指令
- 缺少边界条件
- 无输出格式

### 2. 缓存策略

```javascript
// 相似问题复用答案
const cache = new Map();

async function getCachedResponse(query) {
  const similar = findSimilar(query, cache.keys());
  if (similar && similarity > 0.9) {
    return cache.get(similar);
  }
  
  const response = await callAI(query);
  cache.set(query, response);
  return response;
}
```

### 3. A/B测试

```javascript
// 测试不同Prompt效果
const variants = {
  A: 'friendly tone',
  B: 'professional tone'
};

function getVariant(userId) {
  return userId % 2 === 0 ? 'A' : 'B';
}

// 追踪满意度
trackSatisfaction(variant, rating);
```

---

## 故障排查

### 常见问题

1. **API调用失败**
   - 检查APIKey
   - 验证网络连接
   - 查看配额限制

2. **成本过高**
   - 启用缓存
   - 减少max_tokens
   - 使用更便宜的模型

3. **响应质量差**
   - 优化Prompt
   - 增加示例
   - 调整温度参数

---

## 未来优化

1. **Fine-tuning自有模型**
2. **RAG知识库集成**
3. **多模态AI (图像+文字)**
4. **实时语音客服**

---

*文档版本: v1.0  
最后更新: 2026-01-26*
