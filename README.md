# AI Drama

## 把职场英语口语，变成一场双人剧本杀疯狂之夜

不是背单词，不是机械跟读，也不是假装真实的面试题库。

**AI Drama** 是给两位学习者的沉浸式职场英语口语产品：你们进入同一个房间，分别认领一名角色，在董事会、客户会、行业峰会、发布会后台等高压正式场景里，用英语谈判、试探、澄清、拒绝、说服，完成各自不知道对方底牌的隐藏任务。

每一局都是一场有倒计时、有秘密、有反转的职业 drama。你练到的不是“标准答案”，而是在真实工作和正式社交中把话说出去的反应力。

> 两个人，一间线上房间，一场越演越疯的职场英语剧本杀。

## 产品定位

**AI Drama = 职场英语口语陪练 × 双人剧本杀 × AI 动态导演。**

它服务于想提升工作场景与正式社交英语表达的学习者，特别适合希望练习以下能力的人：

- 在客户会、跨团队协作、项目危机里自然表达立场
- 在高压下委婉拒绝、谈判让步、追问事实、澄清风险
- 在行业峰会、商务晚宴、投资人沟通中破冰和建立信任
- 不靠背稿，也能在真实对话里持续说下去

默认剧本保持戏剧张力，但所有演绎场景都发生在真实职业语境中：行业峰会后的危机公关、董事会前夜的协议风险、发布会后台的产品事故等。

## 一局怎么玩

1. 两人用同一个房间码进入线上房间。
2. 选择一部约 25 分钟的职场 drama，并各自认领男女主角色。
3. 按自己的角色完成专属备课：不同的立场、表达包和开口自测。
4. 进入三幕舞台。第一幕自由演绎，后续剧情会根据真实对话继续推进。
5. 结束后揭开隐藏任务，获得 AI 复盘、表达反馈和复习内容。

## 当前能力

- 双人房间与共享实时状态
- 三幕式职场 drama，含时间压力、信息差和隐藏任务
- 男女双主角与角色专属备课路线
- P0 必用表达、升级句、地道搭配与开口自测
- 舞台字幕、P0 点亮、SOS 提词与幕间导演推进
- AI 生成自定义职场剧本和角色专属备课包
- 演后任务判定、复盘报告和个人复习本
- 支持 Claude、GLM 等兼容 OpenAI API 的文本模型
- 支持 GLM CogView 等图片生成，为幕间场景生成视觉卡片

## 本地运行

```bash
npm install
npm run dev
```

启动后打开终端显示的本地地址。生产构建：

```bash
npm run build
```

## 部署到 Vercel

仓库连接到 Vercel 后，每次推送 `main` 分支都会自动部署。

在 Vercel 项目的 **Settings -> Environment Variables** 中配置以下变量。所有密钥只应放在 Vercel 环境变量中，绝不要提交到 GitHub。

### 双人联机：Upstash Redis

```bash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
STORAGE_NAMESPACE=ai-drama
```

当前用 Upstash Redis REST 保存共享房间状态，适合两人自用与早期迭代。未配置时，应用会退回浏览器本地存储，仅适合单人演示，不能跨设备联机。

共享数据包括：

```text
room:{code}:meta
room:{code}:state
room:{code}:member:{userId}
room:{code}:lines:{sessionId}:{userId}
room:{code}:review
cscript:{id}
```

下列数据保留在各自浏览器本地：个人昵称、备课状态、复习本、上一次房间码和个人创建的剧本索引。

### 文本模型

文本模型负责 AI 共创剧本、幕间剧情、任务判定与演后复盘。未配置时，产品会使用 demo 兜底内容，保证基础流程可展示。

#### 智谱 GLM

```bash
TEXT_PROVIDER=glm
GLM_API_KEY=...
GLM_MODEL=glm-5.2
```

默认请求地址：

```text
https://open.bigmodel.cn/api/paas/v4/chat/completions
```

如需覆盖：

```bash
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

#### Anthropic / Claude

```bash
TEXT_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

#### 其他 OpenAI-compatible 模型

```bash
TEXT_PROVIDER=openai-compatible
TEXT_API_KEY=...
TEXT_BASE_URL=https://example.com/v1
TEXT_MODEL=your-model-name
```

### 图片生成

幕间时，文本模型会先生成 `imagePrompt`，再调用 `/api/image` 生成场景图。未配置图片模型时，应用会自动使用前端场景卡。

智谱 CogView 示例：

```bash
IMAGE_PROVIDER=glm
GLM_IMAGE_API_KEY=...
GLM_IMAGE_MODEL=cogview-3-flash
IMAGE_SIZE=1024x1024
```

图片和文本共用 GLM key 时，只配置 `GLM_API_KEY` 也可以。

其他兼容 `/images/generations` 的图片模型：

```bash
IMAGE_PROVIDER=openai-compatible
IMAGE_API_KEY=...
IMAGE_BASE_URL=https://example.com/v1
IMAGE_MODEL=your-image-model
IMAGE_SIZE=1024x1024
```

### 可选参数

```bash
TEXT_MAX_TOKENS=1200
TEXT_TEMPERATURE=0.7
```

## 技术栈

- React 18 + Vite
- Vercel Serverless Functions
- Upstash Redis REST
- 支持多模型的文本与图片生成接口

## 隐私与使用边界

这是一个早期双人私用版本。房间码只应分享给受信任的同伴；不要把真实公司机密、客户信息、未公开项目和个人敏感信息写进自定义剧本。使用真实经历共创时，产品提示词会建议改名和改背景，但用户仍应自行做好信息脱敏。

---

**AI Drama**：让每一次开口，都像你真的坐在那张关键会议桌前。
