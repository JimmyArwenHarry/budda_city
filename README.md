# 🐴 佛城风云：六巨头列传

一款基于 **Next.js + DeepSeek API** 的 10 回合文字 RPG 游戏。
你，一个无名小卒，踏入赛博玄幻的**佛城**，与马神🐴、骜魔🍔、喵神🐱、林魔🌲、狼魔🐺、帅神🤖六巨头周旋。
是骟、是夹、是当买办、还是掀翻六巨头？每一回合的选择，都由 AI 实时生成剧情与结局。

> 世界观浓缩自《佛城六巨头列传》。阴毛=阴谋，猪球=足球——懂的都懂。

---

## ✨ 功能特性

- **开局选风格**：武侠⚔️ / 玄幻🐉 / 科幻🚀 / 商战💼 / 校园🎒 / 末世🧟 六种剧情风格，剧情、结局、战记总结与成就全程贴合所选风格
- **✍️ 测字结缘**：开局写下一个字，系统按笔画、五行、字义与意境为你匹配一位命定巨头，成为你遇到的第一位巨头并贯穿全剧
- **10 回合回合制**：顶部回合指示器 + 流光进度条（`Turn 3/10`）
- **AI 实时剧情**：每回合调用 DeepSeek 生成 100~200 字剧情 + 3 个恶搞选项
- **打字机效果**：剧情逐字浮现，点击剧情卡片可跳过
- **终局三段式**：第 9 回合大高潮 → 第 10 回合结算命运 → 生成约 800 字《佛城战记》剧情总结
- **按总结颁发成就**：基于战记总结，AI 为你的整局表现颁发 3 个专属成就（带 emoji 与恶搞称号）
- **一键分享**：复制战记总结 + 成就文本（手机优先走原生分享，可发微信/朋友圈）
- **移动端优先**：微信读书式排版，按钮高度 ≥ 48px，深色赛博玄幻风格（荧光绿 + 赛博蓝）
- **幽默 Loading**：*"正在遭遇马魔的阴毛…"* 等 9 条随机加载语
- **Markdown 渲染**：剧情文本支持 `**加粗**`、`*斜体*`、列表、引用等
- **容错重试**：模型输出"正文 + * 选项"结构化文本，服务端容错解析（JSON / 选项列表 / 整段正文），失败自动重试

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 DeepSeek API Key

# 3. 本地开发
npm run dev
# 打开 http://localhost:3000

# 4. 生产构建
npm run build && npm start
```

## 🔑 环境变量

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（**必填**） | `sk-xxxx` |
| `DEEPSEEK_MODEL` | 模型名（可选） | `deepseek-v4-flash` |

> 🔒 **安全说明**：API Key 由服务端代理路由（`app/api/chat/route.ts`）读取，
> **不会被打包进浏览器端代码**。变量名不带 `NEXT_PUBLIC_` 前缀，
> 不会被 Next.js 内联进前端 bundle，前端拿不到真实 Key。

## 🌍 部署（免费）

### Vercel（推荐，一键）
1. 把项目推到 GitHub/GitLab
2. 在 [vercel.com/new](https://vercel.com/new) 导入仓库
3. 在项目设置 → Environment Variables 中填入：
   - `DEEPSEEK_API_KEY`
   - `DEEPSEEK_MODEL`（可选）
4. Deploy 即可，自动识别 Next.js，开箱即用

### Netlify
1. 推送仓库后在 [app.netlify.com](https://app.netlify.com) 导入
2. Build command: `npm run build`，Publish directory: `.next`
3. 同样配置上述环境变量
4. 若超时，可在 `netlify.toml` 中调大函数超时时间

## 🗂 项目结构

```
budda_city/
├── app/
│   ├── api/chat/route.ts         # DeepSeek 剧情代理（读环境变量、JSON 容错、重试）
│   ├── api/summary/route.ts      # 约 800 字《佛城战记》总结接口
│   ├── api/achievements/route.ts # 按总结颁发成就接口
│   ├── layout.tsx                # 根布局（暗色赛博主题、移动端 viewport）
│   ├── page.tsx                  # 入口页
│   └── globals.css               # Tailwind v4 主题、霓虹动画、Markdown 样式
├── components/
│   ├── Game.tsx                  # 回合状态机（核心逻辑）
│   ├── Typewriter.tsx            # 打字机组件
│   ├── Markdown.tsx              # Markdown 渲染
│   ├── TurnIndicator.tsx         # 回合指示器 + 进度条
│   ├── Loading.tsx               # 幽默加载动画
│   ├── StartScreen.tsx           # 开始页
│   └── EndingView.tsx            # 结局页 + 战记总结 + 成就 + 分享
├── lib/
│   ├── system-prompt.ts          # GM 系统提示词（浓缩六巨头列传世界观）
│   ├── deepseek.ts               # DeepSeek API 封装（剧情/总结/成就 + 重试）
│   └── types.ts                  # 类型定义
└── .env.example                  # 环境变量示例
```

## 🎮 玩法

1. 开局先选择一种**剧情风格**（武侠/玄幻/科幻/商战/校园/末世）
2. 进入**测字环节**，写下一个字，系统匹配一位命定的巨头作为你遇到的第一位巨头
3. 点击 **踏入佛城 ▶** 开始，每回合阅读 AI 生成的剧情，选择 3 个选项之一
4. 你的选择会写入对话历史，影响后续剧情与结局走向
5. **第 9 回合**进入六巨头大混战高潮
6. **第 10 回合**结算你的最终命运
7. AI 接着根据完整剧情生成约 800 字《佛城战记》总结
8. 再根据战记总结为你颁发 3 个专属成就
9. 复制战记与成就分享给朋友，或重新开始

## 🧠 技术要点

- **三段式终局**：`/api/chat`（剧情）→ `/api/summary`（约 800 字总结）→ `/api/achievements`（按总结发成就）
- **不用 `response_format: json_object`（关键）**：实测 `deepseek-v4-flash` 在该模式下于长上下文会以
  ~17%~100% 的概率返回"纯空白"（finish=stop、几十到上百个空格 token），且随服务端波动剧烈。
  因此改为**结构化正文契约**：剧情回合要求模型"先写剧情正文，再用 `*` 开头逐行列出 3 个选项"；
  服务端容错解析（优先 JSON，其次正文+选项列表，最后整段当正文），总结/成就同理。实测从不空白
- **三段各自可靠**：剧情每回合 ~0 失败；总结直接输出正文（≥700 字）；成就按 `emoji | title | desc` 行格式解析
- **消息以 USER 收尾**：`deepseek-v4-flash` 在 `thinking:disabled` 下若以 system 消息收尾会返回空白
- **速度优化**：调用 DeepSeek 时使用 `thinking: {type: "disabled"}` 关闭思考模式，
  单回合生成约 3~6 秒；`deepseek-v4-flash` 默认思考模式曾导致超时与空响应
- **零额外依赖**：仅 react-markdown 用于剧情 Markdown 渲染，其余纯原生实现

## 🖋 自定义

想调整剧情风格或世界观？直接编辑 `lib/system-prompt.ts`。
想换模型？改环境变量 `DEEPSEEK_MODEL`。
