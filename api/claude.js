const fallback = (prompt = "") => {
  if (prompt.includes('"concepts"') || prompt.includes("Give exactly 3 distinct story concepts")) {
    return JSON.stringify({
      concepts: [
        {
          title: "临门一脚",
          tagline: "发布前夜，承诺突然变重了",
          conflict: "守约与保质量只能先选一个",
          roles: [
            { name: "Alex", title: "产品负责人" },
            { name: "Jordan", title: "技术负责人" },
          ],
        },
        {
          title: "错位邀约",
          tagline: "一场咖啡约会藏着两个目的",
          conflict: "叙旧的人想要一次引荐",
          roles: [
            { name: "Casey", title: "前同事" },
            { name: "Morgan", title: "创业者" },
          ],
        },
        {
          title: "周五试点",
          tagline: "四天工作制先从谁开始",
          conflict: "理想制度撞上客户响应",
          roles: [
            { name: "Sam", title: "支持方" },
            { name: "Riley", title: "质疑方" },
          ],
        },
      ],
    });
  }

  if (prompt.includes('"p0shared"') || prompt.includes("Build the expression pack")) {
    return JSON.stringify({
      p0shared: [
        { en: "Let's take a step back.", zh: "退一步看" },
        { en: "From my perspective, ...", zh: "从我的角度看" },
        { en: "What's the trade-off here?", zh: "这里的取舍是什么" },
        { en: "Can we align on the next step?", zh: "确认下一步" },
        { en: "That's a fair point.", zh: "承认对方有道理" },
      ],
      roleP0: {
        A: [
          { en: "Help me understand the blocker.", zh: "引导对方解释阻碍" },
          { en: "What would it take to move forward?", zh: "追问推进条件" },
        ],
        B: [
          { en: "Realistically speaking, ...", zh: "现实一点说" },
          { en: "I have some reservations about ...", zh: "委婉保留意见" },
        ],
      },
      p1: [
        { from: "I think it is hard.", to: "I have some reservations about this.", zh: "更委婉专业" },
        { from: "We cannot do it.", to: "That timeline isn't realistic.", zh: "拒绝但不粗暴" },
        { from: "Maybe.", to: "That could work under certain conditions.", zh: "有条件让步" },
        { from: "I agree.", to: "That's a fair point — let's build on it.", zh: "同意并推进" },
      ],
      p2: [
        { en: "meet halfway", zh: "各让一步" },
        { en: "push back on", zh: "提出异议" },
        { en: "for the sake of argument", zh: "姑且假设" },
        { en: "common ground", zh: "共同基础" },
        { en: "circle back", zh: "回头再谈" },
      ],
      p3: [
        { en: "Let's not boil the ocean.", zh: "别把摊子铺太大" },
        { en: "The burden of proof is on the proposal.", zh: "举证责任在提案方" },
        { en: "Let's steelman the other side.", zh: "先强化对方论点" },
      ],
      quiz: [
        {
          situation: "委婉表达你觉得时间线不现实。",
          reference: "I have some reservations about the timeline.",
          tip: "reservations 比 impossible 柔和。",
        },
        {
          situation: "想把对话拉回共同目标。",
          reference: "Let's take a step back and look at what we're both trying to protect.",
          tip: "先降温，再找共同利益。",
        },
        {
          situation: "承认对方说得有道理。",
          reference: "That's a fair point — let's build on it.",
          tip: "先接住，再推进。",
        },
        {
          situation: "追问推进条件。",
          reference: "What would it take to move forward?",
          tip: "把争论转成条件讨论。",
        },
      ],
    });
  }

  if (prompt.includes('"title":"中文剧名"') || prompt.includes("HIDDEN TASK RULES")) {
    return JSON.stringify({
      title: "临门一脚",
      en: "The Final Push",
      genre: "职场",
      difficulty: 2,
      minutes: 20,
      logline: "发布前夜，两个人必须谈出一个谁都能承受的方案。",
      world: "一家创业公司准备向重要客户交付新功能，但最后一轮测试暴露了风险。",
      relationship: "产品负责人与技术负责人互相信任，但此刻各自背着压力。",
      acts: [
        { t: "第一幕 · 摸底", d: "双方试探真实进度和底线。" },
        { t: "第二幕 · 加码", teaser: "一个新限制让方案更难。" },
        { t: "第三幕 · 定案", teaser: "必须落到可执行下一步。" },
      ],
      hook: "由产品负责人开场，先问真实阻碍。",
      imagePrompt:
        "Two startup colleagues in a late-night meeting room, warm spotlight, laptops open, tense collaborative mood.",
      roles: {
        A: {
          name: "Alex",
          title: "产品负责人",
          persona: "务实、有推动力，善于追问",
          stance: "希望守住客户承诺，至少拿到清晰方案",
          tasks: {
            main: {
              goal: "让对方主动说出一个明确的新交付日期",
              judge: "对方给出具体日期或周数",
            },
            bonus: { goal: "让对方说出 that's fair" },
          },
        },
        B: {
          name: "Jordan",
          title: "技术负责人",
          persona: "谨慎、护团队，不轻易承诺",
          stance: "需要争取延期，但不能显得只是在推脱",
          tasks: {
            main: {
              goal: "争取至少一周延期且保住合作气氛",
              judge: "对方同意延期或重新排期",
            },
            bonus: { goal: "自然用出一个技术比喻" },
          },
        },
      },
    });
  }

  if (prompt.includes('"hints"') || prompt.includes("whisper-coach")) {
    return JSON.stringify({
      hints: [
        { type: "stem", text: "What I mean is..." },
        { type: "word", text: "trade-off" },
        { type: "direction", text: "举个具体例子" },
      ],
    });
  }

  if (prompt.includes('"nextAct"') || prompt.includes("playwright-coach")) {
    const isThird = prompt.includes("act 3") || prompt.includes("第三幕");
    return JSON.stringify({
      coach: ["下一幕多追问细节", "先承认对方一点再推进"],
      nextAct: {
        title: isThird ? "第三幕 · 定案" : "第二幕 · 转折",
        brief: isThird
          ? "时间快到了，双方必须把前面的分歧落成一个可执行决定。"
          : "一个新约束浮出水面，双方需要重新权衡目标与代价。",
        hook: isThird
          ? "由更想推进结果的一方开场，先总结共同点，再提出最后方案。"
          : "由刚才更被动的一方开场，抛出一个新的担忧或条件。",
        imagePrompt:
          "Two professionals in a tense but collaborative conversation, cinematic stage lighting, warm spotlight, dramatic shadows.",
      },
    });
  }

  if (prompt.includes('"team"') && prompt.includes('"tasks"')) {
    return JSON.stringify({
      team: {
        total: 82,
        dims: [
          { name: "任务完成度", score: 24, max: 30, note: "目标清楚" },
          { name: "剧情推进与接话", score: 21, max: 25, note: "接话自然" },
          { name: "博弈质量", score: 19, max: 25, note: "有试探" },
          { name: "表达丰富度", score: 18, max: 20, note: "表达够用" },
        ],
        highlights: [
          { role: "A", quote: "Let's take a step back.", note: "很好地降温" },
          { role: "B", quote: "That's a fair point.", note: "让步很自然" },
        ],
      },
      tasks: {
        A: { verdict: "partial", evidence: "Let's take a step back.", note: "继续把问题问具体" },
        B: { verdict: "partial", evidence: "That's a fair point.", note: "可更主动提条件" },
      },
      guesses: {
        A: { hit: false, note: "方向接近但不够具体" },
        B: { hit: false, note: "抓到立场但没抓到目标" },
      },
    });
  }

  return JSON.stringify({
    A: {
      upgrades: [
        {
          orig: "I think it is hard.",
          better: "I have some reservations about the timeline.",
          why: "更委婉专业",
        },
      ],
      keepers: [{ quote: "Let's take a step back.", why: "能重置对话" }],
      grammar: [],
      badge: { emoji: "🎯", name: "推进者", reason: "能把话题往前带" },
    },
    B: {
      upgrades: [
        {
          orig: "We cannot do it.",
          better: "That timeline isn't realistic with our current bandwidth.",
          why: "给出清楚依据",
        },
      ],
      keepers: [{ quote: "That's a fair point.", why: "让步自然" }],
      grammar: [],
      badge: { emoji: "🧭", name: "稳舵手", reason: "表达克制清楚" },
    },
  });
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const provider = (
    process.env.TEXT_PROVIDER ||
    (process.env.GLM_API_KEY ? "glm" : "") ||
    (process.env.TEXT_API_KEY ? "openai-compatible" : "") ||
    (process.env.ANTHROPIC_API_KEY ? "anthropic" : "")
  ).toLowerCase();

  if (!provider) {
    return res.status(200).json({ text: fallback(prompt), demo: true });
  }

  try {
    const text =
      provider === "anthropic"
        ? await callAnthropic(prompt)
        : provider === "glm"
        ? await callOpenAICompatible(prompt, {
            apiKey: process.env.GLM_API_KEY || process.env.TEXT_API_KEY,
            baseUrl: process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
            model: process.env.GLM_MODEL || process.env.TEXT_MODEL || "glm-4-flash",
            label: "GLM",
          })
        : await callOpenAICompatible(prompt, {
            apiKey: process.env.TEXT_API_KEY,
            baseUrl: process.env.TEXT_BASE_URL,
            model: process.env.TEXT_MODEL,
            label: "OpenAI-compatible",
          });

    return res.status(200).json({ text, provider });
  } catch (error) {
    return res.status(500).json({ error: "Text model API error", detail: error.message });
  }
}

async function callAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.TEXT_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || process.env.TEXT_MODEL || "claude-sonnet-4-20250514",
      max_tokens: Number(process.env.TEXT_MAX_TOKENS || 1200),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    throw new Error(`Anthropic request failed: ${detail}`);
  }

  const data = await anthropicRes.json();
  return (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

async function callOpenAICompatible(prompt, { apiKey, baseUrl, model, label }) {
  if (!apiKey) throw new Error(`Missing API key for ${label}`);
  if (!baseUrl) throw new Error(`Missing base URL for ${label}`);
  if (!model) throw new Error(`Missing model for ${label}`);

  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const modelRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: Number(process.env.TEXT_TEMPERATURE || 0.7),
        max_tokens: Number(process.env.TEXT_MAX_TOKENS || 1200),
      }),
    });

  if (!modelRes.ok) {
    const detail = await modelRes.text();
    throw new Error(`${label} request failed: ${detail}`);
  }

  const data = await modelRes.json();
  const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "";
  if (!text) throw new Error(`${label} response did not include text`);
  return text;
}
