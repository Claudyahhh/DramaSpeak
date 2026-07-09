import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   Duo Stage · 结对英语陪练 — Milestone 2
   M1: 骨架 + 房间 + 双人同步 + 试音台
   M2: 预置剧本库 + 备课卡(P0-P3+自测) + 选剧本/选角色/隐藏任务
   M3: 对话舞台 — 双人字幕互见 + P0点亮 + SOS提词 + 落幕
   M4: 三幕流转 — 幕间教练插话 + AI动态生成二三幕 + 场景卡
   M5: 揭牌仪式 + 任务判定 + 复盘报告 + 团队分/徽章 + 复习本/复测
   M6: AI 一句话生成剧本 + 共创向导（雏形→捏戏→质检→入库）
   ============================================================ */

// ---------- 主题 tokens（小剧场：深蓝夜幕 + 聚光灯金） ----------
const T = {
  ink: "#161A2B",
  ink2: "#1D2237",
  panel: "#232A45",
  line: "#333B5C",
  spot: "#E9B44C",
  jade: "#7FB69B",
  rose: "#D4707E",
  text: "#EDEAE0",
  mut: "#9BA0B8",
  faint: "#6A7089",
};

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&display=swap');
.ds-display { font-family: 'Fraunces', 'Noto Serif SC', serif; }
.ds-body { font-family: ui-sans-serif, system-ui, -apple-system, 'PingFang SC', 'Noto Sans SC', sans-serif; }
.ds-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
@keyframes ds-breathe { 0%,100% { opacity:.55 } 50% { opacity:1 } }
@keyframes ds-rise { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
.ds-rise { animation: ds-rise .5s ease both; }
@media (prefers-reduced-motion: reduce) {
  .ds-rise { animation: none; }
  .ds-pulse { animation: none !important; }
}
`;

/* ============================================================
   预置剧本库（3 部：职场 / 观点交锋 / 社交闲聊）
   ============================================================ */
const SCRIPTS = [
  {
    id: "deadline",
    title: "生死线谈判",
    en: "The Deadline Standoff",
    genre: "职场会议",
    difficulty: 2,
    minutes: 20,
    logline: "上线日期只剩两周，产品负责人和技术负责人必须在这间会议室里谈出一个双方都能活下去的方案。",
    world:
      "一家 50 人的 SaaS 创业公司。旗舰功能原定两周后向最大客户交付，但工程侧进度亮了黄灯。今天这场 1v1，是升级到 CEO 之前的最后一次内部对齐。",
    relationship: "共事两年的产品负责人与技术负责人，互相尊重但立场常年相反，都不想把事情闹到老板那里。",
    acts: [
      {
        t: "第一幕 · 摸底",
        d: "寒暄后进入正题：进度到底怎么样了？双方都在试探对方掌握了多少、还有多少余地。",
      },
      { t: "第二幕 · 摊牌边缘", teaser: "一个坏消息被摆上桌面，谈判进入拉锯……" },
      { t: "第三幕 · 出路", teaser: "要么达成一个新方案，要么一起走进 CEO 办公室。" },
    ],
    hook: "由产品负责人开场：以一句轻松的寒暄切入，然后自然地问出你最想知道的那件事。",
    roles: {
      A: {
        name: "Alex",
        title: "产品负责人 (PM)",
        persona: "务实、有推动力，擅长用问题引导对话。对客户承诺看得极重。",
        stance: "希望尽量守住原定日期，至少要拿到一个可以向客户交代的确定方案。",
        tasks: {
          main: {
            goal: "不直接施压，让对方在对话中主动说出一个具体的新交付日期。",
            judge: "对方说出明确日期/周数，且不是被你逼问出来的。",
          },
          bonus: { goal: "让对方对你说出 \u201cyou're right\u201d 或 \u201cthat's fair\u201d。" },
        },
        p0: [
          { en: "Help me understand the real blocker.", zh: "帮我理解真正卡住的点（引导而非质问）" },
          { en: "What would it take to hit the date?", zh: "要守住日期，需要什么条件？" },
        ],
      },
      B: {
        name: "Jordan",
        title: "技术负责人 (Tech Lead)",
        persona: "严谨、护团队，说话留有余地，不轻易给承诺。",
        stance: "需要为团队争取至少一周延期，但有一个不能说出口的原因。",
        tasks: {
          main: {
            goal: "争取到至少一周延期，且全程不透露真实原因：核心工程师最近在面试别家，随时可能离职。",
            judge: "拿到延期承诺，且从头到尾没有泄露人事风险。",
          },
          bonus: { goal: "对话中自然地用出 3 个技术比喻（如 \u201cIt's like changing engines mid-flight\u201d）。" },
        },
        p0: [
          { en: "I'd rather under-promise and over-deliver.", zh: "我宁可少承诺、多交付" },
          { en: "Realistically speaking, ...", zh: "现实一点说……（给出保守估计前的缓冲）" },
        ],
      },
    },
    p0shared: [
      { en: "Let's take a step back.", zh: "我们退一步看（重置对话方向）" },
      { en: "From my perspective, ...", zh: "从我的角度看……（表明立场不树敌）" },
      { en: "I have some reservations about ...", zh: "我对……有些保留意见（委婉反对）" },
      { en: "Can we align on the next step?", zh: "我们能就下一步达成一致吗？" },
      { en: "What's the trade-off here?", zh: "这里的取舍是什么？" },
    ],
    p1: [
      { from: "I think it's not good.", to: "I have some reservations about this.", zh: "委婉表达反对" },
      { from: "We can't do it.", to: "That timeline isn't realistic given our current bandwidth.", zh: "拒绝但给出依据" },
      { from: "It's very hard.", to: "It's a significant technical challenge.", zh: "把\u201c难\u201d说得专业" },
      { from: "I agree.", to: "That's a fair point — let's build on it.", zh: "同意并推进" },
    ],
    p2: [
      { en: "push back on ...", zh: "对……提出异议" },
      { en: "bandwidth", zh: "（人力）余量：We don't have the bandwidth." },
      { en: "scope creep", zh: "需求蔓延" },
      { en: "meet halfway", zh: "各让一步" },
      { en: "circle back", zh: "回头再谈：Let's circle back to this." },
    ],
    p3: [
      { en: "Let's not boil the ocean.", zh: "别把摊子铺太大" },
      { en: "We're aligned on the destination, just not the route.", zh: "目标一致，只是路径分歧" },
      { en: "I don't want to die on this hill.", zh: "这一点我不坚持到底（战略性放弃）" },
    ],
    quiz: [
      {
        situation: "委婉地表达：你觉得这个 deadline 不现实。",
        reference: "I have some reservations about the timeline — realistically, it isn't achievable with our current bandwidth.",
        tip: "reservations + realistically 双缓冲，比 impossible 专业得多。",
      },
      {
        situation: "对方情绪上来了，你想把对话拉回正轨。",
        reference: "Let's take a step back and look at what we're both trying to protect here.",
        tip: "step back + 共同利益，是降温的万能句式。",
      },
      {
        situation: "你想知道到底卡在哪，但不想显得在质问。",
        reference: "Help me understand the real blocker — what would it take to unblock it?",
        tip: "Help me understand 把质问变成求助。",
      },
      {
        situation: "承认对方说得有道理，同时把话题推进。",
        reference: "That's a fair point — let's build on it and talk about options.",
        tip: "先给 fair point，再 build on it，不丢立场。",
      },
    ],
  },
  {
    id: "fourday",
    title: "四天工作制之辩",
    en: "The Four-Day Week Debate",
    genre: "观点交锋",
    difficulty: 3,
    minutes: 22,
    logline: "公司匿名问卷里 78% 的人想要四天工作制。你们俩受命在提案前吵明白：这是良药还是毒药？",
    world:
      "一家 200 人的设计咨询公司。管理层让两位资深员工先行辩论并共同署名一份建议书——但你们俩的真实看法截然相反。",
    relationship: "同期入职的老同事，私交好，谁也说服不了谁，但这次必须交出一份共同结论。",
    acts: [
      { t: "第一幕 · 立场亮牌", d: "各自陈述核心观点与最强论据，试探对方论证里的薄弱处。" },
      { t: "第二幕 · 交锋", teaser: "一份新数据入场，有人的论据开始动摇……" },
      { t: "第三幕 · 共同结论", teaser: "建议书今晚要交，你们必须落在同一句话上。" },
    ],
    hook: "由支持方开场：用一个具体的场景（而不是抽象论点）描绘四天工作制下的一天，先声夺人。",
    roles: {
      A: {
        name: "Sam",
        title: "支持方",
        persona: "理想主义但重证据，善用类比，语速快。",
        stance: "坚信四天工作制能提升效率与留人，想推动试点。",
        tasks: {
          main: {
            goal: "让对方在对话中明确承认你的至少一个论点成立（如说出 \u201cI'll give you that\u201d / \u201cthat's true\u201d）。",
            judge: "对方有明确让步语句，且是针对你的论点。",
          },
          bonus: { goal: "用一个 \u201cImagine if ...\u201d 开头的假设场景完成一次论证。" },
        },
        p0: [
          { en: "The evidence suggests ...", zh: "证据表明……（用数据说话）" },
          { en: "Imagine if we ran a three-month pilot.", zh: "设想我们跑一个三个月试点" },
        ],
      },
      B: {
        name: "Riley",
        title: "质疑方",
        persona: "冷静、挑剔，擅长找例外情况，不轻易亮明全部底牌。",
        stance: "认为客户型业务玩不转四天制，但不想当\u201c反对一切的人\u201d。",
        tasks: {
          main: {
            goal: "不使用 \u201cI disagree\u201d 式的正面否定，引导对方主动承认方案里存在一个重大风险。",
            judge: "对方说出风险（如客户响应、排期塌陷），且是被你的提问引导出来的。",
          },
          bonus: { goal: "自然地引用一个统计数字完成一次反驳（可以现编，但要说得像真的）。" },
        },
        p0: [
          { en: "Playing devil's advocate, ...", zh: "唱个反调……（反对前的免责声明）" },
          { en: "How would that work when a client calls on Friday?", zh: "客户周五来电话时这怎么运转？（具体场景发难）" },
        ],
      },
    },
    p0shared: [
      { en: "That's a valid point, but ...", zh: "有道理，但是……（承认+转折）" },
      { en: "Where do you stand on ...?", zh: "你在……上的立场是？" },
      { en: "Let me push back a little.", zh: "让我稍微反驳一下" },
      { en: "The way I see it, ...", zh: "在我看来……" },
      { en: "Can we agree on the criteria first?", zh: "我们能先统一评判标准吗？" },
    ],
    p1: [
      { from: "I don't agree.", to: "I see it differently — here's why.", zh: "反对但不对抗" },
      { from: "You are wrong.", to: "I think that argument has a blind spot.", zh: "指出漏洞而非否定人" },
      { from: "Maybe.", to: "That could work under certain conditions.", zh: "有条件地让步" },
      { from: "It's good for workers.", to: "It measurably improves retention and focus.", zh: "把好处说得可度量" },
    ],
    p2: [
      { en: "a double-edged sword", zh: "双刃剑" },
      { en: "correlation isn't causation", zh: "相关不等于因果" },
      { en: "concede a point", zh: "承认对方某点成立" },
      { en: "for the sake of argument", zh: "姑且假设（推演用）" },
      { en: "common ground", zh: "共识基础：Let's find common ground." },
    ],
    p3: [
      { en: "That's a strawman of my position.", zh: "你在攻击一个我没说过的稻草人" },
      { en: "The burden of proof is on the proposal.", zh: "举证责任在提案方" },
      { en: "Let's steelman the other side.", zh: "先把对方论点强化到最强再反驳" },
    ],
    quiz: [
      {
        situation: "对方说得有道理，你想承认这一点但保住整体立场。",
        reference: "I'll give you that — but it doesn't change the bigger picture.",
        tip: "give you that 是最地道的\u201c这点算你对\u201d。",
      },
      {
        situation: "不正面否定，用提问让对方看到自己方案的风险。",
        reference: "How would that work when a client escalates on a Friday afternoon?",
        tip: "用具体到时间的场景提问，比 I disagree 有力十倍。",
      },
      {
        situation: "辩论僵住了，你想先统一评判标准。",
        reference: "Before we go further, can we agree on what success would look like?",
        tip: "what success looks like 是拉齐标准的黄金句。",
      },
      {
        situation: "用假设场景推进你的论证。",
        reference: "Imagine if we ran a three-month pilot with one team — what's the worst that could happen?",
        tip: "Imagine if + what's the worst 组合拳：先造梦再拆险。",
      },
    ],
  },
  {
    id: "rooftop",
    title: "天台重逢",
    en: "The Rooftop Reunion",
    genre: "社交闲聊",
    difficulty: 1,
    minutes: 18,
    logline: "海外一场行业酒会的天台上，你撞见了三年没见的老同事。你们都各有心事，也各有所图。",
    world:
      "新加坡一场行业峰会的官方酒会，天台露台，人手一杯。你们曾在同一家公司并肩两年，后来各奔东西，如今在异国重逢。",
    relationship: "三年没联系的前同事，当年关系不错。彼此都好奇对方过得怎样——也都嗅到了对方话里有话。",
    acts: [
      { t: "第一幕 · 破冰叙旧", d: "认出彼此、寒暄、快速交换这三年的人生梗概，试探对方的近况成色。" },
      { t: "第二幕 · 话里有话", teaser: "有人开始把话题往某个方向引……" },
      { t: "第三幕 · 后会有期", teaser: "酒会快散场了，这段重逢要以什么方式延续？" },
    ],
    hook: "由先认出对方的一方开场：用一句惊喜的招呼 + 一个当年的共同记忆瞬间拉近距离。",
    roles: {
      A: {
        name: "Casey",
        title: "留在大厂的那位",
        persona: "健谈、观察力强，习惯用玩笑降低对话的严肃度。",
        stance: "在原公司升了两级，但最近隐约在想要不要出来闯。",
        tasks: {
          main: {
            goal: "不直接问 \u201care you happy?\u201d，通过闲聊判断出对方在新公司过得是否如意，并在对话里说出你的判断让对方确认。",
            judge: "你说出了判断（如 \u201csounds like you're thriving\u201d），且对方确认或纠正。",
          },
          bonus: { goal: "让对方主动提议\u201c再约一次\u201d（而不是你先开口）。" },
        },
        p0: [
          { en: "How are you finding the new gig?", zh: "新工作感觉如何？（gig 比 job 更口语）" },
          { en: "Reading between the lines, ...", zh: "听你话里的意思……（说出你的判断）" },
        ],
      },
      B: {
        name: "Morgan",
        title: "出去创业的那位",
        persona: "谦逊但有故事，擅长讲述，不喜欢直接求人。",
        stance: "创业第二年，正在找进入大客户的门路——对方的公司正是你的目标客户。",
        tasks: {
          main: {
            goal: "不直接开口求引荐，引导对方主动说出\u201c我可以帮你引荐/介绍\u201d之类的话。",
            judge: "对方主动提出 intro/引荐，且你从未直接请求。",
          },
          bonus: { goal: "讲一个 30 秒的小故事：有开头、有转折、有笑点（punchline）。" },
        },
        p0: [
          { en: "Funny you mention that — we've been working on ...", zh: "说来巧了——我们正在做……（顺势引入你的事）" },
          { en: "Long story short, ...", zh: "长话短说……（讲故事的开关）" },
        ],
      },
    },
    p0shared: [
      { en: "It's been ages!", zh: "好久不见！（比 long time no see 地道）" },
      { en: "Fill me in — what have you been up to?", zh: "快跟我说说你这几年" },
      { en: "That reminds me of ...", zh: "这让我想起……（衔接话题）" },
      { en: "No way!", zh: "不会吧！（真诚的惊讶）" },
      { en: "We should grab coffee while you're in town.", zh: "趁你在这儿我们喝个咖啡吧" },
    ],
    p1: [
      { from: "How is your job?", to: "How are you finding the new gig?", zh: "问近况问得像朋友" },
      { from: "I'm fine.", to: "Can't complain — busy in a good way.", zh: "回答近况带点内容" },
      { from: "I changed my job.", to: "I took the leap and went out on my own.", zh: "把\u201c换工作\u201d讲成故事" },
      { from: "Really?", to: "Get out! Since when?", zh: "惊讶得更生动" },
    ],
    p2: [
      { en: "catch up", zh: "叙旧：We have so much to catch up on." },
      { en: "out of the blue", zh: "毫无预兆地" },
      { en: "a small world moment", zh: "\u201c世界真小\u201d时刻" },
      { en: "put in a good word", zh: "替某人美言" },
      { en: "keep me posted", zh: "有进展告诉我" },
    ],
    p3: [
      { en: "We go way back.", zh: "我们是老交情了" },
      { en: "Speak of the devil!", zh: "说曹操曹操到" },
      { en: "Let's not make it another three years.", zh: "别再隔三年才见了（告别金句）" },
    ],
    quiz: [
      {
        situation: "重逢开场：表达惊喜并唤起一段共同记忆。",
        reference: "No way — Morgan?! It's been ages! Last time I saw you, we were pulling an all-nighter before the big launch.",
        tip: "惊叹 + 具体共同记忆，瞬间回到当年。",
      },
      {
        situation: "想知道对方过得好不好，但不能问得太直接。",
        reference: "So how are you finding it? You look like the move agreed with you.",
        tip: "用观察代替提问：the move agreed with you（这步棋走对了）。",
      },
      {
        situation: "把\u201c我离职创业了\u201d讲成一个有画面的故事开头。",
        reference: "Long story short — I took the leap last spring, and it's been a rollercoaster ever since.",
        tip: "took the leap + rollercoaster，两个意象顶十句流水账。",
      },
      {
        situation: "散场前提议保持联系，说得具体而不客套。",
        reference: "We should grab coffee while you're in town — I'm free Thursday, does that work?",
        tip: "加上具体时间，客套话就变成了真邀请。",
      },
    ],
  },
];

const TIER_INFO = [
  { key: "p0", label: "P0 必用", desc: "开演后会变成你的点亮清单，必须用上" },
  { key: "p1", label: "P1 升级句", desc: "你现在的说法 → 更地道的说法" },
  { key: "p2", label: "P2 地道层", desc: "习语与搭配，用上一两个就赚了" },
  { key: "p3", label: "P3 眼熟即可", desc: "高阶用法，听懂不慌" },
];

// ---------- 存储助手 ----------
async function sGet(key, shared = true) {
  try {
    const r = await window.storage.get(key, shared);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
async function sSet(key, val, shared = true) {
  try {
    const r = await window.storage.set(key, JSON.stringify(val), shared);
    return !!r;
  } catch {
    return false;
  }
}
async function sDel(key, shared = true) {
  try {
    await window.storage.delete(key, shared);
  } catch {}
}
async function sList(prefix, shared = true) {
  try {
    const r = await window.storage.list(prefix, shared);
    return r?.keys || [];
  } catch {
    return [];
  }
}

const genId = () =>
  "u" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const genCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[(Math.random() * CODE_ALPHABET.length) | 0]).join("");

function getSR() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// 朗读（学习卡跟读用，浏览器免费 TTS）
function speak(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
}

// ---------- P0 模糊匹配（允许中间插 1-2 个词；短语含 … 时只匹配固定前缀） ----------
const normWords = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

function phraseTokens(en) {
  const cut = en.split(/\.\.\.|…/)[0];
  const w = normWords(cut);
  return w.length >= 2 ? w : normWords(en);
}

function containsPhrase(textWords, tokens, maxGap = 2) {
  if (!tokens.length) return false;
  for (let i = 0; i < textWords.length; i++) {
    if (textWords[i] === tokens[0]) {
      let ti = 1,
        gap = 0,
        j = i + 1;
      while (j < textWords.length && ti < tokens.length) {
        if (textWords[j] === tokens[ti]) {
          ti++;
          gap = 0;
        } else {
          gap++;
          if (gap > maxGap) break;
        }
        j++;
      }
      if (ti === tokens.length) return true;
    }
  }
  return false;
}

// ---------- Claude API（SOS 提词等） ----------
async function callClaude(prompt) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("Claude request failed");
  const data = await res.json();
  return data.text || "";
}

function parseJSONLoose(text) {
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

const ACT_MINUTES = [8, 8, 6];

/* ============================================================ */
export default function App() {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("home"); // onboard | home | prep | lobby
  const [toast, setToast] = useState(null);

  const [prepScript, setPrepScript] = useState(null); // 正在备课的剧本
  const [prepMap, setPrepMap] = useState({}); // {scriptId: {studied:true}}
  const [notebook, setNotebook] = useState([]); // 我的复习本（个人存储）
  const [lastRoom, setLastRoom] = useState(null); // 上一场房间码（刷新恢复用）
  const [customScripts, setCustomScripts] = useState([]); // 自创剧本（共享存储，索引在个人）
  const customScriptsRef = useRef(customScripts);
  customScriptsRef.current = customScripts;
  const allScripts = React.useMemo(() => [...SCRIPTS, ...customScripts], [customScripts]);

  const [room, setRoom] = useState(null); // {code}
  const [meta, setMeta] = useState(null); // 房间 meta（含 packId）
  const [members, setMembers] = useState([]);
  const [roomState, setRoomState] = useState(null); // {phase, actIndex, startedAt} 房主权威写
  const membersRef = useRef(members);
  membersRef.current = members;
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;

  const showToast = useCallback((msg, kind = "info") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // 启动
  useEffect(() => {
    (async () => {
      const p = await sGet("profile", false);
      if (p?.id && p?.name) {
        setProfile(p);
        setView("home");
      } else setView("onboard");
      const pm = {};
      for (const s of SCRIPTS) {
        const st = await sGet(`prep:${s.id}`, false);
        if (st) pm[s.id] = st;
      }
      // 自创剧本：个人索引 → 共享存储取全文
      const idx = (await sGet("myScriptIds", false)) || [];
      const customs = [];
      for (const id of idx) {
        const sc = await sGet(`cscript:${id}`);
        if (sc?.id) {
          customs.push(sc);
          const st = await sGet(`prep:${sc.id}`, false);
          if (st) pm[sc.id] = st;
        }
      }
      setCustomScripts(customs);
      setPrepMap(pm);
      const nb = await sGet("notebook", false);
      if (Array.isArray(nb)) setNotebook(nb);
      const lr = await sGet("lastRoom", false);
      if (lr?.code && Date.now() - (lr.at || 0) < 6 * 3600 * 1000) setLastRoom(lr.code);
      setBooting(false);
    })();
  }, []);

  // ---------- 房间轮询（成员 + meta + 状态机），大厅与舞台共用 ----------
  useEffect(() => {
    if ((view !== "lobby" && view !== "stage") || !room) return;
    let alive = true;
    const tick = async () => {
      const [m, st, keys] = await Promise.all([
        sGet(`room:${room.code}:meta`),
        sGet(`room:${room.code}:state`),
        sList(`room:${room.code}:member:`),
      ]);
      const list = [];
      for (const k of keys) {
        const rec = await sGet(k);
        if (rec) list.push(rec);
      }
      if (!alive) return;
      if (m) {
        setMeta(m);
        // 房主选了我这边还没有的自创剧本 → 从共享存储拉取
        if (
          m.packId &&
          !SCRIPTS.some((s) => s.id === m.packId) &&
          !customScriptsRef.current.some((s) => s.id === m.packId)
        ) {
          const sc = await sGet(`cscript:${m.packId}`);
          if (sc?.id) setCustomScripts((cs) => (cs.some((x) => x.id === sc.id) ? cs : [...cs, sc]));
        }
      }
      setRoomState(st);
      list.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      setMembers(list);
      // 状态机驱动视图切换
      const acting = st && (st.phase === "act" || st.phase === "wrap" || st.phase === "interlude");
      setView((v) => {
        if (acting && v === "lobby") return "stage";
        if ((!st || st.phase === "lobby") && v === "stage") return "lobby";
        return v;
      });
    };
    tick();
    const iv = setInterval(tick, 2500);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [view, room]);

  // 剧本确定后，把\u201c我是否已备课\u201d写进成员记录（让对方看到）
  useEffect(() => {
    if (view !== "lobby" || !room || !meta?.packId || !profile) return;
    const me = members.find((m) => m.userId === profile.id);
    const done = !!prepMap[meta.packId]?.studied;
    if (me && me.prepDone !== done) updateMe({ prepDone: done });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, meta?.packId, members.length, prepMap]);

  // ---------- 动作 ----------
  const saveName = async (name) => {
    const p = { id: profile?.id || genId(), name: name.trim() };
    await sSet("profile", p, false);
    setProfile(p);
    setView("home");
  };

  const createRoom = async () => {
    const code = genCode();
    const m = { hostId: profile.id, createdAt: Date.now(), packId: null, milestone: 2 };
    const ok = await sSet(`room:${code}:meta`, m);
    if (!ok) return showToast("房间创建失败，请重试", "err");
    await sSet(`room:${code}:member:${profile.id}`, {
      userId: profile.id,
      name: profile.name,
      ready: false,
      headphones: false,
      role: null,
      prepDone: false,
      joinedAt: Date.now(),
    });
    await sSet("lastRoom", { code, at: Date.now() }, false);
    setLastRoom(code);
    setRoom({ code });
    setMeta(m);
    setMembers([]);
    setView("lobby");
  };

  const joinRoom = async (codeRaw) => {
    const code = codeRaw.trim().toUpperCase();
    if (code.length !== 6) return showToast("房间码是 6 位字母数字", "err");
    const m = await sGet(`room:${code}:meta`);
    if (!m) return showToast("没有找到这个房间，检查一下房间码", "err");
    const memberKeys = await sList(`room:${code}:member:`);
    const isMember = memberKeys.some((k) => k.endsWith(`:${profile.id}`));
    if (!isMember && memberKeys.length >= 2)
      return showToast("这个房间已经有两位演员了", "err");
    // 重新加入（如刷新后）保留原有成员记录：角色、点亮、SOS 等不丢
    const existing = isMember ? await sGet(`room:${code}:member:${profile.id}`) : null;
    await sSet(
      `room:${code}:member:${profile.id}`,
      existing || {
        userId: profile.id,
        name: profile.name,
        ready: false,
        headphones: false,
        role: null,
        prepDone: false,
        joinedAt: Date.now(),
      }
    );
    await sSet("lastRoom", { code, at: Date.now() }, false);
    setLastRoom(code);
    setRoom({ code });
    setMeta(m);
    setMembers([]);
    setView("lobby");
  };

  const updateMe = useCallback(
    async (patch) => {
      if (!room || !profile) return;
      const cur = membersRef.current.find((m) => m.userId === profile.id) || {
        userId: profile.id,
        name: profile.name,
        joinedAt: Date.now(),
      };
      const next = { ...cur, ...patch };
      await sSet(`room:${room.code}:member:${profile.id}`, next);
      setMembers((ms) => {
        const others = ms.filter((m) => m.userId !== profile.id);
        return [...others, next].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      });
    },
    [room?.code, profile?.id, profile?.name]
  );

  const setPack = async (packId) => {
    const next = { ...meta, packId };
    await sSet(`room:${room.code}:meta`, next);
    setMeta(next);
  };

  // 房主开演 / 推进状态机
  const writePhase = useCallback(
    async (patch) => {
      if (!room) return;
      const next = { ...(roomStateRef.current || {}), ...patch };
      await sSet(`room:${room.code}:state`, next);
      setRoomState(next);
    },
    [room?.code]
  );

  const startShow = async () => {
    const sessionId = Date.now();
    await updateMe({ endActVote: false, p0Lit: [], sosCount: 0, guessDone: false, guessText: "" });
    await sDel(`room:${room.code}:review`);
    await writePhase({
      phase: "act",
      actIndex: 0,
      startedAt: sessionId,
      sessionId,
      dynActs: {},
      coach: {},
      interludeFor: null,
    });
    setView("stage");
  };

  const leaveRoom = async () => {
    if (room) await sDel(`room:${room.code}:member:${profile.id}`);
    setRoom(null);
    setMeta(null);
    setMembers([]);
    setView("home");
  };

  const markStudied = async (scriptId) => {
    const st = { studied: true, at: Date.now() };
    await sSet(`prep:${scriptId}`, st, false);
    setPrepMap((m) => ({ ...m, [scriptId]: st }));
    showToast("已标记为备课完成 ✓");
  };

  const saveNotebook = async (list) => {
    setNotebook(list);
    await sSet("notebook", list, false);
  };

  const addToNotebook = async (entries) => {
    const stamped = entries.map((e) => ({
      id: genId(),
      mastery: 0,
      archived: false,
      at: Date.now(),
      ...e,
    }));
    await saveNotebook([...notebook, ...stamped]);
    showToast(`已存入复习本 ${stamped.length} 条 ✓`);
  };

  const saveCustomScript = async (script) => {
    await sSet(`cscript:${script.id}`, script);
    const idx = (await sGet("myScriptIds", false)) || [];
    if (!idx.includes(script.id)) await sSet("myScriptIds", [...idx, script.id], false);
    setCustomScripts((cs) => (cs.some((x) => x.id === script.id) ? cs.map((x) => (x.id === script.id ? script : x)) : [...cs, script]));
    showToast(`剧本《${script.title}》已入库 ✓`);
  };

  const deleteCustomScript = async (id) => {
    const idx = (await sGet("myScriptIds", false)) || [];
    await sSet("myScriptIds", idx.filter((x) => x !== id), false);
    setCustomScripts((cs) => cs.filter((x) => x.id !== id));
  };

  // ---------- 渲染 ----------
  if (booting)
    return (
      <Shell>
        <div className="flex items-center justify-center h-64" style={{ color: T.mut }}>
          幕布升起中…
        </div>
      </Shell>
    );

  return (
    <Shell>
      {toast && <Toast msg={toast.msg} kind={toast.kind} />}
      {view === "onboard" && <Onboard onSave={saveName} />}
      {view === "home" && (
        <Home
          profile={profile}
          prepMap={prepMap}
          customScripts={customScripts}
          notebookCount={notebook.filter((e) => !e.archived).length}
          lastRoom={lastRoom}
          onRejoin={() => lastRoom && joinRoom(lastRoom)}
          onOpenNotebook={() => setView("notebook")}
          onOpenWizard={() => setView("wizard")}
          onDeleteScript={deleteCustomScript}
          onCreate={createRoom}
          onJoin={joinRoom}
          onRename={() => setView("onboard")}
          onOpenScript={(s) => {
            setPrepScript(s);
            setView("prep");
          }}
        />
      )}
      {view === "notebook" && (
        <NotebookView
          notebook={notebook}
          onSave={saveNotebook}
          onBack={() => setView(room ? "lobby" : "home")}
        />
      )}
      {view === "prep" && prepScript && (
        <PrepView
          script={prepScript}
          done={!!prepMap[prepScript.id]?.studied}
          onBack={() => setView(room ? "lobby" : "home")}
          onDone={() => markStudied(prepScript.id)}
        />
      )}
      {view === "wizard" && (
        <Wizard
          onSave={async (sc) => {
            await saveCustomScript(sc);
            setView("home");
          }}
          onBack={() => setView("home")}
          showToast={showToast}
        />
      )}
      {view === "lobby" && room && (
        <Lobby
          room={room}
          meta={meta}
          scripts={allScripts}
          profile={profile}
          members={members}
          prepMap={prepMap}
          onUpdateMe={updateMe}
          onSetPack={setPack}
          onStart={startShow}
          onLeave={leaveRoom}
          onOpenScript={(s) => {
            setPrepScript(s);
            setView("prep");
          }}
        />
      )}
      {view === "stage" && room && (
        <Stage
          room={room}
          meta={meta}
          scripts={allScripts}
          roomState={roomState}
          profile={profile}
          members={members}
          onUpdateMe={updateMe}
          onWritePhase={writePhase}
          addToNotebook={addToNotebook}
          onLeave={leaveRoom}
          showToast={showToast}
        />
      )}
    </Shell>
  );
}

/* ================= 布景组件 ================= */

function Shell({ children }) {
  return (
    <div className="ds-body min-h-screen w-full" style={{ background: T.ink, color: T.text }}>
      <style>{FONT_CSS}</style>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <header className="flex items-baseline justify-between mb-8">
          <div>
            <div className="ds-display text-2xl sm:text-3xl">Duo&nbsp;Stage</div>
            <div className="text-xs mt-1 tracking-wide" style={{ color: T.faint }}>
              两个人的英语小剧场 · v1.0
            </div>
          </div>
          <SpotMark />
        </header>
        {children}
      </div>
    </div>
  );
}

function SpotMark() {
  return (
    <svg width="52" height="34" viewBox="0 0 52 34" aria-hidden>
      <ellipse cx="16" cy="26" rx="12" ry="5" fill={T.spot} opacity="0.25" />
      <ellipse cx="36" cy="26" rx="12" ry="5" fill={T.spot} opacity="0.25" />
      <path d="M16 26 L11 4 L21 4 Z" fill={T.spot} opacity="0.5" />
      <path d="M36 26 L31 4 L41 4 Z" fill={T.spot} opacity="0.5" />
    </svg>
  );
}

function Card({ children, className = "", style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: T.ink2, border: `1px solid ${T.line}`, ...style }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, kind = "spot", disabled, className = "" }) {
  const bg = kind === "spot" ? T.spot : kind === "ghost" ? "transparent" : T.panel;
  const color = kind === "spot" ? "#1c1608" : T.text;
  const border = kind === "ghost" ? `1px solid ${T.line}` : "1px solid transparent";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-3 font-medium transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${className}`}
      style={{ background: bg, color, border }}
    >
      {children}
    </button>
  );
}

function Toast({ msg, kind }) {
  return (
    <div
      className="ds-rise fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2 text-sm shadow-lg"
      style={{
        background: kind === "err" ? T.rose : T.panel,
        color: kind === "err" ? "#2b1013" : T.text,
        border: `1px solid ${T.line}`,
      }}
    >
      {msg}
    </div>
  );
}

function Notice({ children, tone = "info" }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm mb-3 leading-relaxed"
      style={{
        background: tone === "err" ? "rgba(212,112,126,0.12)" : T.panel,
        border: `1px solid ${tone === "err" ? T.rose : T.line}`,
        color: T.text,
      }}
    >
      {children}
    </div>
  );
}

/* ================= 入场 ================= */

function Onboard({ onSave }) {
  const [name, setName] = useState("");
  return (
    <div className="ds-rise">
      <Card>
        <div className="ds-display text-xl mb-1">入场登记</div>
        <p className="text-sm mb-5" style={{ color: T.mut }}>
          给自己起个名字，你的搭档会在房间里看到它。
        </p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name)}
            placeholder="你的名字 / 艺名"
            maxLength={16}
            className="flex-1 rounded-xl px-4 py-3 outline-none"
            style={{ background: T.ink, border: `1px solid ${T.line}`, color: T.text }}
          />
          <Btn onClick={() => name.trim() && onSave(name)} disabled={!name.trim()}>
            进入剧场
          </Btn>
        </div>
      </Card>
    </div>
  );
}

/* ================= 前厅 ================= */

function Home({ profile, prepMap, customScripts, notebookCount, lastRoom, onRejoin, onOpenNotebook, onOpenWizard, onDeleteScript, onCreate, onJoin, onRename, onOpenScript }) {
  const [code, setCode] = useState("");
  return (
    <div className="space-y-4 ds-rise">
      <div className="flex items-center justify-between px-1">
        <div className="text-sm" style={{ color: T.mut }}>
          今晚登台：<span style={{ color: T.text }}>{profile.name}</span>
        </div>
        <button className="text-xs underline" style={{ color: T.faint }} onClick={onRename}>
          改名字
        </button>
      </div>

      {lastRoom && (
        <button className="w-full text-left" onClick={onRejoin}>
          <Card className="!py-3" style={{ border: `1px solid ${T.spot}` }}>
            <span className="text-sm" style={{ color: T.spot }}>
              ⟳ 回到上一场房间 <span className="ds-mono tracking-widest">{lastRoom}</span>
            </span>
            <span className="text-xs ml-2" style={{ color: T.faint }}>
              刷新/断线后从这里一键归位
            </span>
          </Card>
        </button>
      )}

      {/* 复习本 */}
      <button className="w-full text-left" onClick={onOpenNotebook}>
        <Card className="!py-4 hover:opacity-90 transition-opacity">
          <div className="flex items-center justify-between">
            <div>
              <span className="ds-display text-lg">📔 我的复习本</span>
              <span className="text-sm ml-2" style={{ color: T.mut }}>
                {notebookCount > 0 ? `${notebookCount} 条待复习` : "还没有内容——复盘后一键存入"}
              </span>
            </div>
            {notebookCount > 0 && (
              <span className="text-xs" style={{ color: T.spot }}>
                复测 2 分钟 →
              </span>
            )}
          </div>
        </Card>
      </button>

      {/* 剧本库 */}
      <div>
        <div className="ds-display text-lg px-1 mb-2">今晚演哪出</div>
        <div className="space-y-3">
          {SCRIPTS.map((s) => (
            <ScriptCard
              key={s.id}
              script={s}
              done={!!prepMap[s.id]?.studied}
              onClick={() => onOpenScript(s)}
            />
          ))}
        </div>
        {customScripts.length > 0 && (
          <div className="mt-3">
            <div className="text-xs px-1 mb-2" style={{ color: T.faint }}>
              我们的自创剧本
            </div>
            <div className="space-y-3">
              {customScripts.map((s) => (
                <div key={s.id} className="relative">
                  <ScriptCard script={s} done={!!prepMap[s.id]?.studied} onClick={() => onOpenScript(s)} />
                  <button
                    className="absolute top-3 right-3 text-xs underline"
                    style={{ color: T.faint }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScript(s.id);
                    }}
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="w-full text-left mt-3" onClick={onOpenWizard}>
          <Card className="!py-4 hover:opacity-90 transition-opacity" style={{ border: `1px dashed ${T.spot}` }}>
            <span className="ds-display text-lg" style={{ color: T.spot }}>
              ✍️ 创作新剧本
            </span>
            <span className="text-sm ml-2" style={{ color: T.mut }}>
              一句话快速生成，或与 AI 共创你们自己的故事
            </span>
          </Card>
        </button>
        <p className="text-xs px-1 mt-2" style={{ color: T.faint }}>
          点开剧本先备课（15-20 分钟）。自创剧本会自动出现在你们俩的房间剧目单里。
        </p>
      </div>

      <Card>
        <div className="ds-display text-xl mb-1">开一场戏</div>
        <p className="text-sm mb-4" style={{ color: T.mut }}>
          创建房间后把 6 位房间码发给你的搭档，进房后由房主选定剧本。
        </p>
        <Btn onClick={onCreate} className="w-full">
          创建房间
        </Btn>
        <div className="flex gap-2 mt-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && onJoin(code)}
            placeholder="或输入房间码加入"
            maxLength={6}
            className="ds-mono flex-1 rounded-xl px-4 py-3 tracking-widest outline-none uppercase"
            style={{ background: T.ink, border: `1px solid ${T.line}`, color: T.text }}
          />
          <Btn kind="panel" onClick={() => onJoin(code)} disabled={code.trim().length !== 6}>
            加入
          </Btn>
        </div>
      </Card>

      <MicCheck />

      <p className="text-xs px-1 leading-relaxed" style={{ color: T.faint }}>
        使用须知：对话声音走微信语音或面对面；通话<span style={{ color: T.spot }}>不要外放</span>
        （戴耳机 / 听筒贴耳 / 分设备低音量均可），否则麦克风会把对方的声音录进你的字幕。推荐 Chrome 浏览器。
      </p>
    </div>
  );
}

function ScriptCard({ script, done, onClick }) {
  return (
    <button className="w-full text-left" onClick={onClick}>
      <Card className="hover:opacity-90 transition-opacity">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="ds-display text-lg">{script.title}</span>
              <span className="text-xs" style={{ color: T.faint }}>
                {script.en}
              </span>
            </div>
            <div className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: T.mut }}>
              <Tag>{script.genre}</Tag>
              <Tag>{"★".repeat(script.difficulty)}</Tag>
              <Tag>约 {script.minutes} 分钟</Tag>
              <Tag tone="secret">隐藏任务 ×2</Tag>
              {done && <Tag tone="ok">已备课 ✓</Tag>}
            </div>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: T.mut }}>
              {script.logline}
            </p>
          </div>
        </div>
      </Card>
    </button>
  );
}

function Tag({ children, tone }) {
  const color = tone === "ok" ? T.jade : tone === "secret" ? T.spot : T.faint;
  return (
    <span
      className="inline-block rounded-md px-1.5 py-0.5 text-xs"
      style={{ border: `1px solid ${color}`, color }}
    >
      {children}
    </span>
  );
}

/* ================= 备课页 ================= */

function PrepView({ script, done, onBack, onDone }) {
  const [tier, setTier] = useState("p0");
  const [quizState, setQuizState] = useState({}); // {idx: 'revealed'}
  const allRevealed = script.quiz.every((_, i) => quizState[i]);

  return (
    <div className="space-y-4 ds-rise">
      <button className="text-sm underline" style={{ color: T.faint }} onClick={onBack}>
        ← 返回
      </button>

      {/* 剧本头 */}
      <Card>
        <div className="ds-display text-2xl">{script.title}</div>
        <div className="text-sm mt-0.5" style={{ color: T.faint }}>
          {script.en}
        </div>
        <div className="text-xs mt-2 flex items-center gap-2 flex-wrap" style={{ color: T.mut }}>
          <Tag>{script.genre}</Tag>
          <Tag>{"★".repeat(script.difficulty)}</Tag>
          <Tag>约 {script.minutes} 分钟</Tag>
        </div>
        <p className="text-sm mt-3 leading-relaxed">{script.world}</p>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: T.mut }}>
          {script.relationship}
        </p>
      </Card>

      {/* 三幕预告 */}
      <Card>
        <div className="ds-display text-lg mb-3">三幕预告</div>
        {script.acts.map((a, i) => (
          <div key={i} className="flex gap-3 py-2" style={{ borderTop: i ? `1px dashed ${T.line}` : "none" }}>
            <div className="text-sm flex-shrink-0" style={{ color: T.spot }}>
              {a.t}
            </div>
            <div className="text-sm leading-relaxed" style={{ color: a.d ? T.text : T.faint }}>
              {a.d || a.teaser}
            </div>
          </div>
        ))}
        <p className="text-xs mt-2" style={{ color: T.faint }}>
          第二、三幕的完整剧情会根据你们第一幕真实聊的内容现场生成——所以只给预告。
        </p>
      </Card>

      {/* 两个角色（公开人设） */}
      <div className="grid sm:grid-cols-2 gap-3">
        {["A", "B"].map((r) => {
          const role = script.roles[r];
          return (
            <Card key={r}>
              <div className="flex items-baseline gap-2">
                <span className="ds-display text-lg">{role.name}</span>
                <span className="text-xs" style={{ color: T.faint }}>
                  {role.title}
                </span>
              </div>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: T.mut }}>
                {role.persona}
              </p>
              <p className="text-sm mt-1 leading-relaxed">{role.stance}</p>
              <p className="text-xs mt-2" style={{ color: T.spot }}>
                🎭 含隐藏任务 ×2 — 进房选定角色后才会向你单独揭晓
              </p>
            </Card>
          );
        })}
      </div>

      {/* 表达卡 */}
      <Card>
        <div className="ds-display text-lg mb-1">表达卡</div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {TIER_INFO.map((t) => (
            <button
              key={t.key}
              onClick={() => setTier(t.key)}
              className="rounded-lg px-3 py-1.5 text-sm"
              style={{
                background: tier === t.key ? T.spot : T.ink,
                color: tier === t.key ? "#1c1608" : T.mut,
                border: `1px solid ${tier === t.key ? T.spot : T.line}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2 mb-3" style={{ color: T.faint }}>
          {TIER_INFO.find((t) => t.key === tier).desc}
        </p>

        {tier === "p0" && (
          <div className="space-y-2">
            {script.p0shared.map((e, i) => (
              <ExpRow key={i} en={e.en} zh={e.zh} />
            ))}
            {["A", "B"].map((r) => (
              <div key={r} className="pt-2">
                <div className="text-xs mb-1" style={{ color: T.spot }}>
                  {script.roles[r].name} 专属
                </div>
                {script.roles[r].p0.map((e, i) => (
                  <ExpRow key={i} en={e.en} zh={e.zh} />
                ))}
              </div>
            ))}
          </div>
        )}
        {tier === "p1" && (
          <div className="space-y-3">
            {script.p1.map((e, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: T.ink, border: `1px solid ${T.line}` }}>
                <div className="text-sm line-through" style={{ color: T.faint }}>
                  {e.from}
                </div>
                <div className="text-sm mt-1 flex items-start justify-between gap-2">
                  <span>
                    → {e.to}
                    <span className="block text-xs mt-0.5" style={{ color: T.mut }}>
                      {e.zh}
                    </span>
                  </span>
                  <SpeakBtn text={e.to} />
                </div>
              </div>
            ))}
          </div>
        )}
        {(tier === "p2" || tier === "p3") && (
          <div className="space-y-2">
            {script[tier].map((e, i) => (
              <ExpRow key={i} en={e.en} zh={e.zh} />
            ))}
          </div>
        )}
      </Card>

      {/* 自测：先开口，再看答案 */}
      <Card>
        <div className="ds-display text-lg mb-1">开口自测</div>
        <p className="text-xs mb-3" style={{ color: T.faint }}>
          规则：看情境，<span style={{ color: T.spot }}>先大声说出你的版本</span>，再翻开参考表达对照。别跳过开口这一步。
        </p>
        <div className="space-y-3">
          {script.quiz.map((q, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: T.ink, border: `1px solid ${T.line}` }}>
              <div className="text-sm">
                {i + 1}. {q.situation}
              </div>
              {!quizState[i] ? (
                <button
                  className="text-xs mt-2 underline"
                  style={{ color: T.spot }}
                  onClick={() => setQuizState((s) => ({ ...s, [i]: true }))}
                >
                  我说完了，看参考表达
                </button>
              ) : (
                <div className="mt-2 ds-rise">
                  <div className="text-sm flex items-start justify-between gap-2" style={{ color: T.jade }}>
                    <span>{q.reference}</span>
                    <SpeakBtn text={q.reference} />
                  </div>
                  <div className="text-xs mt-1" style={{ color: T.mut }}>
                    {q.tip}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Btn className="w-full" onClick={onDone} disabled={done || !allRevealed}>
        {done ? "已备课 ✓" : allRevealed ? "标记备课完成" : "完成全部自测后可标记备课完成"}
      </Btn>
    </div>
  );
}

function ExpRow({ en, zh }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex items-start justify-between gap-2"
      style={{ background: T.ink, border: `1px solid ${T.line}` }}
    >
      <div>
        <div className="text-sm">{en}</div>
        <div className="text-xs mt-0.5" style={{ color: T.mut }}>
          {zh}
        </div>
      </div>
      <SpeakBtn text={en} />
    </div>
  );
}

function SpeakBtn({ text }) {
  return (
    <button
      onClick={() => speak(text)}
      className="flex-shrink-0 text-xs rounded-lg px-2 py-1"
      style={{ border: `1px solid ${T.line}`, color: T.mut }}
      title="朗读"
    >
      🔊
    </button>
  );
}

/* ================= 试音台 ================= */

function MicCheck() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle");
  const [finals, setFinals] = useState([]);
  const [interim, setInterim] = useState("");
  const recRef = useRef(null);
  const activeRef = useRef(false);

  const stop = useCallback(() => {
    activeRef.current = false;
    try {
      recRef.current?.stop();
    } catch {}
    setStatus("idle");
    setInterim("");
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = () => {
    const SR = getSR();
    if (!SR) return setStatus("unsupported");
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const t = r[0].transcript.trim();
          if (t) setFinals((f) => [...f.slice(-4), t]);
        } else inter += r[0].transcript;
      }
      setInterim(inter);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        activeRef.current = false;
        setStatus("denied");
      }
    };
    rec.onend = () => {
      if (activeRef.current) {
        try {
          rec.start();
        } catch {}
      }
    };
    try {
      rec.start();
      recRef.current = rec;
      activeRef.current = true;
      setStatus("listening");
    } catch {
      setStatus("denied");
    }
  };

  return (
    <Card>
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(!open)}>
        <div className="text-left">
          <div className="ds-display text-xl">麦克风试音台</div>
          <div className="text-sm mt-0.5" style={{ color: T.mut }}>
            正式开演前，先确认这台设备能听懂你的英语
          </div>
        </div>
        <span style={{ color: T.faint }}>{open ? "收起" : "展开"}</span>
      </button>

      {open && (
        <div className="mt-4 ds-rise">
          {status === "unsupported" && (
            <Notice tone="err">
              这个浏览器不支持语音识别。请改用 Chrome（电脑或安卓）；iPhone 请安装 Chrome
              后重试。识别不可用时，正式对话中可以用文字补录。
            </Notice>
          )}
          {status === "denied" && (
            <Notice tone="err">
              麦克风权限被拒绝了。在浏览器地址栏的权限设置里允许麦克风，然后重新开始试音。
            </Notice>
          )}

          <div className="flex items-center gap-3 mb-3">
            {status !== "listening" ? (
              <Btn onClick={start}>开始试音</Btn>
            ) : (
              <Btn kind="panel" onClick={stop}>
                停止
              </Btn>
            )}
            {status === "listening" && (
              <span
                className="ds-pulse text-sm"
                style={{ color: T.spot, animation: "ds-breathe 1.6s infinite" }}
              >
                ● 正在听……请说一句英语
              </span>
            )}
          </div>

          <div
            className="rounded-xl p-4 min-h-20 text-sm leading-relaxed"
            style={{ background: T.ink, border: `1px dashed ${T.line}` }}
          >
            {finals.length === 0 && !interim && (
              <span style={{ color: T.faint }}>
                试着说：&ldquo;The stage is set, and I&rsquo;m ready to play my part.&rdquo;
              </span>
            )}
            {finals.map((f, i) => (
              <div key={i}>{f}</div>
            ))}
            {interim && <div style={{ color: T.faint }}>{interim}…</div>}
          </div>

          {finals.length > 0 && (
            <div className="text-xs mt-2" style={{ color: T.jade }}>
              ✓ 识别正常。转写偶有错词没关系，复盘时 AI 会按上下文纠偏。
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ================= 大厅 ================= */

function Lobby({ room, meta, scripts, profile, members, prepMap, onUpdateMe, onSetPack, onStart, onLeave, onOpenScript }) {
  const me = members.find((m) => m.userId === profile.id);
  const partner = members.find((m) => m.userId !== profile.id);
  const isHost = meta?.hostId === profile.id;
  const script = scripts.find((s) => s.id === meta?.packId) || null;
  const rolesDistinct = me?.role && partner?.role && me.role !== partner.role;
  const bothReady = members.length === 2 && members.every((m) => m.ready) && rolesDistinct;
  const [copied, setCopied] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const claimRole = (r) => {
    if (partner?.role === r) return;
    onUpdateMe({ role: me?.role === r ? null : r, ready: false });
    setTaskOpen(false);
  };

  const myRole = script && me?.role ? script.roles[me.role] : null;

  return (
    <div className="space-y-4 ds-rise">
      {/* 告示板 */}
      <Card className="text-center">
        <div className="text-xs tracking-widest mb-3" style={{ color: T.faint }}>
          TONIGHT&rsquo;S&nbsp;ROOM
        </div>
        <div className="flex justify-center gap-1.5 mb-3">
          {room.code.split("").map((ch, i) => (
            <span
              key={i}
              className="ds-mono inline-flex items-center justify-center w-10 h-12 rounded-lg text-xl"
              style={{ background: T.ink, border: `1px solid ${T.line}`, color: T.spot }}
            >
              {ch}
            </span>
          ))}
        </div>
        <button className="text-xs underline" style={{ color: T.faint }} onClick={copyCode}>
          {copied ? "已复制 ✓" : "复制房间码发给搭档"}
        </button>
      </Card>

      {/* 剧目选择 */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <div className="ds-display text-lg">今晚剧目</div>
          {script && (
            <button className="text-xs underline" style={{ color: T.faint }} onClick={() => onOpenScript(script)}>
              查看剧本 / 备课
            </button>
          )}
        </div>
        {!script ? (
          isHost ? (
            <div className="space-y-2 mt-2">
              {scripts.map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left rounded-xl px-3 py-2.5"
                  style={{ background: T.ink, border: `1px solid ${T.line}` }}
                  onClick={() => onSetPack(s.id)}
                >
                  <span className="text-sm">{s.title}</span>
                  <span className="text-xs ml-2" style={{ color: T.faint }}>
                    {s.genre} · {"★".repeat(s.difficulty)} · 约 {s.minutes} 分钟
                    {prepMap[s.id]?.studied ? " · 我已备课 ✓" : ""}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm mt-1" style={{ color: T.mut }}>
              等房主选定剧本…
            </p>
          )
        ) : (
          <div className="mt-1">
            <div className="text-sm">
              《{script.title}》<span style={{ color: T.faint }}> {script.en}</span>
            </div>
            <div className="text-xs mt-1 flex gap-2 flex-wrap" style={{ color: T.mut }}>
              <Tag>{script.genre}</Tag>
              <Tag>约 {script.minutes} 分钟</Tag>
              {me?.prepDone ? <Tag tone="ok">我已备课</Tag> : <Tag tone="secret">我还没备课</Tag>}
              {partner &&
                (partner.prepDone ? <Tag tone="ok">{partner.name} 已备课</Tag> : <Tag>{partner.name} 未备课</Tag>)}
            </div>
            {isHost && (
              <button className="text-xs underline mt-2" style={{ color: T.faint }} onClick={() => onSetPack(null)}>
                换一部剧
              </button>
            )}
          </div>
        )}
      </Card>

      {/* 选角色 */}
      {script && (
        <Card>
          <div className="ds-display text-lg mb-2">选择你的角色</div>
          <div className="grid grid-cols-2 gap-3">
            {["A", "B"].map((r) => {
              const role = script.roles[r];
              const mine = me?.role === r;
              const taken = partner?.role === r;
              return (
                <button
                  key={r}
                  onClick={() => claimRole(r)}
                  disabled={taken}
                  className="text-left rounded-xl p-3 disabled:opacity-50"
                  style={{
                    background: mine ? "rgba(233,180,76,0.12)" : T.ink,
                    border: `1px solid ${mine ? T.spot : T.line}`,
                  }}
                >
                  <div className="text-sm font-medium">
                    {role.name}
                    <span className="text-xs ml-1" style={{ color: T.faint }}>
                      {role.title}
                    </span>
                  </div>
                  <div className="text-xs mt-1 leading-relaxed" style={{ color: T.mut }}>
                    {role.stance}
                  </div>
                  <div className="text-xs mt-1.5" style={{ color: mine ? T.spot : taken ? T.faint : T.faint }}>
                    {mine ? "✓ 我来演" : taken ? `${partner.name} 已认领` : "点击认领"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 隐藏任务（仅本人） */}
          {myRole && (
            <div className="mt-3 rounded-xl p-3" style={{ background: T.ink, border: `1px dashed ${T.spot}` }}>
              <button className="w-full flex items-center justify-between" onClick={() => setTaskOpen(!taskOpen)}>
                <span className="text-sm" style={{ color: T.spot }}>
                  🎭 你的隐藏任务（仅你可见——别念出来）
                </span>
                <span className="text-xs" style={{ color: T.faint }}>
                  {taskOpen ? "遮住" : "查看"}
                </span>
              </button>
              {taskOpen && (
                <div className="mt-2 ds-rise text-sm leading-relaxed">
                  <div>
                    <span style={{ color: T.spot }}>主任务：</span>
                    {myRole.tasks.main.goal}
                  </div>
                  <div className="text-xs mt-1" style={{ color: T.faint }}>
                    判定标准：{myRole.tasks.main.judge}
                  </div>
                  <div className="mt-2">
                    <span style={{ color: T.spot }}>彩蛋任务：</span>
                    {myRole.tasks.bonus.goal}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* 双聚光灯 */}
      <div className="grid grid-cols-2 gap-4">
        <SpotSeat member={me} script={script} self />
        <SpotSeat member={partner} script={script} />
      </div>

      {/* 开演前检查 */}
      <Card>
        <div className="ds-display text-lg mb-3">开演前检查</div>
        <CheckRow
          checked={!!me?.headphones}
          onToggle={() => onUpdateMe({ headphones: !me?.headphones })}
          title="音频自查：我的麦克风只会听到我自己"
          desc="通话别外放即可——戴耳机 / 听筒贴耳 / 分设备低音量，任选。外放会把对方的声音录进你的字幕"
        />
        <CheckRow
          checked={!!me?.ready}
          onToggle={() => onUpdateMe({ ready: !me?.ready })}
          title="我准备好了"
          desc={!me?.role ? "先在上面认领一个角色" : "微信语音已接通 / 人已在对面"}
          disabled={!me?.headphones || !me?.role}
        />
      </Card>

      <Btn className="w-full" disabled={!bothReady || !isHost} onClick={onStart}>
        {members.length < 2
          ? "等待搭档进入房间…"
          : !script
          ? "等房主选定剧本"
          : !rolesDistinct
          ? "两人各认领一个角色"
          : !bothReady
          ? "等两人都准备好"
          : isHost
          ? "开演 🎬"
          : "等房主开演"}
      </Btn>

      <div className="text-center">
        <button className="text-xs underline" style={{ color: T.faint }} onClick={onLeave}>
          离开房间
        </button>
      </div>
    </div>
  );
}

function SpotSeat({ member, script, self }) {
  const lit = !!member;
  const ready = member?.ready;
  const roleName = member?.role && script ? script.roles[member.role]?.name : null;
  return (
    <div
      className="rounded-2xl p-4 text-center relative overflow-hidden"
      style={{ background: T.ink2, border: `1px solid ${ready ? T.jade : T.line}` }}
    >
      <svg viewBox="0 0 100 72" className="w-full h-24" aria-hidden>
        <path
          d="M50 62 L38 6 L62 6 Z"
          fill={lit ? T.spot : T.faint}
          opacity={lit ? 0.55 : 0.12}
          style={lit && !ready ? { animation: "ds-breathe 2.4s infinite" } : {}}
        />
        <ellipse cx="50" cy="62" rx="26" ry="7" fill={lit ? T.spot : T.faint} opacity={lit ? 0.3 : 0.08} />
        <circle cx="50" cy="52" r="9" fill={lit ? T.text : T.ink} opacity={lit ? 0.9 : 0.5} />
      </svg>
      <div className="mt-1 font-medium truncate">
        {member ? member.name : "虚位以待"}
        {self && member && <span style={{ color: T.faint }}>（你）</span>}
      </div>
      <div className="text-xs mt-1" style={{ color: ready ? T.jade : T.faint }}>
        {!member
          ? "把房间码发给 TA"
          : roleName
          ? `饰演 ${roleName}${ready ? " · ✓ 已就位" : ""}`
          : ready
          ? "✓ 已就位"
          : member.headphones
          ? "音频已自查，选角中"
          : "音频自查未完成"}
      </div>
    </div>
  );
}

function CheckRow({ checked, onToggle, title, desc, disabled }) {
  return (
    <button
      className="w-full flex items-start gap-3 py-2.5 text-left disabled:opacity-40"
      onClick={onToggle}
      disabled={disabled}
    >
      <span
        className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-md text-xs flex-shrink-0"
        style={{
          background: checked ? T.jade : T.ink,
          border: `1px solid ${checked ? T.jade : T.line}`,
          color: "#12291f",
        }}
      >
        {checked ? "✓" : ""}
      </span>
      <span>
        <span className="block text-sm">{title}</span>
        <span className="block text-xs mt-0.5" style={{ color: T.faint }}>
          {desc}
        </span>
      </span>
    </button>
  );
}

/* ================= 对话舞台（核心页面） ================= */

function Stage({ room, meta, scripts, roomState, profile, members, onUpdateMe, onWritePhase, addToNotebook, onLeave, showToast }) {
  const script = scripts.find((s) => s.id === meta?.packId) || null;
  const me = members.find((m) => m.userId === profile.id);
  const partner = members.find((m) => m.userId !== profile.id);
  const isHost = meta?.hostId === profile.id;
  const actIndex = roomState?.actIndex || 0;
  const phase = roomState?.phase || "act";
  const actIndexRef = useRef(actIndex);
  actIndexRef.current = actIndex;
  const sessionId = roomState?.sessionId || "s0";
  const myLinesKey = `room:${room.code}:lines:${sessionId}:${profile.id}`;

  // ---- 台词 ----
  const [myLines, setMyLines] = useState([]);
  const [partnerLines, setPartnerLines] = useState([]);
  const [interim, setInterim] = useState("");
  const myLinesRef = useRef([]);
  const scrollRef = useRef(null);

  // ---- 识别引擎 ----
  const [micOn, setMicOn] = useState(false);
  const [micErr, setMicErr] = useState(null);
  const recRef = useRef(null);
  const activeRef = useRef(false);

  // ---- P0 ----
  const p0Items = React.useMemo(() => {
    if (!script || !me?.role) return [];
    const shared = script.p0shared.map((e, i) => ({ id: `s${i}`, ...e }));
    const mine = (script.roles[me.role]?.p0 || []).map((e, i) => ({ id: `r${i}`, ...e }));
    return [...shared, ...mine];
  }, [script, me?.role]);
  const [lit, setLit] = useState(new Set());
  const litRef = useRef(lit);
  litRef.current = lit;

  // 页面刷新后从成员记录回灌已点亮的 P0
  useEffect(() => {
    if (lit.size === 0 && (me?.p0Lit || []).length > 0) {
      setLit(new Set(me.p0Lit));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.p0Lit]);

  // ---- SOS ----
  const [sosHints, setSosHints] = useState(null);
  const [sosBusy, setSosBusy] = useState(false);
  const [sosCooldown, setSosCooldown] = useState(0);

  // ---- 手动补录 ----
  const [manualText, setManualText] = useState("");

  const persistMyLines = useCallback(
    async (lines) => {
      await sSet(myLinesKey, lines);
    },
    [myLinesKey]
  );

  // 刷新后从存储回灌本场自己的台词（会话隔离，杜绝覆盖与串场）
  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await sGet(myLinesKey);
      if (alive && Array.isArray(stored) && stored.length && myLinesRef.current.length === 0) {
        myLinesRef.current = stored;
        setMyLines(stored);
      }
    })();
    return () => {
      alive = false;
    };
  }, [myLinesKey]);

  const pushLine = useCallback(
    (text, manual = false) => {
      const line = { ts: Date.now(), text, manual, act: actIndexRef.current };
      const next = [...myLinesRef.current, line];
      myLinesRef.current = next;
      setMyLines(next);
      persistMyLines(next);
      // P0 匹配：本句 + 上一句拼接（短语可能被切成两段）
      const prevText = next.length > 1 ? next[next.length - 2].text : "";
      const words = normWords(prevText + " " + text);
      const newlyLit = [];
      for (const item of p0Items) {
        if (litRef.current.has(item.id)) continue;
        if (containsPhrase(words, phraseTokens(item.en))) newlyLit.push(item.id);
      }
      if (newlyLit.length) {
        const nextSet = new Set(litRef.current);
        newlyLit.forEach((id) => nextSet.add(id));
        setLit(nextSet);
        onUpdateMe({ p0Lit: [...nextSet] });
      }
    },
    [p0Items, onUpdateMe, persistMyLines]
  );

  const toggleLit = (id) => {
    const nextSet = new Set(litRef.current);
    if (nextSet.has(id)) nextSet.delete(id);
    else nextSet.add(id);
    setLit(nextSet);
    onUpdateMe({ p0Lit: [...nextSet] });
  };

  // 开麦 / 关麦
  const stopMic = useCallback(() => {
    activeRef.current = false;
    try {
      recRef.current?.stop();
    } catch {}
    setMicOn(false);
    setInterim("");
  }, []);

  const startMic = useCallback(() => {
    const SR = getSR();
    if (!SR) {
      setMicErr("此浏览器不支持语音识别，请用下方文字补录，或换 Chrome。");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const t = r[0].transcript.trim();
          if (t) pushLine(t);
        } else inter += r[0].transcript;
      }
      setInterim(inter);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        activeRef.current = false;
        setMicOn(false);
        setMicErr("麦克风权限被拒绝。请在浏览器设置里允许麦克风后重新开麦。");
      }
    };
    rec.onend = () => {
      if (activeRef.current) {
        try {
          rec.start();
        } catch {}
      }
    };
    try {
      rec.start();
      recRef.current = rec;
      activeRef.current = true;
      setMicOn(true);
      setMicErr(null);
    } catch {
      setMicErr("麦克风启动失败，请重试。");
    }
  }, [pushLine]);

  // 进入舞台自动开麦；离开时关麦
  useEffect(() => {
    if (phase === "act") startMic();
    return () => stopMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 轮询搭档台词
  useEffect(() => {
    if (!partner) return;
    let alive = true;
    const tick = async () => {
      const lines = await sGet(`room:${room.code}:lines:${sessionId}:${partner.userId}`);
      if (alive && Array.isArray(lines)) setPartnerLines(lines);
    };
    tick();
    const iv = setInterval(tick, 2500);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [room.code, partner?.userId, sessionId]);

  // 双方都投票落幕 → 房主推进：前两幕进幕间，第三幕收官
  useEffect(() => {
    if (phase !== "act" || !isHost) return;
    if (me?.endActVote && partner?.endActVote) {
      if (actIndex < 2) onWritePhase({ phase: "interlude", interludeFor: actIndex });
      else onWritePhase({ phase: "wrap" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.endActVote, partner?.endActVote, phase, isHost, actIndex]);

  // 离开表演阶段时，各自清掉自己的落幕票
  useEffect(() => {
    if (phase !== "act" && me?.endActVote) onUpdateMe({ endActVote: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 落幕后关麦
  useEffect(() => {
    if (phase === "wrap") stopMic();
  }, [phase, stopMic]);

  // 自动滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [myLines.length, partnerLines.length, interim]);

  // SOS 冷却计时
  useEffect(() => {
    if (sosCooldown <= 0) return;
    const t = setTimeout(() => setSosCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [sosCooldown]);

  const mergedAll = [
    ...myLines.map((l) => ({ ...l, mine: true })),
    ...partnerLines.map((l) => ({ ...l, mine: false })),
  ].sort((a, b) => a.ts - b.ts);
  const merged = mergedAll.filter((l) => (l.act || 0) === actIndex);

  // 供 AI 用的、按角色名标注的某一幕对话文本
  const nameOf = (mine) =>
    mine
      ? script?.roles?.[me?.role]?.name || "Me"
      : script?.roles?.[partner?.role]?.name || "Partner";
  const actTranscript = (idx) =>
    mergedAll
      .filter((l) => (l.act || 0) === idx)
      .map((l) => `${nameOf(l.mine)}: ${l.text}`)
      .join("\n");

  const requestSOS = async () => {
    if (sosBusy || sosCooldown > 0 || !script || !me?.role) return;
    setSosBusy(true);
    setSosHints(null);
    const myRole = script.roles[me.role];
    const recent = merged
      .slice(-8)
      .map((l) => `${l.mine ? "ME" : "PARTNER"}: ${l.text}`)
      .join("\n");
    const prompt = `You are a whisper-coach for an English roleplay practice between two Chinese B1-B2 learners.
Scenario: ${script.en} — ${script.world}
My role: ${myRole.name}, ${myRole.title}. My stance: ${myRole.stance}
My secret objective: ${myRole.tasks.main.goal}
Recent dialogue (may contain transcription errors):
${recent || "(the conversation has just started)"}

I am stuck. Give me exactly 3 hints to keep going. STRICT RULES:
- NEVER give a complete English sentence. Only give keys, not sentences.
- Hint types: "word" = a word/phrase of at most 3 English words; "stem" = a sentence opener of at most 5 English words that MUST end with "..."; "direction" = a strategy tip written in Chinese, max 15 characters, no English.
- Mix at least 2 different types.
Respond ONLY with JSON, no markdown fences: {"hints":[{"type":"word|stem|direction","text":"..."}]}`;
    try {
      const raw = await callClaude(prompt);
      const parsed = parseJSONLoose(raw);
      if (parsed?.hints?.length) {
        setSosHints(parsed.hints.slice(0, 3));
        onUpdateMe({ sosCount: (me?.sosCount || 0) + 1 });
        setSosCooldown(20);
      } else {
        showToast("提词失败了，再按一次试试", "err");
      }
    } catch {
      showToast("提词请求出错，稍后再试", "err");
    }
    setSosBusy(false);
  };

  const submitManual = () => {
    const t = manualText.trim();
    if (!t) return;
    pushLine(t, true);
    setManualText("");
  };

  if (!script || !me?.role) {
    return (
      <div className="ds-rise">
        <Notice tone="err">舞台数据不完整（剧本或角色缺失）。请返回大厅重新准备。</Notice>
        <Btn kind="panel" onClick={onLeave}>返回</Btn>
      </div>
    );
  }

  if (phase === "interlude") {
    return (
      <Interlude
        script={script}
        roomState={roomState}
        isHost={isHost}
        me={me}
        partner={partner}
        actTranscript={actTranscript}
        onWritePhase={onWritePhase}
        showToast={showToast}
      />
    );
  }

  if (phase === "wrap") {
    return (
      <ReviewFlow
        room={room}
        sessionId={sessionId}
        script={script}
        profile={profile}
        me={me}
        partner={partner}
        isHost={isHost}
        p0Items={p0Items}
        lit={lit}
        onUpdateMe={onUpdateMe}
        addToNotebook={addToNotebook}
        showToast={showToast}
        onBackLobby={async () => {
          await onUpdateMe({ endActVote: false, ready: false, guessDone: false, guessText: "" });
          if (isHost) await onWritePhase({ phase: "lobby" });
        }}
      />
    );
  }

  const dynAct = roomState?.dynActs?.[actIndex];
  const act =
    actIndex === 0
      ? { t: script.acts[0].t, d: script.acts[0].d, hook: script.hook, imageUrl: null }
      : dynAct
      ? { t: dynAct.title, d: dynAct.brief, hook: dynAct.hook, imageUrl: dynAct.imageUrl || null }
      : { t: script.acts[actIndex]?.t || `第${actIndex + 1}幕`, d: "剧情载入中…", hook: "", imageUrl: null };

  return (
    <div className="space-y-3 ds-rise">
      {/* 场景卡 */}
      <SceneCard script={script} actIndex={actIndex} imageUrl={act.imageUrl} me={me} partner={partner} />

      {/* 幕头：剧情 + 计时 */}
      <Card className="!p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ds-display text-lg">{act.t}</div>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: T.mut }}>
              {act.d || act.teaser}
            </p>
            {act.hook && (
              <p className="text-xs mt-2 leading-relaxed" style={{ color: T.spot }}>
                🎬 开场钩子：{act.hook}
              </p>
            )}
          </div>
          <ActTimer startedAt={roomState?.startedAt} minutes={ACT_MINUTES[actIndex] || 8} />
        </div>
      </Card>

      {/* P0 点亮条 */}
      <Card className="!p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs tracking-wide" style={{ color: T.faint }}>
            我的 P0 清单 · {lit.size}/{p0Items.length} 已点亮（说出来会自动亮，漏检可手动点）
          </span>
          {partner && (
            <span className="text-xs" style={{ color: T.faint }}>
              {partner.name}：{(partner.p0Lit || []).length} 盏
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p0Items.map((item) => {
            const on = lit.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleLit(item.id)}
                title={item.zh}
                className="rounded-lg px-2 py-1 text-xs transition-all"
                style={{
                  background: on ? T.spot : T.ink,
                  color: on ? "#1c1608" : T.mut,
                  border: `1px solid ${on ? T.spot : T.line}`,
                  boxShadow: on ? `0 0 10px rgba(233,180,76,.35)` : "none",
                }}
              >
                {on ? "★ " : "☆ "}
                {item.en}
              </button>
            );
          })}
        </div>
      </Card>

      {/* 字幕区 */}
      <div
        ref={scrollRef}
        className="rounded-2xl p-4 h-72 sm:h-80 overflow-y-auto space-y-2"
        style={{ background: T.ink2, border: `1px solid ${T.line}` }}
      >
        {merged.length === 0 && !interim && (
          <div className="text-sm text-center mt-16" style={{ color: T.faint }}>
            开口吧——你们的台词会实时出现在这里
            <div className="text-xs mt-1">（声音走微信语音，这里只做字幕）</div>
          </div>
        )}
        {merged.map((l, i) => (
          <div key={i} className={`flex ${l.mine ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed"
              style={{
                background: l.mine ? "rgba(233,180,76,0.13)" : T.panel,
                border: `1px solid ${l.mine ? "rgba(233,180,76,0.4)" : T.line}`,
              }}
            >
              {l.text}
              {l.manual && (
                <span className="text-xs ml-1" style={{ color: T.faint }}>
                  ✎
                </span>
              )}
            </div>
          </div>
        ))}
        {interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm" style={{ color: T.faint }}>
              {interim}…
            </div>
          </div>
        )}
      </div>

      {micErr && <Notice tone="err">{micErr}</Notice>}

      {/* SOS 提词展示 */}
      {(sosBusy || sosHints) && (
        <Card className="!p-4 ds-rise" style={{ border: `1px dashed ${T.spot}` }}>
          <div className="text-xs mb-2" style={{ color: T.spot }}>
            🗝 悄悄话（仅你可见）——这些只是钥匙，句子还得你自己说完
          </div>
          {sosBusy ? (
            <div className="text-sm" style={{ color: T.faint }}>
              教练正在耳语…
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sosHints.map((h, i) => (
                <span
                  key={i}
                  className="rounded-lg px-2.5 py-1.5 text-sm"
                  style={{
                    background: T.ink,
                    border: `1px solid ${T.line}`,
                    color: h.type === "direction" ? T.mut : T.text,
                  }}
                >
                  {h.type === "stem" ? "✏️ " : h.type === "direction" ? "🧭 " : "💡 "}
                  {h.text}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 控制台 */}
      <div className="flex gap-2 items-stretch">
        <Btn kind="panel" onClick={micOn ? stopMic : startMic} className="flex-shrink-0">
          {micOn ? "🎙 开麦中" : "🔇 已静麦"}
        </Btn>
        <Btn onClick={requestSOS} disabled={sosBusy || sosCooldown > 0} className="flex-shrink-0">
          {sosCooldown > 0 ? `SOS ${sosCooldown}s` : "SOS 提词"}
        </Btn>
        <Btn
          kind="ghost"
          onClick={() => onUpdateMe({ endActVote: !me?.endActVote })}
          className="flex-1"
        >
          {me?.endActVote
            ? partner?.endActVote
              ? "落幕中…"
              : "等搭档确认落幕"
            : partner?.endActVote
            ? `${partner.name} 提议落幕 · 我也同意`
            : "结束本幕"}
        </Btn>
      </div>

      {/* 手动补录 */}
      <div className="flex gap-2">
        <input
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitManual()}
          placeholder="识别漏了？在这里打字补一句（英文）"
          className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: T.ink, border: `1px solid ${T.line}`, color: T.text }}
        />
        <Btn kind="panel" onClick={submitManual} disabled={!manualText.trim()}>
          补录
        </Btn>
      </div>
    </div>
  );
}

function ActTimer({ startedAt, minutes }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - (startedAt || now)) / 1000));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const over = elapsed >= minutes * 60;
  return (
    <div className="text-right flex-shrink-0">
      <div className="ds-mono text-lg" style={{ color: over ? T.spot : T.mut }}>
        {mm}:{ss}
      </div>
      <div className="text-xs" style={{ color: T.faint }}>
        {over ? "可以推进剧情了" : `软计时 ${minutes} 分钟`}
      </div>
    </div>
  );
}

/* ================= 谢幕与复盘由 M5 的 ReviewFlow 接管 ================= */

function StatCard({ label, value, unit }) {
  return (
    <Card className="!p-4 text-center">
      <div className="ds-display text-2xl" style={{ color: T.spot }}>
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: T.faint }}>
        {label}
        {unit ? ` · ${unit}` : ""}
      </div>
    </Card>
  );
}

/* ================= M4 · 幕间 + 动态剧情 + 场景卡 ================= */

// 图片生成接口预留：接入自备模型时定义 window.DUO_IMAGE_API = async (prompt) => imageUrl
async function generateSceneImage(prompt) {
  try {
    if (typeof window.DUO_IMAGE_API === "function") {
      const url = await window.DUO_IMAGE_API(prompt);
      if (typeof url === "string" && url) return url;
    }
  } catch {}
  return null; // 未接入时降级为程序化场景卡
}

function buildInterludePrompt(script, endedIdx, transcript, roleA, roleB) {
  const nextIdx = endedIdx + 1;
  const outline = script.acts.map((a, i) => `${i + 1}. ${a.t}: ${a.d || a.teaser}`).join("\n");
  return `You are the playwright-coach of a two-person English roleplay for Chinese B1-B2 learners.

SCENARIO: ${script.en}. ${script.world}
CHARACTERS: ${roleA.name} (${roleA.title}, stance: ${roleA.stance}) and ${roleB.name} (${roleB.title}, stance: ${roleB.stance}).
PLANNED 3-ACT OUTLINE:
${outline}

ACT ${endedIdx + 1} JUST ENDED. Actual transcript (browser STT, may contain recognition errors — infer meaning from context):
${transcript || "(transcript is empty — the pair likely used the fallback; still write a coherent next act)"}

Produce TWO things for act ${nextIdx + 1}:

1) "coach": 1-2 tips shown to BOTH players during the intermission. Requirements: written in Chinese; each tip max 30 Chinese characters; concrete micro-adjustments usable in the next act (e.g. vocabulary upgrades based on what they actually said, or a conversational tactic); never single out or blame one player; total max 60 words.

2) "nextAct": the next act, CONTINUING from what they actually said (reference at least one concrete thing from the transcript). Fields:
- "title": Chinese, format "第${["一", "二", "三"][nextIdx]}幕 · Two-to-four-character subtitle"
- "brief": Chinese plot advancement, max 80 characters, must raise the stakes per the planned outline
- "hook": Chinese, one sentence telling WHICH character opens the act and with what kind of line (do not write the English line itself)
- "imagePrompt": English image-generation prompt for the scene, one sentence, describing setting, the two characters' body language and mood, cinematic lighting

Respond ONLY with JSON, no markdown fences:
{"coach":["..."],"nextAct":{"title":"...","brief":"...","hook":"...","imagePrompt":"..."}}`;
}

function Interlude({ script, roomState, isHost, me, partner, actTranscript, onWritePhase, showToast }) {
  const endedIdx = roomState?.interludeFor ?? 0;
  const nextIdx = endedIdx + 1;
  const nextReady = !!roomState?.dynActs?.[nextIdx];
  const coachTips = roomState?.coach?.[nextIdx] || null;
  const genRef = useRef(false);
  const [genErr, setGenErr] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  // 房主负责生成（一次），结果写入共享状态
  useEffect(() => {
    if (!isHost || nextReady || genRef.current) return;
    genRef.current = true;
    (async () => {
      try {
        const roleA = script.roles.A;
        const roleB = script.roles.B;
        const raw = await callClaude(
          buildInterludePrompt(script, endedIdx, actTranscript(endedIdx), roleA, roleB)
        );
        const parsed = parseJSONLoose(raw);
        if (!parsed?.nextAct?.brief) throw new Error("bad json");
        // 图片：接口已接入则生成，否则降级 SVG 场景卡
        let imageUrl = null;
        if (parsed.nextAct.imagePrompt) {
          imageUrl = await generateSceneImage(parsed.nextAct.imagePrompt);
        }
        await onWritePhase({
          dynActs: { ...(roomState?.dynActs || {}), [nextIdx]: { ...parsed.nextAct, imageUrl } },
          coach: { ...(roomState?.coach || {}), [nextIdx]: (parsed.coach || []).slice(0, 2) },
        });
      } catch {
        setGenErr(true);
        genRef.current = false; // 允许重试
        showToast("下一幕生成失败，可重试", "err");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, nextReady, retryTick]);

  const openNextAct = () =>
    onWritePhase({ phase: "act", actIndex: nextIdx, startedAt: Date.now() });

  return (
    <div className="space-y-4 ds-rise">
      {/* 落幕帷幕 */}
      <Card className="text-center !py-8">
        <svg viewBox="0 0 200 60" className="w-40 mx-auto" aria-hidden>
          <path d="M0 0 H200 V14 Q150 28 100 14 Q50 28 0 14 Z" fill={T.rose} opacity="0.6" />
          <path d="M0 0 H200 V8 Q150 20 100 8 Q50 20 0 8 Z" fill={T.rose} opacity="0.9" />
        </svg>
        <div className="ds-display text-xl mt-3">
          {script.acts[endedIdx]?.t || `第${endedIdx + 1}幕`} · 落幕
        </div>
        <p className="text-sm mt-1" style={{ color: T.faint }}>
          幕间休息——喝口水，看看教练的悄悄话
        </p>
      </Card>

      {/* 教练插话 */}
      <Card style={{ border: `1px dashed ${T.spot}` }}>
        <div className="text-xs mb-2" style={{ color: T.spot }}>
          🎓 教练插话（给你们俩的）
        </div>
        {coachTips ? (
          <div className="space-y-1.5">
            {coachTips.map((t, i) => (
              <div key={i} className="text-sm leading-relaxed">
                · {t}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm ds-pulse" style={{ color: T.faint, animation: "ds-breathe 1.6s infinite" }}>
            教练在翻你们刚才的台词…
          </div>
        )}
      </Card>

      {/* 下一幕预告 */}
      <Card>
        <div className="text-xs mb-2" style={{ color: T.faint }}>
          下一幕
        </div>
        {nextReady ? (
          <div className="ds-rise">
            <SceneCard
              script={script}
              actIndex={nextIdx}
              imageUrl={roomState.dynActs[nextIdx].imageUrl}
              me={me}
              partner={partner}
            />
            <div className="ds-display text-lg mt-3">{roomState.dynActs[nextIdx].title}</div>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: T.mut }}>
              {roomState.dynActs[nextIdx].brief}
            </p>
          </div>
        ) : genErr && isHost ? (
          <div>
            <Notice tone="err">生成失败了。</Notice>
            <Btn kind="panel" onClick={() => { setGenErr(false); genRef.current = false; setRetryTick((t) => t + 1); }}>
              重试生成
            </Btn>
          </div>
        ) : (
          <div className="text-sm ds-pulse" style={{ color: T.faint, animation: "ds-breathe 1.6s infinite" }}>
            编剧正在根据你们刚才真实聊的内容写下一幕…
          </div>
        )}
      </Card>

      <Btn className="w-full" disabled={!nextReady || !isHost} onClick={openNextAct}>
        {!nextReady ? "等下一幕就绪…" : isHost ? `拉开${["第二幕", "第三幕"][endedIdx]} 🎬` : "等房主开幕"}
      </Btn>
    </div>
  );
}

/* 程序化场景卡：接入图片模型后自动换成真图 */
function SceneCard({ script, actIndex, imageUrl, me, partner }) {
  if (imageUrl) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.line}` }}>
        <img src={imageUrl} alt="scene" className="w-full h-36 object-cover" />
      </div>
    );
  }
  const moods = [
    { sky: "#2A3157", glow: T.spot, label: "dusk" }, // 第一幕：暮色
    { sky: "#3A2740", glow: T.rose, label: "tension" }, // 第二幕：暗涌
    { sky: "#22384A", glow: T.jade, label: "dawn" }, // 第三幕：破晓
  ];
  const m = moods[actIndex] || moods[0];
  const genreEmoji = { 职场会议: "💼", 观点交锋: "⚖️", 社交闲聊: "🥂" }[script.genre] || "🎭";
  const nameA = script.roles[me?.role]?.name || "A";
  const nameB = script.roles[partner?.role]?.name || "B";
  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ border: `1px solid ${T.line}` }}>
      <svg viewBox="0 0 400 110" className="w-full block" aria-hidden>
        <rect width="400" height="110" fill={m.sky} />
        <circle cx="330" cy="26" r="14" fill={m.glow} opacity="0.5" />
        <ellipse cx="120" cy="118" rx="90" ry="26" fill={m.glow} opacity="0.10" />
        <ellipse cx="280" cy="118" rx="90" ry="26" fill={m.glow} opacity="0.10" />
        {/* 两个人物剪影 */}
        <g opacity="0.85">
          <circle cx="150" cy="62" r="10" fill="#0F1322" />
          <path d="M132 100 Q150 74 168 100 Z" fill="#0F1322" />
          <circle cx="250" cy="62" r="10" fill="#0F1322" />
          <path d="M232 100 Q250 74 268 100 Z" fill="#0F1322" />
        </g>
        <text x="150" y="107" textAnchor="middle" fontSize="9" fill={T.text} opacity="0.85">
          {nameA}（你）
        </text>
        <text x="250" y="107" textAnchor="middle" fontSize="9" fill={T.text} opacity="0.75">
          {nameB}
        </text>
        <text x="14" y="24" fontSize="14">
          {genreEmoji}
        </text>
      </svg>
    </div>
  );
}

/* ================= M5 · 揭牌仪式 + 复盘报告 + 复习本 ================= */

const FILLER_WORDS = ["you know", "like", "actually", "basically", "kind of", "sort of", "i mean"];
function countFillers(lines) {
  const text = " " + lines.map((l) => l.text.toLowerCase()).join(" ") + " ";
  return FILLER_WORDS.map((w) => ({
    word: w,
    count: (text.match(new RegExp(`[^a-z]${w.replace(/ /g, "[^a-z]")}[^a-z]`, "g")) || []).length,
  }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function buildVerdictPrompt(script, transcript, guessAboutB, guessAboutA) {
  const A = script.roles.A;
  const B = script.roles.B;
  return `You are the judge of a two-person English roleplay for Chinese B1-B2 learners. Transcript is from browser STT and may contain recognition errors — infer meaning charitably from context; never penalize transcription noise.

SCENARIO: ${script.en}. ${script.world}
ROLE A: ${A.name} (${A.title}). Secret main task: ${A.tasks.main.goal} Judging criterion: ${A.tasks.main.judge} Bonus task: ${A.tasks.bonus.goal}
ROLE B: ${B.name} (${B.title}). Secret main task: ${B.tasks.main.goal} Judging criterion: ${B.tasks.main.judge} Bonus task: ${B.tasks.bonus.goal}
A's guess of B's secret task: "${guessAboutB}"
B's guess of A's secret task: "${guessAboutA}"

FULL TRANSCRIPT:
${transcript || "(empty)"}

Judge and score. Rules:
- Task verdicts: "perfect" (achieved AND the tactic felt natural / undetected), "partial" (achieved but clumsy, or clearly attempted with real progress), "missed". Evidence must quote a short line from the transcript (or "无" if none). For "missed", the note must include one concrete Chinese suggestion starting with 「如果当时说」. All notes in Chinese, encouraging, max 40 chars each.
- Guess hit: true if the guess captures the core intent of the other's main task.
- Team score dims (fixed names/max): 任务完成度/30, 剧情推进与接话/25, 博弈质量/25, 表达丰富度/20. Score generously but honestly; notes in Chinese max 20 chars.
- highlights: 2 items, one per role, each quoting a genuinely good line they said with a Chinese note (max 20 chars) why it shines.

Respond ONLY with JSON, no markdown fences:
{"team":{"total":0,"dims":[{"name":"任务完成度","score":0,"max":30,"note":""},{"name":"剧情推进与接话","score":0,"max":25,"note":""},{"name":"博弈质量","score":0,"max":25,"note":""},{"name":"表达丰富度","score":0,"max":20,"note":""}],"highlights":[{"role":"A","quote":"","note":""},{"role":"B","quote":"","note":""}]},"tasks":{"A":{"verdict":"","evidence":"","note":""},"B":{"verdict":"","evidence":"","note":""}},"guesses":{"A":{"hit":false,"note":""},"B":{"hit":false,"note":""}}}`;
}

function buildReportsPrompt(script, transcript) {
  const A = script.roles.A;
  const B = script.roles.B;
  return `You are an English coach reviewing a roleplay transcript of two Chinese B1-B2 learners. Transcript from browser STT — may contain errors; only pick sentences that are clearly the speaker's real phrasing.

SCENARIO: ${script.en}. Role A: ${A.name} (${A.title}). Role B: ${B.name} (${B.title}).
TRANSCRIPT:
${transcript || "(empty)"}

For EACH role, produce a personal report:
- "upgrades": exactly up to 3. "orig" must be a near-verbatim sentence that role actually said; "better" is the natural native rewrite; "why" in Chinese, max 20 chars. Pick sentences where the upgrade teaches the most.
- "keepers": up to 2 genuinely good sentences they produced themselves (not from the phrase card if possible). "why" in Chinese, max 15 chars.
- "grammar": up to 2 recurring error PATTERNS (not one-off slips), each one Chinese line with a tiny example, max 30 chars. If none, empty array.
- "badge": a unique fun badge per role (different from each other), emoji + Chinese name (2-4 chars) + Chinese reason (max 20 chars).
Tone: constructive, specific, never mocking. If transcript is too thin for a field, return fewer items.

Respond ONLY with JSON, no markdown fences:
{"A":{"upgrades":[{"orig":"","better":"","why":""}],"keepers":[{"quote":"","why":""}],"grammar":[""],"badge":{"emoji":"","name":"","reason":""}},"B":{"upgrades":[],"keepers":[],"grammar":[],"badge":{"emoji":"","name":"","reason":""}}}`;
}

const VERDICT_UI = {
  perfect: { emoji: "🏆", label: "完美达成", color: T.spot },
  partial: { emoji: "✅", label: "部分达成", color: T.jade },
  missed: { emoji: "❌", label: "未达成", color: T.rose },
};

function ReviewFlow({ room, sessionId, script, profile, me, partner, isHost, p0Items, lit, onUpdateMe, addToNotebook, showToast, onBackLobby }) {
  const [allMine, setAllMine] = useState([]);
  const [allTheirs, setAllTheirs] = useState([]);
  const [linesLoaded, setLinesLoaded] = useState(false);
  const [review, setReview] = useState(null);
  const [guess, setGuess] = useState("");
  const [genErr, setGenErr] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [saved, setSaved] = useState(false);
  const [unpicked, setUnpicked] = useState(new Set());
  const genRef = useRef(false);

  const myL = me?.role;
  const pL = partner?.role;
  const bothGuessed = !!me?.guessDone && !!partner?.guessDone;

  // 台词与 review 以存储为准（防刷新丢失）
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const [a, b, rv] = await Promise.all([
        sGet(`room:${room.code}:lines:${sessionId}:${profile.id}`),
        partner ? sGet(`room:${room.code}:lines:${sessionId}:${partner.userId}`) : Promise.resolve(null),
        sGet(`room:${room.code}:review`),
      ]);
      if (!alive) return;
      if (Array.isArray(a)) setAllMine(a);
      if (Array.isArray(b)) setAllTheirs(b);
      if (rv) setReview(rv);
      setLinesLoaded(true);
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [room.code, profile.id, partner?.userId]);

  const transcript = React.useMemo(() => {
    if (!script || !myL) return "";
    const nm = script.roles[myL]?.name || "Me";
    const np = script.roles[pL]?.name || "Partner";
    return [...allMine.map((l) => ({ ...l, who: nm })), ...allTheirs.map((l) => ({ ...l, who: np }))]
      .sort((x, y) => x.ts - y.ts)
      .map((l) => `[Act ${(l.act || 0) + 1}] ${l.who}: ${l.text}`)
      .join("\n");
  }, [allMine, allTheirs, myL, pL, script]);

  // 房主生成复盘（两次调用：判定 + 双人报告）
  useEffect(() => {
    if (!isHost || !bothGuessed || review || genRef.current || !partner || !linesLoaded) return;
    genRef.current = true;
    (async () => {
      try {
        const meGuess = me.guessText || "(未猜)";
        const pGuess = partner.guessText || "(未猜)";
        const guessAboutB = myL === "A" ? meGuess : pGuess;
        const guessAboutA = myL === "B" ? meGuess : pGuess;
        const p1 = parseJSONLoose(await callClaude(buildVerdictPrompt(script, transcript, guessAboutB, guessAboutA)));
        if (!p1?.tasks) throw new Error("bad1");
        const p2 = parseJSONLoose(await callClaude(buildReportsPrompt(script, transcript)));
        if (!p2?.A) throw new Error("bad2");
        const rv = { part1: p1, part2: p2, at: Date.now() };
        await sSet(`room:${room.code}:review`, rv);
        setReview(rv);
      } catch {
        setGenErr(true);
        genRef.current = false;
        showToast("复盘生成失败，可重试", "err");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, bothGuessed, review, retryTick, linesLoaded]);

  // ---------- Step 1 · 互猜 ----------
  if (!me?.guessDone) {
    const pRole = script.roles[pL] || {};
    return (
      <div className="space-y-4 ds-rise">
        <StepHeader step={1} />
        <Card>
          <div className="ds-display text-xl mb-1">先别急着揭牌——猜猜看</div>
          <p className="text-sm leading-relaxed" style={{ color: T.mut }}>
            {partner?.name} 饰演的 {pRole.name}（{pRole.title}）从头到尾都揣着一个隐藏任务。回想 TA
            刚才的话术：TA 到底想从你这里得到什么？猜中有团队分加成。
          </p>
          <textarea
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="我猜 TA 的隐藏任务是……（中文即可）"
            rows={3}
            className="w-full mt-3 rounded-xl px-4 py-3 text-sm outline-none resize-none"
            style={{ background: T.ink, border: `1px solid ${T.line}`, color: T.text }}
          />
          <div className="flex gap-2 mt-3">
            <Btn
              className="flex-1"
              disabled={!guess.trim()}
              onClick={() => onUpdateMe({ guessDone: true, guessText: guess.trim() })}
            >
              锁定我的猜测
            </Btn>
            <Btn kind="ghost" onClick={() => onUpdateMe({ guessDone: true, guessText: "(跳过)" })}>
              不猜了，直接揭牌
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  // ---------- Step 1.5 · 等搭档 ----------
  if (!bothGuessed) {
    return (
      <div className="space-y-4 ds-rise">
        <StepHeader step={1} />
        <Card className="text-center !py-8">
          <div className="ds-pulse text-sm" style={{ color: T.faint, animation: "ds-breathe 1.6s infinite" }}>
            {partner?.name} 还在琢磨你的套路…
          </div>
        </Card>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="我的台词" value={allMine.length} unit="句" />
          <StatCard label="P0 点亮" value={`${lit.size}/${p0Items.length}`} unit="盏" />
          <StatCard label="SOS" value={me?.sosCount || 0} unit="次" />
        </div>
      </div>
    );
  }

  // ---------- Step 2/3 · 揭牌 + 报告 ----------
  const myRole = script.roles[myL];
  const pRole = script.roles[pL];
  const p1 = review?.part1;
  const p2 = review?.part2;
  const myReport = p2?.[myL];
  const myVerdict = p1?.tasks?.[myL];
  const pVerdict = p1?.tasks?.[pL];
  const myGuessJudge = p1?.guesses?.[myL];
  const pGuessJudge = p1?.guesses?.[pL];
  const fillers = countFillers(allMine);
  const myWords = allMine.reduce((n, l) => n + l.text.split(/\s+/).length, 0);
  const theirWords = allTheirs.reduce((n, l) => n + l.text.split(/\s+/).length, 0);
  const sharePct = myWords + theirWords > 0 ? Math.round((myWords / (myWords + theirWords)) * 100) : 50;
  const p0Missed = p0Items.filter((it) => !lit.has(it.id));

  // 复习本候选
  const picks = [];
  if (myReport) {
    (myReport.upgrades || []).forEach((u, i) =>
      picks.push({ key: `u${i}`, label: `升级句 · ${u.better}`, entry: { type: "upgrade", prompt: u.orig, target: u.better, note: u.why, source: script.title } })
    );
    (myReport.keepers || []).forEach((k, i) =>
      picks.push({ key: `k${i}`, label: `我的好句 · ${k.quote}`, entry: { type: "keeper", prompt: `《${script.title}》里你的高光`, target: k.quote, note: k.why, source: script.title } })
    );
    p0Missed.forEach((m, i) =>
      picks.push({ key: `p${i}`, label: `没用上的 P0 · ${m.en}`, entry: { type: "p0", prompt: m.zh, target: m.en, note: "", source: script.title } })
    );
    (myReport.grammar || []).forEach((g, i) =>
      picks.push({ key: `g${i}`, label: `语法模式 · ${g}`, entry: { type: "grammar", prompt: g, target: "", note: "", source: script.title } })
    );
  }

  return (
    <div className="space-y-4 ds-rise">
      <StepHeader step={review ? 3 : 2} />

      {/* 揭牌 */}
      <Card style={{ border: `1px dashed ${T.spot}` }}>
        <div className="ds-display text-xl mb-3 text-center">🎭 揭牌</div>
        <div className="space-y-3">
          <RevealRow
            title={`你（${myRole.name}）的隐藏任务`}
            task={myRole.tasks.main.goal}
            bonus={myRole.tasks.bonus.goal}
            guessLabel={`${partner.name} 猜你：`}
            guessText={partner.guessText}
            judge={pGuessJudge}
          />
          <RevealRow
            title={`${partner.name}（${pRole.name}）的隐藏任务`}
            task={pRole.tasks.main.goal}
            bonus={pRole.tasks.bonus.goal}
            guessLabel="你猜 TA："
            guessText={me.guessText}
            judge={myGuessJudge}
          />
        </div>
      </Card>

      {/* 判定与报告 */}
      {!review ? (
        <Card className="text-center !py-8">
          {genErr && isHost ? (
            <div>
              <Notice tone="err">复盘生成失败了。</Notice>
              <Btn kind="panel" onClick={() => { setGenErr(false); genRef.current = false; setRetryTick((t) => t + 1); }}>
                重试生成
              </Btn>
            </div>
          ) : (
            <div className="ds-pulse text-sm" style={{ color: T.faint, animation: "ds-breathe 1.6s infinite" }}>
              裁判正在逐句复核你们的对话…（约 20 秒）
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* 任务判定 */}
          <Card>
            <div className="ds-display text-lg mb-3">任务判定</div>
            <VerdictRow who={`你 · ${myRole.name}`} v={myVerdict} />
            <div className="my-2" style={{ borderTop: `1px dashed ${T.line}` }} />
            <VerdictRow who={`${partner.name} · ${pRole.name}`} v={pVerdict} />
          </Card>

          {/* 团队分 */}
          {p1?.team && (
            <Card>
              <div className="flex items-baseline justify-between mb-3">
                <div className="ds-display text-lg">团队分</div>
                <div>
                  <span className="ds-display text-3xl" style={{ color: T.spot }}>
                    {p1.team.total}
                  </span>
                  <span className="text-xs ml-1" style={{ color: T.faint }}>
                    / 100
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {(p1.team.dims || []).map((d, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span style={{ color: T.mut }}>{d.name}</span>
                      <span style={{ color: T.faint }}>
                        {d.score}/{d.max} {d.note ? `· ${d.note}` : ""}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: T.ink }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (d.score / d.max) * 100)}%`, background: T.spot }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs" style={{ color: T.faint }}>
                发言占比：你 {sharePct}% · {partner.name} {100 - sharePct}%（仅呈现，不计分）
              </div>
              {(p1.team.highlights || []).length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {p1.team.highlights.map((h, i) => (
                    <div key={i} className="text-sm rounded-xl px-3 py-2" style={{ background: T.ink, border: `1px solid ${T.line}` }}>
                      ✨ <span style={{ color: T.jade }}>{h.quote}</span>
                      <span className="text-xs ml-2" style={{ color: T.faint }}>
                        — {script.roles[h.role]?.name} · {h.note}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* 我的报告 */}
          {myReport && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="ds-display text-lg">我的报告</div>
                {myReport.badge?.name && (
                  <span
                    className="text-sm rounded-lg px-2.5 py-1"
                    style={{ background: "rgba(233,180,76,0.12)", border: `1px solid ${T.spot}`, color: T.spot }}
                    title={myReport.badge.reason}
                  >
                    {myReport.badge.emoji} {myReport.badge.name}
                  </span>
                )}
              </div>

              {(myReport.upgrades || []).length > 0 && (
                <div className="mb-4">
                  <div className="text-xs mb-2" style={{ color: T.spot }}>
                    可以升级（你的原句 → 更地道）
                  </div>
                  <div className="space-y-2">
                    {myReport.upgrades.map((u, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: T.ink, border: `1px solid ${T.line}` }}>
                        <div className="text-sm line-through" style={{ color: T.faint }}>
                          {u.orig}
                        </div>
                        <div className="text-sm mt-1 flex items-start justify-between gap-2">
                          <span style={{ color: T.jade }}>→ {u.better}</span>
                          <SpeakBtn text={u.better} />
                        </div>
                        <div className="text-xs mt-1" style={{ color: T.mut }}>
                          {u.why}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(myReport.keepers || []).length > 0 && (
                <div className="mb-4">
                  <div className="text-xs mb-2" style={{ color: T.jade }}>
                    继续保持（你自己说出的好句）
                  </div>
                  {myReport.keepers.map((k, i) => (
                    <div key={i} className="text-sm rounded-xl px-3 py-2 mb-1.5" style={{ background: "rgba(127,182,155,0.08)", border: `1px solid rgba(127,182,155,0.4)` }}>
                      {k.quote}
                      <span className="text-xs ml-2" style={{ color: T.faint }}>
                        {k.why}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl p-3" style={{ background: T.ink, border: `1px solid ${T.line}` }}>
                  <div style={{ color: T.faint }}>口头禅</div>
                  {fillers.length ? (
                    fillers.map((f, i) => (
                      <div key={i} className="mt-1">
                        “{f.word}” × {f.count}
                      </div>
                    ))
                  ) : (
                    <div className="mt-1" style={{ color: T.jade }}>
                      很干净 ✓
                    </div>
                  )}
                </div>
                <div className="rounded-xl p-3" style={{ background: T.ink, border: `1px solid ${T.line}` }}>
                  <div style={{ color: T.faint }}>语法模式（最多 2 条）</div>
                  {(myReport.grammar || []).length ? (
                    myReport.grammar.map((g, i) => (
                      <div key={i} className="mt-1 leading-relaxed">
                        {g}
                      </div>
                    ))
                  ) : (
                    <div className="mt-1" style={{ color: T.jade }}>
                      无反复出现的问题 ✓
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs mt-3" style={{ color: T.faint }}>
                P0 覆盖 {lit.size}/{p0Items.length} · SOS {me?.sosCount || 0} 次
                {(me?.sosCount || 0) === 0 ? "（全自立 🏅）" : ""}
              </div>
            </Card>
          )}

          {/* 入复习本 */}
          {picks.length > 0 && (
            <Card>
              <div className="ds-display text-lg mb-1">存入复习本</div>
              <p className="text-xs mb-3" style={{ color: T.faint }}>
                默认全选。下次开演前复测这些内容，这一场才算真正长在你身上。
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {picks.map((p) => {
                  const off = unpicked.has(p.key);
                  return (
                    <button
                      key={p.key}
                      className="w-full flex items-start gap-2 text-left"
                      onClick={() =>
                        setUnpicked((s) => {
                          const n = new Set(s);
                          if (n.has(p.key)) n.delete(p.key);
                          else n.add(p.key);
                          return n;
                        })
                      }
                    >
                      <span
                        className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded text-xs flex-shrink-0"
                        style={{ background: off ? T.ink : T.jade, border: `1px solid ${off ? T.line : T.jade}`, color: "#12291f" }}
                      >
                        {off ? "" : "✓"}
                      </span>
                      <span className="text-xs leading-relaxed" style={{ color: off ? T.faint : T.text }}>
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Btn
                className="w-full mt-3"
                disabled={saved || picks.every((p) => unpicked.has(p.key))}
                onClick={async () => {
                  await addToNotebook(picks.filter((p) => !unpicked.has(p.key)).map((p) => p.entry));
                  setSaved(true);
                }}
              >
                {saved ? "已存入 ✓" : `存入复习本（${picks.filter((p) => !unpicked.has(p.key)).length} 条）`}
              </Btn>
            </Card>
          )}

          <Btn kind="panel" className="w-full" onClick={onBackLobby}>
            {isHost ? "谢幕 · 返回大厅" : "谢幕 · 返回大厅（等房主重置）"}
          </Btn>
        </>
      )}
    </div>
  );
}

function StepHeader({ step }) {
  const steps = ["互猜", "揭牌", "报告"];
  return (
    <div className="flex items-center justify-center gap-2 text-xs">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <span
            className="rounded-full px-2.5 py-1"
            style={{
              background: i + 1 <= step ? T.spot : T.ink,
              color: i + 1 <= step ? "#1c1608" : T.faint,
              border: `1px solid ${i + 1 <= step ? T.spot : T.line}`,
            }}
          >
            {i + 1} {s}
          </span>
          {i < steps.length - 1 && <span style={{ color: T.faint }}>—</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

function RevealRow({ title, task, bonus, guessLabel, guessText, judge }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.ink, border: `1px solid ${T.line}` }}>
      <div className="text-xs" style={{ color: T.spot }}>
        {title}
      </div>
      <div className="text-sm mt-1 leading-relaxed">{task}</div>
      <div className="text-xs mt-1" style={{ color: T.mut }}>
        彩蛋：{bonus}
      </div>
      <div className="text-xs mt-2 pt-2 leading-relaxed" style={{ borderTop: `1px dashed ${T.line}`, color: T.faint }}>
        {guessLabel}“{guessText || "(未猜)"}”
        {judge && (
          <span className="ml-1" style={{ color: judge.hit ? T.jade : T.rose }}>
            {judge.hit ? "猜中了！+加成" : "没猜中"}
            {judge.note ? ` · ${judge.note}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function VerdictRow({ who, v }) {
  if (!v) return null;
  const ui = VERDICT_UI[v.verdict] || VERDICT_UI.partial;
  return (
    <div className="py-1">
      <div className="flex items-center gap-2 text-sm">
        <span>{ui.emoji}</span>
        <span className="font-medium">{who}</span>
        <span style={{ color: ui.color }}>{ui.label}</span>
      </div>
      {v.evidence && v.evidence !== "无" && (
        <div className="text-xs mt-1 leading-relaxed" style={{ color: T.mut }}>
          证据：“{v.evidence}”
        </div>
      )}
      {v.note && (
        <div className="text-xs mt-0.5 leading-relaxed" style={{ color: T.faint }}>
          {v.note}
        </div>
      )}
    </div>
  );
}

/* ================= 复习本 + 快速复测 ================= */

const NB_TYPE = {
  upgrade: { label: "升级句", ask: (e) => `更地道地说：“${e.prompt}”` },
  keeper: { label: "我的好句", ask: (e) => `好句时间——${e.prompt}，还记得那句话吗？` },
  p0: { label: "P0 表达", ask: (e) => `说出英文表达：${e.prompt}` },
  grammar: { label: "语法模式", ask: (e) => `语法自查——${e.prompt}。口头造一个正确的例句。` },
};

function NotebookView({ notebook, onSave, onBack }) {
  const [quiz, setQuiz] = useState(null); // {items, idx, revealed}
  const active = notebook.filter((e) => !e.archived);
  const archived = notebook.filter((e) => e.archived);

  const startQuiz = () => {
    const items = [...active].sort((a, b) => (a.mastery || 0) - (b.mastery || 0)).slice(0, 5);
    setQuiz({ items, idx: 0, revealed: false, done: 0 });
  };

  const grade = async (remembered) => {
    const item = quiz.items[quiz.idx];
    const next = notebook.map((e) => {
      if (e.id !== item.id) return e;
      const m = remembered ? (e.mastery || 0) + 1 : 0;
      return { ...e, mastery: m, archived: m >= 2 };
    });
    await onSave(next);
    if (quiz.idx + 1 < quiz.items.length) {
      setQuiz({ ...quiz, idx: quiz.idx + 1, revealed: false, done: quiz.done + 1 });
    } else {
      setQuiz({ ...quiz, idx: quiz.idx, finished: true });
    }
  };

  if (quiz && !quiz.finished) {
    const item = quiz.items[quiz.idx];
    const t = NB_TYPE[item.type] || NB_TYPE.p0;
    return (
      <div className="space-y-4 ds-rise">
        <div className="text-xs text-center" style={{ color: T.faint }}>
          快速复测 · {quiz.idx + 1} / {quiz.items.length}
        </div>
        <Card className="!py-8 text-center">
          <div className="text-xs mb-2" style={{ color: T.spot }}>
            {t.label}
          </div>
          <div className="text-base leading-relaxed px-2">{t.ask(item)}</div>
          {!quiz.revealed ? (
            <Btn className="mt-5" onClick={() => setQuiz({ ...quiz, revealed: true })}>
              我说出来了，看答案
            </Btn>
          ) : (
            <div className="mt-5 ds-rise">
              {item.target && (
                <div className="text-lg" style={{ color: T.jade }}>
                  {item.target} <SpeakBtn text={item.target} />
                </div>
              )}
              {item.note && (
                <div className="text-xs mt-1" style={{ color: T.mut }}>
                  {item.note}
                </div>
              )}
              <div className="flex gap-2 mt-4 justify-center">
                <Btn onClick={() => grade(true)}>✅ 记得</Btn>
                <Btn kind="panel" onClick={() => grade(false)}>
                  😵 忘了
                </Btn>
              </div>
            </div>
          )}
        </Card>
        <div className="text-center">
          <button className="text-xs underline" style={{ color: T.faint }} onClick={() => setQuiz(null)}>
            退出复测
          </button>
        </div>
      </div>
    );
  }

  if (quiz?.finished) {
    return (
      <div className="space-y-4 ds-rise">
        <Card className="text-center !py-8">
          <div className="ds-display text-2xl">复测完成 🎉</div>
          <p className="text-sm mt-2" style={{ color: T.mut }}>
            连续两次记得的条目会自动归档——它们已经长在你身上了。
          </p>
          <Btn className="mt-4" onClick={() => setQuiz(null)}>
            回到复习本
          </Btn>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 ds-rise">
      <button className="text-sm underline" style={{ color: T.faint }} onClick={onBack}>
        ← 返回
      </button>
      <Card>
        <div className="flex items-center justify-between">
          <div className="ds-display text-xl">📔 我的复习本</div>
          <span className="text-xs" style={{ color: T.faint }}>
            待复习 {active.length} · 已长在身上 {archived.length}
          </span>
        </div>
        {active.length > 0 && (
          <Btn className="w-full mt-3" onClick={startQuiz}>
            快速复测（{Math.min(5, active.length)} 条 · 约 2 分钟）
          </Btn>
        )}
      </Card>

      {active.length === 0 && archived.length === 0 && (
        <Notice>复习本还是空的。演完一场戏、在复盘页把升级句和好句一键存进来，闭环就转起来了。</Notice>
      )}

      {active.map((e) => (
        <NBRow key={e.id} e={e} />
      ))}
      {archived.length > 0 && (
        <div>
          <div className="text-xs px-1 mb-2" style={{ color: T.faint }}>
            已归档（连续两次记得）
          </div>
          {archived.map((e) => (
            <NBRow key={e.id} e={e} dim />
          ))}
        </div>
      )}
    </div>
  );
}

function NBRow({ e, dim }) {
  const t = NB_TYPE[e.type] || NB_TYPE.p0;
  return (
    <Card className="!p-3 mb-2" style={{ opacity: dim ? 0.55 : 1 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs" style={{ color: T.spot }}>
            {t.label}
            {e.source ? ` · ${e.source}` : ""}
          </div>
          {e.target ? (
            <div className="text-sm mt-0.5">{e.target}</div>
          ) : (
            <div className="text-sm mt-0.5">{e.prompt}</div>
          )}
          {e.target && e.prompt && (
            <div className="text-xs mt-0.5" style={{ color: T.mut }}>
              {e.prompt}
            </div>
          )}
        </div>
        <div className="text-xs flex-shrink-0" style={{ color: T.faint }}>
          {"●".repeat(Math.min(2, e.mastery || 0))}
          {"○".repeat(Math.max(0, 2 - (e.mastery || 0)))}
        </div>
      </div>
    </Card>
  );
}

// 供自动化测试使用的内部导出（不影响应用运行）
export const __TEST__ = { containsPhrase, phraseTokens, normWords, countFillers, parseJSONLoose, SCRIPTS, ACT_MINUTES };

/* ================= M6 · AI 剧本生成 + 共创向导 ================= */

const GENRE_TAGS = ["职场", "谈判", "悬疑", "喜剧", "科幻", "伦理", "生活", "旅行"];
const LANG_GOALS = ["委婉拒绝", "谈判与让步", "讲一个完整的故事", "打断与接话", "闲聊破冰", "观点论证", "提问与试探", "情绪表达"];
const SPICE = [
  { key: "mild", label: "🌱 温和", desc: "常规目标，稳稳练习" },
  { key: "spicy", label: "🌶️ 刺激", desc: "需要策略与试探" },
  { key: "drama", label: "🎭 戏精", desc: "高难度 + 戏剧性彩蛋" },
];

function buildConceptsPrompt(mode, seed, genres, avoid) {
  const src =
    mode === "real"
      ? `Adapt this real-life situation into fiction (change names/settings to protect privacy): ${seed}`
      : mode === "genre"
      ? `Genre mix: ${genres.join(" × ")}. ${seed ? "Extra wish: " + seed : ""}`
      : `Story seed: ${seed}`;
  return `You are a playwright designing two-person English roleplay scenarios for Chinese B1-B2 learners. The two players must WIN THROUGH TALKING — every concept needs verbal tension (information gaps, conflicting interests, time pressure, or secrets).

${src}
${avoid ? `Must be clearly different from these previous concepts: ${avoid}` : ""}

Give exactly 3 distinct story concepts. All text in Chinese except character names.
Respond ONLY with JSON, no markdown fences:
{"concepts":[{"title":"中文剧名(2-6字)","tagline":"一句话钩子(≤25字)","conflict":"核心冲突(≤30字)","roles":[{"name":"英文名","title":"中文身份(≤8字)"},{"name":"英文名","title":"中文身份(≤8字)"}]}]}`;
}

function buildDramaPrompt(seedDesc, spice, goals, revision) {
  const spiceRule = {
    mild: "hidden tasks should be achievable with straightforward but deliberate language moves",
    spicy: "hidden tasks must require indirect strategy (probing, steering, withholding) to achieve",
    drama: "hidden tasks should be ambitious and theatrical, plus playful bonus tasks",
  }[spice];
  return `You are a playwright-designer of two-person English roleplay dramas for Chinese B1-B2 learners.

STORY BASIS: ${seedDesc}
LANGUAGE GOALS the pair wants to practice: ${goals.join(", ") || "general conversation"} — the plot MUST force these skills (e.g. if practicing polite refusal, the plot must contain a request that must be refused).
${revision ? `REVISION REQUEST from the creator (apply it): ${revision}` : ""}

HIDDEN TASK RULES (critical):
- Each role gets 1 main task + 1 bonus task, secret from the other player.
- Tasks must be achievable ONLY through language strategy (probing, persuading, withholding, steering) — never plot chores.
- Each main task needs a "judge" criterion checkable from a transcript.
- The two main tasks must create tension but NOT be mutually exclusive.
- Spice level: ${spiceRule}.
Self-check before answering: does every act force the pair to talk? Are tasks judgeable? If not, fix silently.

All text in Chinese except: "en" (English title), character names, "imagePrompt" (English).
Respond ONLY with JSON, no markdown fences:
{"title":"中文剧名","en":"English Title","genre":"题材(2-4字)","difficulty":2,"minutes":20,"logline":"一句话简介(≤40字)","world":"背景设定(≤80字)","relationship":"两人关系与此刻为何非谈不可(≤40字)","acts":[{"t":"第一幕 · 二字副标","d":"第一幕完整说明(≤50字)"},{"t":"第二幕 · 二字副标","teaser":"悬念一句(≤20字)"},{"t":"第三幕 · 二字副标","teaser":"悬念一句(≤20字)"}],"hook":"开场钩子:由谁以什么方式开场(≤30字)","imagePrompt":"one-sentence English scene image prompt","roles":{"A":{"name":"英文名","title":"身份(≤8字)","persona":"性格(≤25字)","stance":"立场(≤30字)","tasks":{"main":{"goal":"主任务(≤40字)","judge":"判定标准(≤25字)"},"bonus":{"goal":"彩蛋任务(≤30字)"}}},"B":{"name":"","title":"","persona":"","stance":"","tasks":{"main":{"goal":"","judge":""},"bonus":{"goal":""}}}}}`;
}

function buildLangPrompt(core, goals) {
  return `You are an English curriculum designer for Chinese B1-B2 learners preparing a roleplay.

SCENARIO: ${core.en} — ${core.world}
ROLE A: ${core.roles.A.name}, ${core.roles.A.stance}
ROLE B: ${core.roles.B.name}, ${core.roles.B.stance}
LANGUAGE GOALS: ${goals.join(", ") || "general conversation"}

Build the expression pack. Requirements:
- p0shared: 5 must-use expressions both roles need in THIS scenario; short, natural, high-frequency.
- roleP0: 2 role-specific must-use expressions each, tied to their stance.
- p1: 4 upgrade pairs; "from" must be the typical direct-translation Chinglish a B1 speaker would actually say in this scenario, "to" the natural native version.
- p2: 5 idiomatic collocations/softeners fitting the scenario.
- p3: 3 advanced lines to merely recognize.
- quiz: 4 speak-first self-tests; "situation" in Chinese describes a moment from THIS scenario; "reference" is the model answer; "tip" one Chinese line on why it works.
All "zh"/"situation"/"tip" in Chinese; expressions in English.
Respond ONLY with JSON, no markdown fences:
{"p0shared":[{"en":"","zh":""}],"roleP0":{"A":[{"en":"","zh":""}],"B":[{"en":"","zh":""}]},"p1":[{"from":"","to":"","zh":""}],"p2":[{"en":"","zh":""}],"p3":[{"en":"","zh":""}],"quiz":[{"situation":"","reference":"","tip":""}]}`;
}

function assembleScript(core, lang) {
  const id = "c_" + genId();
  return {
    id,
    custom: true,
    title: core.title,
    en: core.en,
    genre: core.genre || "自创",
    difficulty: Math.min(3, Math.max(1, core.difficulty || 2)),
    minutes: core.minutes || 20,
    logline: core.logline,
    world: core.world,
    relationship: core.relationship,
    acts: core.acts,
    hook: core.hook,
    imagePrompt: core.imagePrompt,
    roles: {
      A: { ...core.roles.A, p0: lang.roleP0?.A || [] },
      B: { ...core.roles.B, p0: lang.roleP0?.B || [] },
    },
    p0shared: lang.p0shared || [],
    p1: lang.p1 || [],
    p2: lang.p2 || [],
    p3: lang.p3 || [],
    quiz: lang.quiz || [],
  };
}

function Wizard({ onSave, onBack, showToast }) {
  const [step, setStep] = useState(0); // 0 起点 1 雏形 2 预览
  const [mode, setMode] = useState("real"); // real | genre | idea
  const [seed, setSeed] = useState("");
  const [genres, setGenres] = useState(new Set());
  const [spice, setSpice] = useState("spicy");
  const [goals, setGoals] = useState(new Set());
  const [busy, setBusy] = useState(null); // 文案
  const [concepts, setConcepts] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [draft, setDraft] = useState(null); // 完整剧本
  const [revision, setRevision] = useState("");

  const toggle = (set, setter, v, max = 99) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else if (n.size < max) n.add(v);
    setter(n);
  };

  const seedDesc = () => {
    if (chosen)
      return `Concept chosen by the creators — title: ${chosen.title}; hook: ${chosen.tagline}; conflict: ${chosen.conflict}; roles: ${chosen.roles.map((r) => r.name + "(" + r.title + ")").join(", ")}`;
    if (mode === "real") return `Adapted from the creators' real life (fictionalize it): ${seed}`;
    if (mode === "genre") return `Genre mix ${[...genres].join(" × ")}. ${seed ? "Wish: " + seed : ""}`;
    return `Story seed: ${seed}`;
  };

  const canStart = mode === "genre" ? genres.size > 0 : seed.trim().length >= 4;

  const genConcepts = async (avoid) => {
    setBusy("编剧在打三个腹稿…");
    try {
      const raw = await callClaude(buildConceptsPrompt(mode, seed.trim(), [...genres], avoid));
      const p = parseJSONLoose(raw);
      if (!p?.concepts?.length) throw new Error("bad");
      setConcepts(p.concepts.slice(0, 3));
      setChosen(null);
      setStep(1);
    } catch {
      showToast("雏形生成失败，再试一次", "err");
    }
    setBusy(null);
  };

  const genFull = async (rev) => {
    setBusy("正在成稿：剧情与暗线…");
    try {
      const core = parseJSONLoose(await callClaude(buildDramaPrompt(seedDesc(), spice, [...goals], rev)));
      if (!core?.roles?.A?.tasks?.main?.goal) throw new Error("bad core");
      setBusy("正在配课：表达卡与自测…");
      const lang = parseJSONLoose(await callClaude(buildLangPrompt(core, [...goals])));
      if (!lang?.p0shared?.length) throw new Error("bad lang");
      setDraft(assembleScript(core, lang));
      setRevision("");
      setStep(2);
    } catch {
      showToast("剧本生成失败，再试一次", "err");
    }
    setBusy(null);
  };

  const Chip = ({ on, children, onClick }) => (
    <button
      onClick={onClick}
      className="rounded-lg px-2.5 py-1.5 text-xs"
      style={{ background: on ? T.spot : T.ink, color: on ? "#1c1608" : T.mut, border: `1px solid ${on ? T.spot : T.line}` }}
    >
      {children}
    </button>
  );

  if (busy)
    return (
      <div className="space-y-4 ds-rise">
        <Card className="text-center !py-12">
          <div className="ds-pulse text-sm" style={{ color: T.spot, animation: "ds-breathe 1.6s infinite" }}>
            {busy}
          </div>
          <div className="text-xs mt-2" style={{ color: T.faint }}>
            约 20-40 秒
          </div>
        </Card>
      </div>
    );

  // ---------- Step 2 · 预览与入库 ----------
  if (step === 2 && draft) {
    return (
      <div className="space-y-4 ds-rise">
        <button className="text-sm underline" style={{ color: T.faint }} onClick={() => setStep(0)}>
          ← 重新开始
        </button>
        <Card>
          <div className="ds-display text-2xl">{draft.title}</div>
          <div className="text-sm mt-0.5" style={{ color: T.faint }}>
            {draft.en}
          </div>
          <div className="text-xs mt-2 flex items-center gap-2 flex-wrap" style={{ color: T.mut }}>
            <Tag>{draft.genre}</Tag>
            <Tag>{"★".repeat(draft.difficulty)}</Tag>
            <Tag>约 {draft.minutes} 分钟</Tag>
            <Tag tone="secret">隐藏任务 ×2（已封存，开演选角后各自揭晓）</Tag>
          </div>
          <p className="text-sm mt-3 leading-relaxed">{draft.world}</p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: T.mut }}>
            {draft.relationship}
          </p>
        </Card>
        <Card>
          <div className="ds-display text-lg mb-2">三幕预告</div>
          {draft.acts.map((a, i) => (
            <div key={i} className="flex gap-3 py-1.5 text-sm">
              <span style={{ color: T.spot }} className="flex-shrink-0">
                {a.t}
              </span>
              <span style={{ color: a.d ? T.text : T.faint }}>{a.d || a.teaser}</span>
            </div>
          ))}
        </Card>
        <div className="grid sm:grid-cols-2 gap-3">
          {["A", "B"].map((r) => (
            <Card key={r} className="!p-4">
              <div className="text-sm font-medium">
                {draft.roles[r].name}
                <span className="text-xs ml-1" style={{ color: T.faint }}>
                  {draft.roles[r].title}
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: T.mut }}>
                {draft.roles[r].persona} · {draft.roles[r].stance}
              </p>
            </Card>
          ))}
        </div>
        <Card className="!p-4">
          <div className="text-xs" style={{ color: T.faint }}>
            配套表达卡：P0 ×{draft.p0shared.length + 4} · 升级句 ×{draft.p1.length} · 地道层 ×{draft.p2.length} · 自测 ×
            {draft.quiz.length} —— 入库后在备课页查看全部
          </div>
        </Card>
        <Card>
          <div className="text-xs mb-2" style={{ color: T.faint }}>
            想调整？直接说（如"把 B 改得更强势""场景搬到机场"）
          </div>
          <div className="flex gap-2">
            <input
              value={revision}
              onChange={(e) => setRevision(e.target.value)}
              placeholder="修改意见（可留空）"
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: T.ink, border: `1px solid ${T.line}`, color: T.text }}
            />
            <Btn kind="panel" disabled={!revision.trim()} onClick={() => genFull(revision.trim())}>
              按此重生成
            </Btn>
          </div>
        </Card>
        <Btn className="w-full" onClick={() => onSave(draft)}>
          保存到我们的剧本库 🎭
        </Btn>
      </div>
    );
  }

  // ---------- Step 1 · 三个雏形 ----------
  if (step === 1 && concepts) {
    return (
      <div className="space-y-4 ds-rise">
        <button className="text-sm underline" style={{ color: T.faint }} onClick={() => setStep(0)}>
          ← 返回
        </button>
        <div className="ds-display text-xl px-1">挑一个你们喜欢的故事雏形</div>
        {concepts.map((c, i) => (
          <button key={i} className="w-full text-left" onClick={() => setChosen(chosen === c ? null : c)}>
            <Card style={{ border: `1px solid ${chosen === c ? T.spot : T.line}`, background: chosen === c ? "rgba(233,180,76,0.08)" : T.ink2 }}>
              <div className="ds-display text-lg">{c.title}</div>
              <p className="text-sm mt-1" style={{ color: T.mut }}>
                {c.tagline}
              </p>
              <p className="text-xs mt-1.5" style={{ color: T.spot }}>
                冲突：{c.conflict}
              </p>
              <p className="text-xs mt-1" style={{ color: T.faint }}>
                {c.roles.map((r) => `${r.name}（${r.title}）`).join(" vs ")}
              </p>
            </Card>
          </button>
        ))}
        <div className="flex gap-2">
          <Btn kind="panel" className="flex-1" onClick={() => genConcepts(concepts.map((c) => c.title).join(", "))}>
            都不满意，再来三个
          </Btn>
          <Btn className="flex-1" disabled={!chosen} onClick={() => genFull()}>
            用这个成稿 →
          </Btn>
        </div>
      </div>
    );
  }

  // ---------- Step 0 · 灵感起点 ----------
  return (
    <div className="space-y-4 ds-rise">
      <button className="text-sm underline" style={{ color: T.faint }} onClick={onBack}>
        ← 返回
      </button>
      <div className="ds-display text-xl px-1">✍️ 创作新剧本</div>

      <Card>
        <div className="text-xs mb-2" style={{ color: T.faint }}>
          灵感起点（三选一）
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Chip on={mode === "real"} onClick={() => setMode("real")}>
            🎬 从真实生活改编
          </Chip>
          <Chip on={mode === "genre"} onClick={() => setMode("genre")}>
            🎭 从题材出发
          </Chip>
          <Chip on={mode === "idea"} onClick={() => setMode("idea")}>
            💡 一句话点子
          </Chip>
        </div>
        {mode === "genre" && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {GENRE_TAGS.map((g) => (
              <Chip key={g} on={genres.has(g)} onClick={() => toggle(genres, setGenres, g, 3)}>
                {g}
              </Chip>
            ))}
          </div>
        )}
        <textarea
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          rows={3}
          placeholder={
            mode === "real"
              ? "说一件你俩最近经历或即将面对的事（会自动换皮改编，保护隐私）——如：下周要和美国客户开项目 kickoff 会"
              : mode === "genre"
              ? "（可选）补充你们的偏好，如：想要反转结局"
              : "如：合租室友，其中一人偷偷养了猫"
          }
          className="w-full mt-3 rounded-xl px-4 py-3 text-sm outline-none resize-none"
          style={{ background: T.ink, border: `1px solid ${T.line}`, color: T.text }}
        />
      </Card>

      <Card>
        <div className="text-xs mb-2" style={{ color: T.faint }}>
          隐藏任务辣度
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SPICE.map((s) => (
            <Chip key={s.key} on={spice === s.key} onClick={() => setSpice(s.key)}>
              {s.label} <span style={{ opacity: 0.7 }}>{s.desc}</span>
            </Chip>
          ))}
        </div>
        <div className="text-xs mt-3 mb-2" style={{ color: T.faint }}>
          这部剧想重点练什么（最多选 2 项）——剧情会为它服务
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {LANG_GOALS.map((g) => (
            <Chip key={g} on={goals.has(g)} onClick={() => toggle(goals, setGoals, g, 2)}>
              {g}
            </Chip>
          ))}
        </div>
      </Card>

      <div className="flex gap-2">
        <Btn kind="panel" className="flex-1" disabled={!canStart} onClick={() => genConcepts()}>
          先看三个故事雏形
        </Btn>
        <Btn className="flex-1" disabled={!canStart} onClick={() => genFull()}>
          直接快速成稿 ⚡
        </Btn>
      </div>
      <p className="text-xs px-1 leading-relaxed" style={{ color: T.faint }}>
        两个角色的隐藏任务由 AI 单独生成并封存——包括创作者在内，谁都要等到开演选角后才看到自己的那份。
      </p>
    </div>
  );
}
