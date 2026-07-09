# Duo Stage

结对英语陪练 MVP，基于 React + Vite，可部署到 Vercel。

## Local

```bash
npm install
npm run dev
```

## Deploy

```bash
vercel --prod
```

## Environment

文本模型走 `/api/text`。默认没有 key 时会返回 demo 兜底内容，保证流程可演示。生产环境建议在 Vercel Project Settings -> Environment Variables 里配置以下任一方案。

### Anthropic / Claude

```bash
TEXT_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

### 智谱 GLM

```bash
TEXT_PROVIDER=glm
GLM_API_KEY=...
GLM_MODEL=glm-4-flash
```

默认请求：

```text
https://open.bigmodel.cn/api/paas/v4/chat/completions
```

如需覆盖：

```bash
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

### 其它 OpenAI-compatible 文本模型

适用于兼容 `/chat/completions` 的模型服务。

```bash
TEXT_PROVIDER=openai-compatible
TEXT_API_KEY=...
TEXT_BASE_URL=https://example.com/v1
TEXT_MODEL=your-model-name
```

### 图片生成

当前产品在幕间生成下一幕时，会让文本模型产出 `imagePrompt`，然后调用 `/api/image`。如果没有配置图片模型，会自动降级为前端 SVG 场景卡。

智谱 CogView：

```bash
IMAGE_PROVIDER=glm
GLM_IMAGE_API_KEY=...
GLM_IMAGE_MODEL=cogview-3-flash
IMAGE_SIZE=1024x1024
```

如果图片和文本共用智谱 key，也可以只配置 `GLM_API_KEY`。

其它兼容 `/images/generations` 的图片模型：

```bash
IMAGE_PROVIDER=openai-compatible
IMAGE_API_KEY=...
IMAGE_BASE_URL=https://example.com/v1
IMAGE_MODEL=your-image-model
IMAGE_SIZE=1024x1024
```

### Optional

```bash
TEXT_MAX_TOKENS=1200
TEXT_TEMPERATURE=0.7
```
