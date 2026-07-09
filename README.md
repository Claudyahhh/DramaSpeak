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

可选环境变量：

- `ANTHROPIC_API_KEY`: 开启真实 Claude SOS、动态剧情和复盘。
- `ANTHROPIC_MODEL`: 覆盖默认模型。

未配置 `ANTHROPIC_API_KEY` 时，`/api/claude` 会返回 demo 兜底结果，保证核心流程可演示。
