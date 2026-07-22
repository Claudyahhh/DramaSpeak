import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   DramaSpeak · 职场英语剧本杀 — Milestone 2
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
   旧版预置剧本库（保留数据兼容）
   ============================================================ */
const LEGACY_SCRIPTS = [
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

/* ============================================================
   预置剧本库（6 部：双主角 Drama）
   ============================================================ */
const SCRIPTS = [
  {
    id: "last-flight",
    title: "最后一班夜航",
    en: "The Last Flight Confession",
    genre: "峰会危机",
    difficulty: 3,
    minutes: 25,
    logline: "行业峰会散场后的暴雨困住最后一班航班，一名危机公关和一名调查记者必须决定：真相今晚起飞，还是有人先坦白。",
    world: "国际航空科技峰会闭幕后，唯一能回总部的夜航延误两小时。贵宾休息室里，Maya 握着一段录音，Ethan 则被公司派来处理一场可能毁掉品牌的事故。",
    relationship: "峰会上的专业对手，三年前有过短暂交集。她掌握他的秘密，他却可能是唯一能保护她消息源的人。",
    acts: [
      { t: "第一幕 · 困局", d: "登机口关闭。Maya 明示自己知道事故真相，Ethan 必须先弄清她会把故事写到什么程度。" },
      { t: "第二幕 · 录音", teaser: "一段录音把两人的旧事也一并扯了出来……" },
      { t: "第三幕 · 起飞", teaser: "广播催促登机；在飞机起飞前，必须有人赌一次信任。" },
    ],
    hook: "由 Maya 开场：合上电脑，看着 Ethan 说一句“你比我想的来得快”。",
    roles: {
      A: {
        name: "Ethan", gender: "男", title: "危机公关", persona: "男性，冷静迷人，擅长把危险的问题变成可谈的条件。", stance: "想让报道至少延后十二小时，以便保护一位无辜员工；但不能直接要求她压稿。",
        tasks: { main: { goal: "让 Maya 主动同意延后发布十二小时，且你不能说“请别发”。", judge: "她明确答应延后，或提出可接受的发布时间。" }, bonus: { goal: "在气氛最紧张时，让她真心笑一次。" } },
        p0: [{ en: "I'm not asking you to bury the story.", zh: "我不是要你把新闻压下去。" }, { en: "What would make you feel safe waiting?", zh: "怎样你才会安心等一等？" }],
      },
      B: {
        name: "Maya", gender: "女", title: "调查记者", persona: "女性，敏锐倔强，讨厌被操控，但不愿伤害真正无辜的人。", stance: "必须确认公司隐瞒了什么，并决定录音是否今晚发出；绝不能暴露消息源。",
        tasks: { main: { goal: "不透露消息源，让 Ethan 承认一条公司曾隐瞒的具体事实。", judge: "他清楚承认一个事实，而不是泛泛道歉。" }, bonus: { goal: "让 Ethan 主动提出保护你的消息源。" } },
        p0: [{ en: "Off the record, what are you not telling me?", zh: "不对外引用的话，你还没告诉我什么？" }, { en: "I'm willing to listen, not to be managed.", zh: "我愿意听，但不是来被你操控的。" }],
      },
    },
    p0shared: [{ en: "Help me understand your position.", zh: "帮我理解你的立场。" }, { en: "Let's be precise about what happened.", zh: "我们把发生的事说准确。" }, { en: "I'm asking for trust, not a favor.", zh: "我要的是信任，不是人情。" }, { en: "What are you willing to put on the table?", zh: "你愿意拿出什么条件？" }, { en: "We are running out of time.", zh: "我们没时间了。" }],
    p1: [{ from: "Don't publish it.", to: "Would you consider holding it until we verify one more thing?", zh: "请求延后而不显得命令。" }, { from: "Tell me the truth.", to: "What part of the story are you still holding back?", zh: "逼近真相但不粗暴。" }, { from: "I can't say.", to: "I can't disclose that without compromising someone.", zh: "拒绝透露来源。" }, { from: "I believe you.", to: "I'm prepared to take you at your word.", zh: "有分寸地给出信任。" }],
    rolePrep: {
      A: {
        p1: [{ from: "Don't publish it.", to: "Would you consider holding the piece until boarding call?", zh: "Ethan 的目标是争取时间，而非要求压稿。" }, { from: "Believe me.", to: "I'm prepared to put my name behind that.", zh: "用可承担的承诺换取信任。" }, { from: "Give me time.", to: "Give me one hour to make this right, then the choice is yours.", zh: "给出时间边界，减少对方的不安。" }],
        p2: [{ en: "buy some time", zh: "争取一点时间" }, { en: "act in good faith", zh: "出于善意行事" }, { en: "make good on a promise", zh: "兑现承诺" }],
        p3: [{ en: "I'm not asking for mercy; I'm asking for a fair hearing.", zh: "我不是求宽恕，而是希望得到公平陈述的机会。" }, { en: "If I wanted to spin this, I wouldn't be here alone.", zh: "如果我要粉饰此事，就不会独自来见你。" }],
        quiz: [{ situation: "你想请对方延后报道到登机前。", reference: "Would you consider holding the piece until boarding call?", tip: "具体截止点让请求更容易被接受。" }, { situation: "你要给出可验证的承诺。", reference: "I'm prepared to put my name behind that.", tip: "put my name behind 表示愿意承担信誉。" }, { situation: "你想让对方保留最终决定权。", reference: "Give me one hour to make this right, then the choice is yours.", tip: "把选择还给对方，谈判更有分寸。" }],
      },
      B: {
        p1: [{ from: "What are you hiding?", to: "What part of the story are you still holding back?", zh: "Maya 逼近真相时避免直接指控。" }, { from: "Tell me your source.", to: "I'm not asking for names; I'm asking what you knew and when.", zh: "守住消息源，同时锁定事实。" }, { from: "I don't trust you.", to: "Trust isn't the issue. Accountability is.", zh: "把情绪对抗转为责任问题。" }],
        p2: [{ en: "go on the record", zh: "接受公开引用" }, { en: "protect a source", zh: "保护消息源" }, { en: "hold someone accountable", zh: "要求某人负责" }],
        p3: [{ en: "You don't get to decide which facts are inconvenient.", zh: "你不能决定哪些事实算不方便。" }, { en: "I'm willing to listen, but I won't trade the truth for access.", zh: "我愿意听，但不会用真相交换信息渠道。" }],
        quiz: [{ situation: "你要追问对方隐瞒的部分。", reference: "What part of the story are you still holding back?", tip: "holding back 比 hiding 更适合专业追问。" }, { situation: "你要强调不交出消息源。", reference: "I'm not asking for names; I'm asking what you knew and when.", tip: "用事实范围替代身份信息。" }, { situation: "你要把争论拉回责任。", reference: "Trust isn't the issue. Accountability is.", tip: "短句转场，会显得非常有力量。" }],
      },
    },
    p2: [{ en: "buy some time", zh: "争取一点时间" }, { en: "read between the lines", zh: "听出言外之意" }, { en: "give someone your word", zh: "郑重承诺" }, { en: "a matter of principle", zh: "原则问题" }, { en: "come clean", zh: "坦白交代" }],
    p3: [{ en: "Trust is a currency, and we're both nearly broke.", zh: "信任是货币，而我们都快破产了。" }, { en: "Don't confuse restraint with surrender.", zh: "别把克制误解成投降。" }, { en: "The truth can wait an hour; consequences can't.", zh: "真相可以等一小时，后果不会。" }],
    quiz: [{ situation: "你想争取一点时间，但不能直接说“别发”。", reference: "Would you consider holding it until we verify one more thing?", tip: "consider + holding it 是礼貌且有策略的请求。" }, { situation: "你要拒绝交出消息源。", reference: "I can't disclose that without compromising someone.", tip: "用后果解释边界，既坚定又专业。" }, { situation: "你想让对方给出实际条件。", reference: "What are you willing to put on the table?", tip: "谈判里用 put on the table 要求具体承诺。" }, { situation: "对话快失控了，拉回共同目标。", reference: "We are running out of time. Let's be precise about what happened.", tip: "先标明压力，再拉回事实。" }],
  },
  {
    id: "boardroom-alibi",
    title: "董事会前夜",
    en: "The Missing Signature",
    genre: "高层博弈",
    difficulty: 2,
    minutes: 25,
    logline: "董事会前夜，一份收购协议少了关键签字。大区总监和首席法务必须判断：这是普通疏漏，还是有人正把所有人推向一个陷阱。",
    world: "跨国收购案的董事会前二十分钟。会议室外，投资人和媒体已经到场；会议室内，一份最终协议多出了一页没人承认见过的附录。",
    relationship: "共同熬过多个危机的业务负责人和首席法务。她知道他会为结果冒险，他知道她绝不会为风险背书。",
    acts: [
      { t: "第一幕 · 缺席", d: "协议少了 Sophie 的签字。Daniel 要她先信任团队，Sophie 则要求先厘清这页附录来自哪里。" },
      { t: "第二幕 · 附录", teaser: "一通来自 CEO 的电话，让 Daniel 的立场突然变得可疑……" },
      { t: "第三幕 · 落笔", teaser: "董事会即将开门；签字、延期，还是带着真相走进去？" },
    ],
    hook: "由 Sophie 开场：把协议推到 Daniel 面前，说“这页不是我昨晚审过的版本”。",
    roles: {
      A: {
        name: "Daniel", gender: "男", title: "大区总监", persona: "男性，果断善谈，习惯在最后一刻替团队扛下结果。", stance: "想让收购案按时进入董事会，但知道 CEO 私下要求他接受一项风险条款。", tasks: { main: { goal: "不透露 CEO 的私下指令，让 Sophie 说出她愿意签字的具体条件。", judge: "她明确提出一项签字条件或可执行替代方案。" }, bonus: { goal: "让她承认你不是在单纯追求业绩。" } }, p0: [{ en: "Let's focus on what we can still control.", zh: "先聚焦我们还能够控制的事。" }, { en: "What would it take for you to sign off?", zh: "满足什么条件你才会签字？" }] },
      B: {
        name: "Sophie", gender: "女", title: "首席法务", persona: "女性，冷静锋利，习惯把最难的问题问到不能再含糊。", stance: "必须确认附录是否被人为加入；她不想毁掉交易，但不会让公司承担未知责任。", tasks: { main: { goal: "不直接指控 Daniel 知情，让他承认至少一条他没有告诉董事会的风险。", judge: "他明确说出一项未披露的风险或信息来源。" }, bonus: { goal: "让他主动请求你一起向董事会说明情况。" } }, p0: [{ en: "Walk me through the version history.", zh: "带我过一遍版本记录。" }, { en: "I need a defensible answer, not a reassuring one.", zh: "我要一个站得住的答案，不是安慰人的答案。" }] },
    },
    p0shared: [{ en: "Let's separate the facts from the assumptions.", zh: "先把事实和假设分开。" }, { en: "This needs to be on the record.", zh: "这件事需要留下正式记录。" }, { en: "What is the exposure here?", zh: "这里的风险敞口是什么？" }, { en: "I can't sign off on this as it stands.", zh: "按现在这样我不能签字。" }, { en: "We need a decision we can defend tomorrow.", zh: "我们要做一个明天也站得住的决定。" }],
    p1: [{ from: "Please sign it.", to: "What would it take for you to sign off?", zh: "催签时改为询问条件。" }, { from: "Who changed this?", to: "Walk me through the version history.", zh: "追查修改来源的专业说法。" }, { from: "This is dangerous.", to: "I need a defensible answer on the exposure here.", zh: "把模糊担忧变成风险问题。" }, { from: "We must decide now.", to: "We need a decision we can defend tomorrow.", zh: "强调时效但不情绪化。" }],
    rolePrep: {
      A: {
        p1: [{ from: "Please sign it.", to: "What would it take for you to sign off?", zh: "Daniel 要问清签字条件，而不是施压。" }, { from: "We can solve it later.", to: "Let's focus on what we can still control before the board convenes.", zh: "在高压下收束讨论范围。" }, { from: "It is not a big risk.", to: "I understand the exposure, and I have a mitigation plan.", zh: "承认风险再给应对方案。" }],
        p2: [{ en: "sign off on", zh: "批准、签字背书" }, { en: "mitigate the risk", zh: "降低风险" }, { en: "keep the deal on track", zh: "让交易保持推进" }],
        p3: [{ en: "I'm not asking you to lower the bar; I'm asking you to define it.", zh: "我不是要你降低标准，而是请你明确标准。" }, { en: "If we delay this, the market will write the story for us.", zh: "如果延迟，市场会替我们写故事。" }],
        quiz: [{ situation: "你想问她怎样才愿意签字。", reference: "What would it take for you to sign off?", tip: "先问条件，比直接催签更有谈判空间。" }, { situation: "你要让讨论回到会前还能处理的部分。", reference: "Let's focus on what we can still control before the board convenes.", tip: "用 control 把焦虑变成行动。" }, { situation: "你要承认风险，但不放弃交易。", reference: "I understand the exposure, and I have a mitigation plan.", tip: "风险承认加解决方案，可信度更高。" }],
      },
      B: {
        p1: [{ from: "Who changed this?", to: "Walk me through the version history.", zh: "Sophie 追查来源时先要证据链。" }, { from: "This is dangerous.", to: "I need a defensible answer on the exposure here.", zh: "把情绪判断转换成合规问题。" }, { from: "I won't sign.", to: "I can't sign off on this as it stands.", zh: "拒绝要留下条件和余地。" }],
        p2: [{ en: "a material risk", zh: "重大风险" }, { en: "paper trail", zh: "书面记录链" }, { en: "go on the record", zh: "留下正式记录" }],
        p3: [{ en: "A rushed signature is still a signature we have to live with.", zh: "仓促的签字，仍是我们必须承担的签字。" }, { en: "I won't confuse commercial pressure with informed consent.", zh: "我不会把商业压力混同于知情同意。" }],
        quiz: [{ situation: "你想让对方展示协议的修改记录。", reference: "Walk me through the version history.", tip: "专业、直接，适合核查文件。" }, { situation: "你要追问风险影响。", reference: "I need a defensible answer on the exposure here.", tip: "defensible 表示能经得起董事会追问。" }, { situation: "你要拒绝当前版本，但不直接堵死。", reference: "I can't sign off on this as it stands.", tip: "as it stands 表示“按目前的样子”。" }],
      },
    },
    p2: [{ en: "sign off on", zh: "批准、签字背书" }, { en: "a material risk", zh: "重大风险" }, { en: "paper trail", zh: "书面记录链" }, { en: "mitigate the risk", zh: "降低风险" }, { en: "keep the deal on track", zh: "让交易保持推进" }],
    p3: [{ en: "A rushed signature is still a signature we have to live with.", zh: "仓促的签字，仍是我们必须承担的签字。" }, { en: "I'm not asking you to lower the bar; I'm asking you to define it.", zh: "我不是要你降低标准，而是请你明确标准。" }, { en: "We need a decision we can defend tomorrow.", zh: "我们要做一个明天也站得住的决定。" }],
    quiz: [{ situation: "你想询问对方愿意签字的条件。", reference: "What would it take for you to sign off?", tip: "先问条件，比直接催签更有谈判空间。" }, { situation: "你要追查协议修改的来源。", reference: "Walk me through the version history.", tip: "用版本记录要求建立证据链。" }, { situation: "你要拒绝当前版本，但不直接堵死。", reference: "I can't sign off on this as it stands.", tip: "as it stands 表示“按目前的样子”。" }, { situation: "你想把讨论拉回可执行的决定。", reference: "We need a decision we can defend tomorrow.", tip: "强调可辩护性，很适合高层决策。" }],
  },
  {
    id: "missing-demo",
    title: "消失的发布会 Demo",
    en: "The Vanishing Demo",
    genre: "创业悬疑",
    difficulty: 3,
    minutes: 25,
    logline: "发布会前四十分钟，明星产品的 Demo 突然消失。创始人和最大投资人的代表锁在后台，得先决定救项目，还是揭穿一个谎言。",
    world: "上海一场 AI 产品发布会后台。十分钟后媒体将进场，核心演示链接被删除，只有 Adrian 和投资方代表 Chloe 知道它从来没有完全准备好。",
    relationship: "她投过他的公司，也曾是他的导师。如今一边要保住投资人信任，一边要保住团队和真相。",
    acts: [
      { t: "第一幕 · 黑屏", d: "屏幕一片黑。Adrian 想先找备份，Chloe 则坚持先知道 Demo 为什么会消失。" },
      { t: "第二幕 · 底牌", teaser: "一封定时邮件揭露：有人提前安排好了这场事故。" },
      { t: "第三幕 · 上台", teaser: "倒计时归零，他们得决定讲一个冒险的真话，还是演一场完美的假象。" },
    ],
    hook: "由 Chloe 开场：拔掉演示电脑的网线，对 Adrian 说“现在，给我没有公关版本的答案”。",
    roles: {
      A: {
        name: "Adrian", gender: "男", title: "联合创始人", persona: "男性，野心勃勃、反应极快，习惯先解决问题再承认问题。", stance: "想让发布会照常进行，保护团队；但知道真实模型还没达到宣传水平。", tasks: { main: { goal: "说服 Chloe 接受一个诚实但仍能上台的发布方案。", judge: "她明确同意具体方案并愿意站台或不叫停。" }, bonus: { goal: "让她亲口说出“我还是相信你”。" } }, p0: [{ en: "Give me ten minutes before you decide.", zh: "在你决定前，给我十分钟。" }, { en: "I can defend the product, not a lie.", zh: "我能为产品辩护，但不能为谎言辩护。" }] },
      B: {
        name: "Chloe", gender: "女", title: "投资人代表", persona: "女性，锋利冷静，最讨厌创始人用愿景掩盖执行问题。", stance: "必须确定这是技术失误还是有意误导；她不想毁掉公司，但也不会替谎言背书。", tasks: { main: { goal: "不直接指控 Adrian 造假，让他主动说出 Demo 与真实产品的差距。", judge: "他明确说明至少一项未完成或被夸大的能力。" }, bonus: { goal: "让 Adrian 主动说出一个他害怕失去的东西。" } }, p0: [{ en: "Walk me through what actually happened.", zh: "从头讲讲到底发生了什么。" }, { en: "I need facts before I offer cover.", zh: "给你兜底前，我需要事实。" }] },
    },
    p0shared: [{ en: "Let's separate the problem from the panic.", zh: "先把问题和恐慌分开。" }, { en: "What can we prove right now?", zh: "我们现在能证明什么？" }, { en: "That is a risk I need you to name.", zh: "这是你需要明确说出的风险。" }, { en: "I won't sign off on a half-truth.", zh: "我不会为半真半假的说法背书。" }, { en: "We still have a choice.", zh: "我们还有选择。" }],
    p1: [{ from: "The demo is broken.", to: "The demo isn't representative of the product in its current state.", zh: "说明问题而不慌乱。" }, { from: "Trust me.", to: "Let me earn your trust with a plan you can challenge.", zh: "把空口保证变成可检验方案。" }, { from: "We can fake it.", to: "We could frame this as a controlled preview — if we're transparent about the limits.", zh: "提出风险可控的替代方案。" }, { from: "It is your fault.", to: "Where did the decision-making break down?", zh: "追责时问机制，不先攻击人。" }],
    rolePrep: {
      A: {
        p1: [{ from: "Trust me.", to: "Let me earn your trust with a plan you can challenge.", zh: "Adrian 不能空口保证，要给可质疑的方案。" }, { from: "We can fake it.", to: "We could frame this as a controlled preview — if we're transparent about the limits.", zh: "把假演示转为透明的受控预览。" }, { from: "Give me time.", to: "Give me ten minutes before you decide to pull the plug.", zh: "明确请求缓冲时间。" }],
        p2: [{ en: "own the mistake", zh: "承担错误" }, { en: "buy into the vision", zh: "相信愿景" }, { en: "pull the plug", zh: "叫停、拔掉插头" }],
        p3: [{ en: "I can defend the product, not a lie.", zh: "我能为产品辩护，但不能为谎言辩护。" }, { en: "The bravest pitch may be the one that admits what is unfinished.", zh: "最勇敢的路演，也许是承认尚未完成的那个。" }],
        quiz: [{ situation: "你想把空口“信我”变成可讨论的方案。", reference: "Let me earn your trust with a plan you can challenge.", tip: "把 trust 变成可以被检验的行动。" }, { situation: "你要请求对方暂时不要叫停。", reference: "Give me ten minutes before you decide to pull the plug.", tip: "pull the plug 是危机里很地道的“叫停”。" }, { situation: "你想诚实地提出替代发布方式。", reference: "We could frame this as a controlled preview — if we're transparent about the limits.", tip: "先给方案，再补透明条件。" }],
      },
      B: {
        p1: [{ from: "It is your fault.", to: "Where did the decision-making break down?", zh: "Chloe 追责时先问机制，不先攻击人。" }, { from: "The demo is fake.", to: "The demo isn't representative of the product in its current state.", zh: "描述偏差，避免未经证实的指控。" }, { from: "Tell me everything.", to: "Walk me through what actually happened.", zh: "要求完整复盘的专业说法。" }],
        p2: [{ en: "call the shots", zh: "拍板决定" }, { en: "move the goalposts", zh: "临时改变标准" }, { en: "sign off on", zh: "批准、背书" }],
        p3: [{ en: "A good story is not the same thing as a defensible claim.", zh: "好故事不等于站得住的主张。" }, { en: "You don't get to borrow my reputation to cover your uncertainty.", zh: "你不能拿我的信誉掩盖你的不确定。" }],
        quiz: [{ situation: "你想追问究竟哪里出了决策问题。", reference: "Where did the decision-making break down?", tip: "把 blame 改成机制复盘，气势更稳。" }, { situation: "你要让对方完整复盘。", reference: "Walk me through what actually happened.", tip: "walk me through 常用于高压、需要细节的对话。" }, { situation: "你要拒绝为半真半假的话背书。", reference: "I won't sign off on a half-truth.", tip: "sign off on 表示正式批准或认可。" }],
      },
    },
    p2: [{ en: "buy into the vision", zh: "相信愿景" }, { en: "move the goalposts", zh: "临时改变标准" }, { en: "own the mistake", zh: "承担错误" }, { en: "a controlled preview", zh: "受控预览" }, { en: "call the shots", zh: "拍板决定" }],
    p3: [{ en: "A good story is not the same thing as a defensible claim.", zh: "好故事不等于站得住的主张。" }, { en: "You don't get to borrow my reputation to cover your uncertainty.", zh: "你不能拿我的信誉掩盖你的不确定。" }, { en: "The bravest pitch may be the one that admits what is unfinished.", zh: "最勇敢的路演，也许是承认尚未完成的那个。" }],
    quiz: [{ situation: "你要请求十分钟时间，但不能显得逃避。", reference: "Give me ten minutes before you decide. I can defend the product, not a lie.", tip: "给出明确时间，并先划清诚实边界。" }, { situation: "你要让对方解释问题，不直接指控。", reference: "Walk me through what actually happened.", tip: "walk me through 要求完整复盘，很适合高压场景。" }, { situation: "提出一个不欺骗媒体的替代方案。", reference: "We could frame this as a controlled preview — if we're transparent about the limits.", tip: "先给方案，再给透明条件。" }, { situation: "你们还在争执，提醒对方回到可做的事。", reference: "Let's separate the problem from the panic. What can we prove right now?", tip: "把情绪和问题拆开，是危机沟通的核心。" }],
  },
  {
    id: "will",
    title: "遗嘱之夜",
    en: "The Reading of the Will",
    genre: "豪门悬疑",
    difficulty: 3,
    minutes: 22,
    logline: "老爷子的遗嘱今晚开封，两个继承人被单独留在书房——遗嘱里少了一个人的名字，而多了一个谁都没料到的条件。",
    world: "暴雨夜的乡间庄园。地产大亨 Gerald Ashcroft 上周离世，留下一份要求两名继承人当面共读、达成一致后方可生效的古怪遗嘱。律师读完前半段就被叫出书房处理一桩意外，把两人和那份没读完的文件单独锁在了这里。",
    relationship: "亡者远走多年的独子 Victor，与亡者晚年最信任的私人助理 Eleanor。外界认定她图谋家产，但两人今晚第一次真正面对面。",
    acts: [
      { t: "第一幕 · 缺席的名字", d: "遗嘱前半段只提到 Eleanor，没有 Victor。Victor 要查清她凭什么出现，Eleanor 则坚持先把文件读完。" },
      { t: "第二幕 · 附加条件", teaser: "未读完的条款要求两人共同决定一件比遗产更难分割的东西……" },
      { t: "第三幕 · 血缘落款", teaser: "律师即将回来；签字之前，有人必须决定真相究竟能不能换来一个家。" },
    ],
    hook: "由 Victor 开场：把遗嘱推到 Eleanor 面前，问她“你对他而言到底算什么？”",
    roles: {
      A: {
        name: "Victor", gender: "男", title: "亡者的独子", persona: "男性，外冷内热，习惯用讽刺武装自己。十年前和父亲大吵后离家，靠自己在国外打拼。", stance: "你是唯一的血亲，理应继承一切。但你回来不只为了钱；你想知道父亲是否原谅了你，以及 Eleanor 在他最后几年究竟扮演了什么角色。",
        tasks: { main: { goal: "套出 Eleanor 与父亲之间真正的关系，且不能直接指控。你还藏着一件事：父亲生前寄来一封信，却被你退回未拆。", judge: "Eleanor 说出与亡者的隐藏关系，且不是被直接质问逼出来的。" }, bonus: { goal: "全程不让 Eleanor 察觉你退回过父亲的信。" } },
        p0: [{ en: "Let's not pretend we're strangers here.", zh: "我们就别装作陌生人了（拉近又施压）" }, { en: "What exactly were you to him?", zh: "你对他而言到底算什么？（试探关系）" }],
      },
      B: {
        name: "Eleanor", gender: "女", title: "亡者的私人助理", persona: "女性，温和克制、滴水不漏，但眼神里有故事。为 Ashcroft 家工作七年，对这栋房子比谁都熟。", stance: "所有人都以为你是攀附豪门的外人。你意外被写进遗嘱，却不在乎钱；你在乎的是能否守住一个秘密走出书房。",
        tasks: { main: { goal: "你其实是亡者从未公开承认的女儿。先让同父异母的 Victor 对你产生善意，甚至承认你有权分一份，再决定是否说出真相。", judge: "Victor 主动表达接纳或承认你有权继承，且你没有先自曝身份。" }, bonus: { goal: "自然引用一次亡者生前说过的话，让 Victor 相信你真的了解父亲。" } },
        p0: [{ en: "There are things you don't know about him.", zh: "关于他，有些事你并不知道（埋伏笔）" }, { en: "I never wanted any of this.", zh: "这一切我从没想要过（表明动机）" }],
      },
    },
    p0shared: [{ en: "Let's read the rest of it together.", zh: "我们把剩下的一起读完（推进剧情）" }, { en: "I'll be honest with you — up to a point.", zh: "我跟你说实话，但只说到某个程度（半坦白）" }, { en: "Why would he write that?", zh: "他为什么要那样写？（追问动机）" }, { en: "I'm not accusing you, but...", zh: "我不是在指控你，但是……（软化指控）" }, { en: "What are you really after?", zh: "你到底想要什么？（直击核心）" }],
    p1: [{ from: "You are lying.", to: "That story has a few too many holes.", zh: "指出谎言但不撕破脸。" }, { from: "I don't trust you.", to: "You'll forgive me if I'm cautious.", zh: "表达不信任但保持体面。" }, { from: "Tell me the truth.", to: "I think it's time you leveled with me.", zh: "要求坦白，更有分量。" }, { from: "He loved me more.", to: "Whatever he felt, he never said it out loud.", zh: "把情绪讲成克制的遗憾。" }],
    rolePrep: {
      A: {
        p1: [{ from: "Who are you?", to: "Help me understand why he trusted you so completely.", zh: "Victor 用追问信任来源代替身份审讯。" }, { from: "You manipulated him.", to: "I'm trying to separate loyalty from influence here.", zh: "质疑影响力，但不直接扣帽子。" }, { from: "I deserve everything.", to: "I'm not here to reduce this to entitlement.", zh: "压住继承人的傲慢，保留谈判空间。" }],
        p2: [{ en: "read between the lines", zh: "听出言外之意" }, { en: "keep someone at arm's length", zh: "与某人保持距离" }, { en: "piece the story together", zh: "拼出事情全貌" }],
        p3: [{ en: "I want the version of him that never made it into this house.", zh: "我想知道那个从未在这栋房子里出现过的他。" }, { en: "Inheritance is the least complicated thing in this room.", zh: "遗产反而是这间屋里最简单的事。" }],
        quiz: [{ situation: "你想追问父亲为何如此信任 Eleanor。", reference: "Help me understand why he trusted you so completely.", tip: "用 help me understand 把审问包装成求证。" }, { situation: "你怀疑她影响了遗嘱，但不能直接指控。", reference: "I'm trying to separate loyalty from influence here.", tip: "separate A from B 能精准划分问题。" }, { situation: "你要强调自己想要的并不只是遗产。", reference: "Inheritance is the least complicated thing in this room.", tip: "用反差把讨论引向关系与秘密。" }],
      },
      B: {
        p1: [{ from: "I don't want money.", to: "My reasons for being here were never financial.", zh: "Eleanor 澄清动机但不急着自证。" }, { from: "He cared about me.", to: "He trusted me with the parts of his life he couldn't explain.", zh: "暗示亲密关系，不直接揭底。" }, { from: "You don't understand him.", to: "You knew the man he had been; I knew the man he became.", zh: "承认两人看到的是父亲的不同阶段。" }],
        p2: [{ en: "earn someone's trust", zh: "赢得某人的信任" }, { en: "be named in the will", zh: "被写入遗嘱" }, { en: "keep something in confidence", zh: "替某事保密" }],
        p3: [{ en: "I am not asking you to rewrite the past, only to make room for it.", zh: "我不是要你改写过去，只是给它留一个位置。" }, { en: "Recognition can matter more than inheritance.", zh: "被承认有时比继承更重要。" }],
        quiz: [{ situation: "你要澄清自己留下并非为了钱。", reference: "My reasons for being here were never financial.", tip: "financial 比 money 更克制正式。" }, { situation: "你想暗示亡者把脆弱的一面交给了你。", reference: "He trusted me with the parts of his life he couldn't explain.", tip: "trusted me with 表示把重要之物托付给你。" }, { situation: "你希望 Victor 为你的存在留一点空间。", reference: "I'm not asking you to rewrite the past, only to make room for it.", tip: "not asking... only... 适合提出有限请求。" }],
      },
    },
    p2: [{ en: "keep something under wraps", zh: "把某事捂着不说" }, { en: "the elephant in the room", zh: "谁都不提的明显问题" }, { en: "come to terms with ...", zh: "接受、与……和解" }, { en: "have a hidden agenda", zh: "别有用心" }, { en: "let bygones be bygones", zh: "既往不咎" }],
    p3: [{ en: "Blood is thicker than water, or so they say.", zh: "都说血浓于水——反讽用" }, { en: "You're barking up the wrong tree.", zh: "你找错方向了" }, { en: "Some secrets die with us.", zh: "有些秘密该随人一起入土" }],
    quiz: [{ situation: "你怀疑对方在撒谎，想不撕破脸地点出漏洞。", reference: "That story has a few too many holes for my liking.", tip: "用 holes 代替 lie，含蓄又有力。" }, { situation: "你想让对方坦白，但语气要有分量。", reference: "I think it's time you leveled with me.", tip: "level with someone 表示对某人说实话。" }, { situation: "你想把嫉妒说成克制的遗憾。", reference: "Whatever he felt, he never said it out loud.", tip: "把指责转成遗憾，情绪张力更强。" }, { situation: "你想点破谁都不愿提的事。", reference: "Let's address the elephant in the room, shall we?", tip: "经典的正式社交破冰表达。" }],
  },
  {
    id: "signal",
    title: "静默信号",
    en: "Signal Lost",
    genre: "太空悬疑",
    difficulty: 3,
    minutes: 20,
    logline: "深空科研站只剩两名幸存者，地球失联，氧气够一个人撑到救援——而其中一个人，可能根本不是人。",
    world: "木星轨道上的俄耳甫斯科研站，一场事故后六名船员死了四个。通讯阵列被撞毁，生命维持系统受损，剩余氧气只够一人活到四十小时后的救援舱抵达。",
    relationship: "任务指挥官 Reyes 与新上站三个月的系统工程师 Kim。事故当晚 Kim 独自在维修舱，而 Reyes 正背负失去搭档和做出决定的双重压力。",
    acts: [
      { t: "第一幕 · 余氧", d: "系统确认氧气只够一人。Reyes 要 Kim 复盘事故当晚，Kim 则发现指挥官同样避开了一个关键时间点。" },
      { t: "第二幕 · 最后通讯", teaser: "损坏的终端恢复了一段来自地球的警告，时间戳早于事故整整六小时……" },
      { t: "第三幕 · 救援舱", teaser: "救援信标开始闪烁；两人必须决定谁进入舱，也必须决定让哪一个真相返回地球。" },
    ],
    hook: "由 Reyes 开场：调出事故日志，对 Kim 说“把那晚发生的事一步步跟我讲清楚”。",
    roles: {
      A: {
        name: "Reyes", gender: "男", title: "任务指挥官", persona: "男性，沉着克制、责任感极重。二十年飞行生涯第一次遇到无法上报、只能自己扛的局面。", stance: "你必须查清事故原因，也必须决定最后一份氧气给谁。Kim 事发时不在监控范围内，但你不能凭恐惧下判断。",
        tasks: { main: { goal: "引导 Kim 交代事故当晚的具体行踪，不能直接审讯。你还必须掩盖真正损毁通讯阵列的操作失误来自你的一道仓促指令。", judge: "Kim 说出当晚具体行踪，且不是被直接逼问出来的。" }, bonus: { goal: "全程不让 Kim 察觉那道致命指令是你下的。" } },
        p0: [{ en: "Walk me through what happened that night.", zh: "把那晚的事一步步跟我讲清楚（引导交代）" }, { en: "I need to be able to trust you.", zh: "我需要能够信任你（施压兼试探）" }],
      },
      B: {
        name: "Kim", gender: "女", title: "系统工程师", persona: "女性，安静精确，习惯用数据说话。上站仅三个月，是船员里的外人，事故后却出奇平静。", stance: "你知道自己最可疑：事发时独自在维修舱，没人能作证。你必须让 Reyes 相信你无辜，才能争取氧气；但越解释越像在掩饰。",
        tasks: { main: { goal: "你截获过一段被 Reyes 私自压下的地球撤离警告。先试探他是否知情，并让他明确信任你，再决定是否公开这条信息。", judge: "Reyes 明确表达信任，且你没有先抛出撤离警告。" }, bonus: { goal: "自然套问出 Reyes 对地球最后一次通讯知道多少。" } },
        p0: [{ en: "There's something you're not telling me either.", zh: "你也有事瞒着我（反将一军）" }, { en: "I had nothing to do with the crash.", zh: "事故跟我无关（自证清白）" }],
      },
    },
    p0shared: [{ en: "We don't have time to play games.", zh: "我们没时间兜圈子了（制造紧迫）" }, { en: "Let's lay our cards on the table.", zh: "我们把话都摊开说吧（邀请坦白）" }, { en: "That doesn't line up with the logs.", zh: "这和记录对不上（质疑）" }, { en: "One of us is lying.", zh: "我们俩里有一个在撒谎（逼问）" }, { en: "I want to believe you.", zh: "我想相信你（示弱兼施压）" }],
    p1: [{ from: "You did something.", to: "The timeline doesn't add up on your end.", zh: "指控转为质疑时间线。" }, { from: "I am not lying.", to: "I've got no reason to lie to you now.", zh: "自证时给出理由更可信。" }, { from: "Tell me now.", to: "I need the truth, and I need it now.", zh: "施压时增加重量。" }, { from: "I am scared.", to: "I won't pretend I'm not on edge.", zh: "把恐惧说得克制专业。" }],
    rolePrep: {
      A: {
        p1: [{ from: "Where were you?", to: "Walk me through the gap in the maintenance log.", zh: "Reyes 用日志缺口引导 Kim 自述。" }, { from: "Your story is wrong.", to: "That sequence doesn't match the system record.", zh: "把怀疑落到可核查的记录。" }, { from: "I decide who lives.", to: "Command means I have to make a decision I can defend.", zh: "用责任而非权力表达决定。" }],
        p2: [{ en: "account for the missing time", zh: "解释缺失的时间" }, { en: "follow the chain of command", zh: "遵循指挥链" }, { en: "rule out a possibility", zh: "排除一种可能" }],
        p3: [{ en: "I can't let suspicion make this decision for me.", zh: "我不能让怀疑替我做这个决定。" }, { en: "Every order leaves a trace, even the ones we regret.", zh: "每道命令都会留下痕迹，包括我们后悔的那些。" }],
        quiz: [{ situation: "你想让 Kim 解释维修日志里的空白。", reference: "Walk me through the gap in the maintenance log.", tip: "gap 把模糊怀疑变成明确缺口。" }, { situation: "你要指出她的叙述与记录不符。", reference: "That sequence doesn't match the system record.", tip: "match the record 是专业核查表达。" }, { situation: "你必须说明这是责任决定，不是权力游戏。", reference: "Command means I have to make a decision I can defend.", tip: "a decision I can defend 强调可解释性。" }],
      },
      B: {
        p1: [{ from: "I am innocent.", to: "The data can clear this up faster than I can.", zh: "Kim 用数据自证，避免情绪辩解。" }, { from: "You know something.", to: "Your timeline has a gap too, Commander.", zh: "反向指出 Reyes 的时间线同样缺失。" }, { from: "Trust me.", to: "Cross-check my account against the raw logs.", zh: "邀请验证，比空口求信任更可信。" }],
        p2: [{ en: "clear my name", zh: "洗清嫌疑" }, { en: "cross-check the logs", zh: "交叉核对日志" }, { en: "go on the record", zh: "正式留下记录" }],
        p3: [{ en: "If you want certainty, interrogate the data, not the survivor.", zh: "若你要确定性，就审问数据，不要审问幸存者。" }, { en: "Silence in a log is still information.", zh: "日志里的沉默也是信息。" }],
        quiz: [{ situation: "你想用原始数据洗清嫌疑。", reference: "The data can clear this up faster than I can.", tip: "让证据替你说话，语气更冷静。" }, { situation: "你要指出指挥官的时间线也有缺口。", reference: "Your timeline has a gap too, Commander.", tip: "too 把审问变成双向核查。" }, { situation: "你邀请对方验证自己的陈述。", reference: "Cross-check my account against the raw logs.", tip: "cross-check against 是专业比对表达。" }],
      },
    },
    p2: [{ en: "buy time", zh: "拖延、争取时间" }, { en: "cover your tracks", zh: "掩盖行踪或痕迹" }, { en: "a leap of faith", zh: "赌一把的信任" }, { en: "call someone's bluff", zh: "戳穿某人的虚张声势" }, { en: "the point of no return", zh: "无法回头的临界点" }],
    p3: [{ en: "Trust is a luxury we can't afford right now.", zh: "信任是此刻我们负担不起的奢侈" }, { en: "Read between the lines, Commander.", zh: "听出我的弦外之音，指挥官" }, { en: "We're both running out of air and answers.", zh: "我们的氧气和答案都在见底" }],
    quiz: [{ situation: "你想不指控地质疑对方的时间线。", reference: "The timeline just doesn't add up on your end.", tip: "doesn't add up 表示逻辑说不通。" }, { situation: "你想强调自己现在没理由撒谎。", reference: "I've got no reason to lie to you now — we're in the same boat.", tip: "in the same boat 强化命运共同体。" }, { situation: "你想承认紧张但不显慌乱。", reference: "I won't pretend I'm not on edge, but I'm still thinking clearly.", tip: "on edge 比 scared 更克制。" }, { situation: "你想戳穿对方在虚张声势。", reference: "I think you're bluffing — prove me wrong.", tip: "bluffing 是高压博弈中的高频表达。" }],
  },
  {
    id: "wedding",
    title: "婚礼前夜",
    en: "The Night Before",
    genre: "情感博弈",
    difficulty: 3,
    minutes: 20,
    logline: "婚礼前夜的酒店露台，明天的新娘撞见三年前不辞而别的旧情人——而他，正是明天伴郎团里的一员。",
    world: "海边度假酒店，明天有一场盛大婚礼。深夜顶楼露台只剩海风和两杯没喝完的酒。距离婚礼开始十小时，Jamie 撞见了那个本该永远消失在过去的人。",
    relationship: "一对三年前无疾而终的旧情人。Alex 当年不告而别，Jamie 从没得到解释；如今一个即将走进婚姻，一个带着没说出口的话回来道别。",
    acts: [
      { t: "第一幕 · 露台重逢", d: "Jamie 想问清 Alex 当年为何离开，Alex 却只愿谈明天的婚礼。两人都努力表现得自己早已翻篇。" },
      { t: "第二幕 · 没说完的告别", teaser: "一件被保留三年的旧物，让“已经放下”突然变成一句站不住的话……" },
      { t: "第三幕 · 天亮之前", teaser: "婚礼晨钟将响；他们必须决定今晚是最后一次告别，还是第一次真正说实话。" },
    ],
    hook: "由 Jamie 开场：看着 Alex 手里的酒杯，说“你欠我一个诚实的答案，就一个”。",
    roles: {
      A: {
        name: "Jamie", gender: "女", title: "明天的新娘", persona: "女性，外表笃定，内心却一直没放下那段旧情。为婚礼准备了一切，唯独没准备好面对今晚这个人。", stance: "未婚夫是个好人，你也确信自己做了正确选择。但 Alex 当年的不辞而别仍是心里一根刺；你想在走进婚姻前最后问清一次。",
        tasks: { main: { goal: "引导 Alex 说出当年离开的真实原因，同时不能显得自己仍未放下。你至今保留着他送的东西，就在今晚的行李里。", judge: "Alex 说出离开的真实原因，且 Jamie 没有表现出仍未放下。" }, bonus: { goal: "全程不让 Alex 察觉你还保留着当年他送的东西。" } },
        p0: [{ en: "I'm not asking for me — I just need to understand.", zh: "我不是为自己问，我只是想弄明白（掩饰在意）" }, { en: "Why did you really leave?", zh: "你当年到底为什么走？（直击核心）" }],
      },
      B: {
        name: "Alex", gender: "男", title: "伴郎团成员", persona: "男性，看似洒脱、谈笑风生，其实每句轻松的话下面都压着分量。以新郎好友的身份出现，本身就是一场豪赌。", stance: "三年前你选择离开，有一个从未告诉任何人的理由。今晚你本可躲开，却还是来了；你告诉自己只是来道别和祝福。",
        tasks: { main: { goal: "当年你因一场重病不想拖累 Jamie 而消失，如今已经痊愈。不要透露病情，也不要破坏婚礼；让她说出“如果当年你留下”之类的假设。", judge: "Jamie 说出关于你当年留下的假设性话语，且你没有透露病情。" }, bonus: { goal: "真诚祝福明天的婚礼，让 Jamie 相信你已经释怀。" } },
        p0: [{ en: "You look happy. I mean that.", zh: "你看起来很幸福，我是真心的（试探兼祝福）" }, { en: "Some doors are better left closed.", zh: "有些门还是关着的好（暗示秘密）" }],
      },
    },
    p0shared: [{ en: "We were good together, weren't we?", zh: "我们当年很相配，不是吗？（唤起旧情）" }, { en: "I've moved on — mostly.", zh: "我已经放下了——大部分（欲盖弥彰）" }, { en: "Let's not do this tonight.", zh: "今晚我们别聊这个吧（回避）" }, { en: "There's something I never told you.", zh: "有件事我从没告诉过你（埋伏笔）" }, { en: "What are we even doing here?", zh: "我们这算在干什么？（点破张力）" }],
    p1: [{ from: "I still think about you.", to: "You crossed my mind once or twice.", zh: "把思念说得轻描淡写。" }, { from: "Why did you leave me?", to: "You owe me one honest answer.", zh: "追问时给对方台阶。" }, { from: "I am happy now.", to: "I've built something good, and I mean it.", zh: "宣示幸福更有说服力。" }, { from: "Don't lie to me.", to: "Just this once, tell me the truth.", zh: "求真相时软化语气。" }],
    rolePrep: {
      A: {
        p1: [{ from: "Why did you leave me?", to: "You owe me one honest answer before tomorrow.", zh: "Jamie 给追问设定清晰边界。" }, { from: "I am over you.", to: "I've built something good, and I'm choosing it.", zh: "强调当下选择，而不是防御过去。" }, { from: "This changes nothing.", to: "Understanding the past doesn't mean reopening it.", zh: "把求真相和重启关系分开。" }],
        p2: [{ en: "get some closure", zh: "为关系找到终结感" }, { en: "draw a line under the past", zh: "给过去画上句号" }, { en: "second-guess a decision", zh: "重新怀疑一个决定" }],
        p3: [{ en: "I can choose tomorrow and still question yesterday.", zh: "我可以选择明天，同时追问昨天。" }, { en: "An explanation is not an invitation back into my life.", zh: "解释不等于重新进入我的生活。" }],
        quiz: [{ situation: "你想索取一个答案，但明确只谈到明天之前。", reference: "You owe me one honest answer before tomorrow.", tip: "before tomorrow 给情绪对话设定边界。" }, { situation: "你要说明自己正在主动选择现在的关系。", reference: "I've built something good, and I'm choosing it.", tip: "choosing 比 simply happy 更有主导感。" }, { situation: "你想说明问过去不代表要重来。", reference: "Understanding the past doesn't mean reopening it.", tip: "doesn't mean 能拆开两件容易被混淆的事。" }],
      },
      B: {
        p1: [{ from: "Congratulations.", to: "You look happy, and I genuinely hope you are.", zh: "Alex 的祝福真诚，却保留一点试探。" }, { from: "I can't tell you why.", to: "Some answers would ask more of you than I have a right to.", zh: "守住秘密但承认答案有重量。" }, { from: "Do you still love me?", to: "Are you walking into tomorrow without any doubt?", zh: "不直接问感情，改问婚姻确定性。" }],
        p2: [{ en: "make peace with the past", zh: "与过去和解" }, { en: "walk away for good", zh: "永远离开" }, { en: "leave the past where it belongs", zh: "让过去留在过去" }],
        p3: [{ en: "I came to wish you well, not to make you choose again.", zh: "我是来祝福你的，不是让你再选一次。" }, { en: "Sometimes leaving is the only honest thing a frightened person can do.", zh: "有时离开是一个害怕的人唯一诚实的选择。" }],
        quiz: [{ situation: "你想祝福 Jamie，又想确认她是否真的幸福。", reference: "You look happy, and I genuinely hope you are.", tip: "genuinely hope 让试探听起来不是挑衅。" }, { situation: "你要守住离开的原因，但承认它很沉重。", reference: "Some answers would ask more of you than I have a right to.", tip: "have a right to 表达克制的边界感。" }, { situation: "你不能直接问她是否还爱你。", reference: "Are you walking into tomorrow without any doubt?", tip: "把感情试探转成对婚姻选择的确认。" }],
      },
    },
    p2: [{ en: "unfinished business", zh: "没了结的事" }, { en: "carry a torch for someone", zh: "对某人余情未了" }, { en: "water under the bridge", zh: "过去的事、都翻篇了" }, { en: "for old times' sake", zh: "看在旧日情分上" }, { en: "leave things unsaid", zh: "有些话留着不说" }],
    p3: [{ en: "Timing was never on our side.", zh: "我们从来输给了时机" }, { en: "Let's not open old wounds.", zh: "别再揭旧伤疤了" }, { en: "You were the one that got away.", zh: "你是我错过的那个人" }],
    quiz: [{ situation: "你想承认自己还想着对方，但要云淡风轻。", reference: "You crossed my mind once or twice — nothing dramatic.", tip: "cross one's mind 比 I think about you 更克制。" }, { situation: "你想要一个坦诚答案，又不想逼得太紧。", reference: "You owe me one honest answer — just one.", tip: "owe someone an answer 把追问变成合理索取。" }, { situation: "你想真诚宣示现在的幸福。", reference: "I've built something good here, and I mean every word of it.", tip: "I mean every word 加重真诚。" }, { situation: "你想形容这段没结果的旧情。", reference: "I guess some things are just unfinished business.", tip: "unfinished business 点透没了结的关系。" }],
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

// ---------- 模型配置（仅保存在当前设备，不写入房间或共享存储） ----------
const MODEL_CONFIG_SESSION_KEY = "dramaspeak:model-config:session";
const MODEL_CONFIG_PERSIST_KEY = "dramaspeak:model-config:remembered";
const MODEL_PROVIDERS = {
  glm: {
    label: "GLM（智谱）",
    imageLabel: "CogView-3-Flash",
    defaultModel: "glm-5.2",
    models: [
      { id: "glm-5.2", label: "GLM-5.2（推荐）" },
      { id: "glm-5", label: "GLM-5" },
      { id: "glm-4.7", label: "GLM-4.7" },
    ],
  },
  anthropic: {
    label: "Claude",
    defaultModel: "claude-sonnet-5",
    models: [
      { id: "claude-fable-5", label: "Claude Fable 5（最高能力）" },
      { id: "claude-sonnet-5", label: "Claude Sonnet 5（推荐）" },
      { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5（快速）" },
    ],
  },
  deepseek: {
    label: "DeepSeek",
    defaultModel: "deepseek-v4-flash",
    models: [
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash（推荐）" },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
    ],
  },
  qwen: {
    label: "通义千问",
    defaultModel: "qwen3.7-plus",
    models: [
      { id: "qwen3.7-plus", label: "Qwen 3.7 Plus（推荐）" },
      { id: "qwen3.5-plus", label: "Qwen 3.5 Plus" },
      { id: "qwen3.5-flash", label: "Qwen 3.5 Flash" },
    ],
  },
  kimi: {
    label: "Kimi",
    defaultModel: "kimi-k2.5",
    models: [
      { id: "kimi-k2.5", label: "Kimi K2.5（推荐）" },
      { id: "moonshot-v1-128k", label: "Moonshot V1 128K" },
      { id: "moonshot-v1-32k", label: "Moonshot V1 32K" },
    ],
  },
  doubao: {
    label: "豆包",
    defaultModel: "doubao-seed-2-0-lite-260215",
    models: [
      { id: "doubao-seed-2-0-lite-260215", label: "Doubao Seed 2.0 Lite（推荐）" },
      { id: "doubao-seed-2-0-pro-260215", label: "Doubao Seed 2.0 Pro" },
    ],
  },
  gemini: {
    label: "Gemini",
    defaultModel: "gemini-3.5-flash",
    models: [
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash（推荐）" },
      { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
      { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
    ],
  },
  grok: {
    label: "Grok",
    defaultModel: "grok-4.5",
    models: [
      { id: "grok-4.5", label: "Grok 4.5（推荐）" },
      { id: "grok-4.3", label: "Grok 4.3" },
    ],
  },
  "openai-compatible": {
    label: "OpenAI",
    imageLabel: "GPT Image 2",
    defaultModel: "gpt-5.6-terra",
    models: [
      { id: "gpt-5.6-sol", label: "GPT-5.6 Sol（最高能力）" },
      { id: "gpt-5.6-terra", label: "GPT-5.6 Terra（推荐）" },
      { id: "gpt-5.6-luna", label: "GPT-5.6 Luna（快速）" },
      { id: "gpt-5.2", label: "GPT-5.2（兼容）" },
    ],
  },
};

const emptyModelConfig = {
  enabled: false,
  provider: "glm",
  model: MODEL_PROVIDERS.glm.defaultModel,
  apiKey: "",
  remember: false,
};

function normalizeModelConfig(value) {
  const provider = MODEL_PROVIDERS[value?.provider] ? value.provider : "glm";
  const providerConfig = MODEL_PROVIDERS[provider];
  const requestedModel = String(value?.model || "").trim();
  const model = providerConfig.models.some((option) => option.id === requestedModel)
    ? requestedModel
    : providerConfig.defaultModel;
  return {
    enabled: Boolean(value?.enabled),
    provider,
    model,
    apiKey: String(value?.apiKey || "").trim().slice(0, 512),
    remember: Boolean(value?.remember),
  };
}

function loadModelConfig() {
  if (typeof window === "undefined") return emptyModelConfig;
  try {
    const raw = window.sessionStorage.getItem(MODEL_CONFIG_SESSION_KEY) || window.localStorage.getItem(MODEL_CONFIG_PERSIST_KEY);
    return raw ? normalizeModelConfig(JSON.parse(raw)) : emptyModelConfig;
  } catch {
    return emptyModelConfig;
  }
}

function saveModelConfig(value) {
  const config = normalizeModelConfig(value);
  if (typeof window === "undefined") return config;
  try {
    window.sessionStorage.setItem(MODEL_CONFIG_SESSION_KEY, JSON.stringify(config));
    if (config.remember && config.apiKey) {
      window.localStorage.setItem(MODEL_CONFIG_PERSIST_KEY, JSON.stringify(config));
    } else {
      window.localStorage.removeItem(MODEL_CONFIG_PERSIST_KEY);
    }
  } catch {}
  return config;
}

function getRequestModelConfig() {
  const config = loadModelConfig();
  if (!config.enabled || !config.apiKey) return null;
  return { provider: config.provider, model: config.model, apiKey: config.apiKey };
}

// ---------- 模型 API（SOS、教练、动态剧情等） ----------
async function callClaude(prompt, { allowFallback = true } = {}) {
  const res = await fetch("/api/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, config: getRequestModelConfig(), allowFallback }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Model request failed");
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
  const [modelConfig, setModelConfig] = useState(() => loadModelConfig());
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

  const updateModelConfig = (next) => setModelConfig(saveModelConfig(next));

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
      roomStateRef.current = next;
      setRoomState(next);
    },
    [room?.code]
  );

  const startShow = async () => {
    const sessionId = Date.now();
    const openingScript = allScripts.find((script) => script.id === meta?.packId);
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
    if (openingScript?.imagePrompt) {
      generateSceneImage(openingScript.imagePrompt)
        .then(async (imageUrl) => {
          if (!imageUrl || roomStateRef.current?.sessionId !== sessionId) return;
          const dynActs = roomStateRef.current?.dynActs || {};
          await writePhase({
            dynActs: { ...dynActs, 0: { ...(dynActs[0] || {}), imageUrl } },
          });
        })
        .catch(() => {});
    }
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
          modelConfig={modelConfig}
          onModelConfigChange={updateModelConfig}
          showToast={showToast}
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
          initialRole={members.find((m) => m.userId === profile?.id)?.role}
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
            <div className="ds-display text-2xl sm:text-3xl">DramaSpeak</div>
            <div className="text-xs mt-1 tracking-wide" style={{ color: T.faint }}>
              剧本杀疯狂之夜 · 职场英语双人局
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

function Home({ profile, prepMap, customScripts, notebookCount, lastRoom, onRejoin, onOpenNotebook, onOpenWizard, onDeleteScript, onCreate, onJoin, onRename, onOpenScript, modelConfig, onModelConfigChange, showToast }) {
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

      <ModelSettings config={modelConfig} onChange={onModelConfigChange} showToast={showToast} />

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

function ModelSettings({ config, onChange, showToast }) {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const hasPersonalModel = config.enabled && !!config.apiKey;
  const imageLabel = MODEL_PROVIDERS[config.provider].imageLabel;
  const isGlmCodingKey = config.provider === "glm" && config.apiKey.startsWith("sk-code");

  const update = (patch) => onChange({ ...config, ...patch });
  const selectProvider = (provider) =>
    update({ provider, model: MODEL_PROVIDERS[provider].defaultModel });

  const testConnection = async () => {
    if (!config.apiKey) return showToast("先输入 API key 再验证", "err");
    setTesting(true);
    try {
      const res = await fetch("/api/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Reply with exactly: DramaSpeak ready",
          config: { provider: config.provider, model: config.model, apiKey: config.apiKey },
          allowFallback: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "连接失败");
      showToast(`${MODEL_PROVIDERS[config.provider].label} 已连接 ✓`);
    } catch {
      showToast("模型连接失败，检查 key、模型名和账户权限", "err");
    }
    setTesting(false);
  };

  return (
    <Card style={{ border: `1px solid ${hasPersonalModel ? T.jade : T.line}` }}>
      <button className="w-full text-left" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="ds-display text-lg">AI 模型配置</div>
            <div
              className="text-xs mt-1 leading-5"
              style={{ color: hasPersonalModel ? T.jade : T.faint }}
            >
              {hasPersonalModel
                ? `已启用：${MODEL_PROVIDERS[config.provider].label} · ${config.model}`
                : "选择模型厂商和版本，填写 API Key，开启实时教练、幕间推进与复盘"}
            </div>
          </div>
          <span className="text-sm shrink-0" style={{ color: T.spot }}>
            {open ? "收起" : hasPersonalModel ? "更改模型" : "配置模型"}
          </span>
        </div>
      </button>

      {open && (
        <div className="mt-4 pt-4 space-y-3" style={{ borderTop: `1px solid ${T.line}` }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(MODEL_PROVIDERS).map(([id, provider]) => {
              const active = config.provider === id;
              return (
                <button
                  key={id}
                  onClick={() => selectProvider(id)}
                  className="rounded-lg px-3 py-2 text-sm text-left"
                  style={{
                    background: active ? "#332b16" : T.ink,
                    border: `1px solid ${active ? T.spot : T.line}`,
                    color: active ? T.spot : T.mut,
                  }}
                >
                  {provider.label}
                </button>
              );
            })}
          </div>

          <label className="block text-xs" style={{ color: T.faint }}>
            选择模型
            <select
              value={config.model}
              onChange={(e) => update({ model: e.target.value })}
              className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: T.ink, border: `1px solid ${T.line}`, color: T.text }}
            >
              {MODEL_PROVIDERS[config.provider].models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs leading-relaxed" style={{ color: imageLabel ? T.jade : T.faint }}>
            {isGlmCodingKey
              ? "检测到 GLM Coding Plan Key：可用于文本，但不能调用 CogView；生成图片需换成智谱开放平台通用 Key。"
              : imageLabel
              ? `一份 Key 同时驱动文本和三幕场景图；图片由 ${imageLabel} 自动生成。`
              : "当前厂商的 Key 仅驱动文本；三幕图片将使用 DramaSpeak 场景卡。"}
          </p>

          <label className="block text-xs" style={{ color: T.faint }}>
            API key
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => update({ apiKey: e.target.value, enabled: !!e.target.value })}
              placeholder="仅保存在你的浏览器中，不会发给搭档"
              autoComplete="off"
              className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: T.ink, border: `1px solid ${T.line}`, color: T.text }}
            />
          </label>

          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: T.mut }}>
            <input
              type="checkbox"
              checked={config.remember}
              onChange={(e) => update({ remember: e.target.checked })}
            />
            在此设备记住 key（默认只在本次浏览器会话中保存）
          </label>

          <div className="flex gap-2">
            <Btn kind="panel" onClick={testConnection} disabled={testing || !config.apiKey}>
              {testing ? "验证中…" : "验证文本连接"}
            </Btn>
            {hasPersonalModel && (
              <Btn kind="ghost" onClick={() => update({ ...emptyModelConfig })}>
                改用服务器默认模型
              </Btn>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: T.faint }}>
            你的 key 只随本机发起的模型请求发送到对应服务商，不会写入房间、复盘或 GitHub。
          </p>
        </div>
      )}
    </Card>
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

function PrepView({ script, done, initialRole, onBack, onDone }) {
  const [tier, setTier] = useState("p0");
  const [prepRole, setPrepRole] = useState(initialRole || "A");
  const [quizState, setQuizState] = useState({ A: {}, B: {} }); // {role: {idx: 'revealed'}}
  useEffect(() => {
    if (initialRole) setPrepRole(initialRole);
  }, [initialRole]);

  const role = script.roles[prepRole];
  const rolePrep = script.rolePrep?.[prepRole] || {};
  const quiz = rolePrep.quiz || script.quiz;
  const allRevealed = quiz.every((_, i) => quizState[prepRole]?.[i]);

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

      {/* 选择自己的备课路线 */}
      <Card>
        <div className="ds-display text-lg mb-1">选择你的角色</div>
        <p className="text-xs mb-3" style={{ color: T.faint }}>
          共同表达两人都要会；下面的升级句、词组和自测会完全按你此刻选择的角色切换。
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {["A", "B"].map((r) => {
            const candidate = script.roles[r];
            const active = prepRole === r;
            return (
              <button
                key={r}
                onClick={() => setPrepRole(r)}
                className="text-left rounded-lg p-3"
                style={{ background: active ? "#332b16" : T.ink, border: `1px solid ${active ? T.spot : T.line}` }}
              >
                <div className="flex items-baseline gap-2">
                  <span className="ds-display text-lg" style={{ color: active ? T.spot : T.text }}>{candidate.name}</span>
                  <span className="text-xs" style={{ color: T.faint }}>{candidate.title}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: T.mut }}>{candidate.stance}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 当前角色的人设与任务方向 */}
      <Card>
        <div className="flex items-baseline gap-2">
          <div className="ds-display text-lg">{role.name} 的备课路线</div>
          <span className="text-xs" style={{ color: T.faint }}>{role.title}</span>
        </div>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: T.mut }}>{role.persona}</p>
        <p className="text-sm mt-1 leading-relaxed">{role.stance}</p>
        <div className="rounded-lg mt-3 p-3" style={{ background: T.ink, border: `1px solid ${T.line}` }}>
          <div className="text-xs" style={{ color: T.spot }}>你的私密主线（演出时才会揭晓具体任务）</div>
          <div className="text-sm mt-1">你需要用语言推进自己的立场、试探对方，并完成角色专属目标。</div>
        </div>
      </Card>

      {/* 两个角色的公开人设 */}
      <div className="grid sm:grid-cols-2 gap-3">
        {["A", "B"].map((r) => {
          const candidate = script.roles[r];
          return (
            <Card key={r}>
              <div className="flex items-baseline gap-2">
                <span className="ds-display text-lg">{candidate.name}</span>
                <span className="text-xs" style={{ color: T.faint }}>
                  {candidate.title}
                </span>
              </div>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: T.mut }}>
                {candidate.persona}
              </p>
              <p className="text-sm mt-1 leading-relaxed">{candidate.stance}</p>
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
            <div className="text-xs mb-1" style={{ color: T.faint }}>共同基础</div>
            {script.p0shared.map((e, i) => (
              <ExpRow key={i} en={e.en} zh={e.zh} />
            ))}
            <div className="pt-2">
              <div className="text-xs mb-1" style={{ color: T.spot }}>{role.name} 专属</div>
              {role.p0.map((e, i) => <ExpRow key={i} en={e.en} zh={e.zh} />)}
            </div>
          </div>
        )}
        {tier === "p1" && (
          <div className="space-y-3">
            {(rolePrep.p1 || script.p1).map((e, i) => (
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
            {(rolePrep[tier] || script[tier]).map((e, i) => (
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
          {quiz.map((q, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: T.ink, border: `1px solid ${T.line}` }}>
              <div className="text-sm">
                {i + 1}. {q.situation}
              </div>
              {!quizState[prepRole]?.[i] ? (
                <button
                  className="text-xs mt-2 underline"
                  style={{ color: T.spot }}
                  onClick={() => setQuizState((s) => ({ ...s, [prepRole]: { ...s[prepRole], [i]: true } }))}
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
  const [translationOn, setTranslationOn] = useState(() => {
    try {
      return window.localStorage.getItem("dramaspeak:live-translation") === "on";
    } catch {
      return false;
    }
  });
  const [translations, setTranslations] = useState({});
  const [translationError, setTranslationError] = useState("");
  const [translationRetry, setTranslationRetry] = useState(0);
  const translationsRef = useRef({});
  const translatingRef = useRef(new Set());
  const translationFailedRef = useRef(new Set());
  const translationQueueRef = useRef([]);
  const translationRunningRef = useRef(false);
  const translationOnRef = useRef(translationOn);
  translationOnRef.current = translationOn;
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
  const translationKey = (line) =>
    `${line.mine ? profile.id : partner?.userId || "partner"}:${line.ts}`;

  const drainTranslationQueue = async () => {
    if (translationRunningRef.current) return;
    translationRunningRef.current = true;
    while (translationOnRef.current && translationQueueRef.current.length) {
      const { line, key } = translationQueueRef.current.shift();
      try {
        const raw = await callClaude(
          `Translate this spoken workplace English into concise, natural Simplified Chinese. Preserve the speaker's tone and intent. Do not explain or answer the sentence. Respond ONLY as JSON: {"translation":"中文翻译"}\n\nEnglish utterance: ${JSON.stringify(line.text)}`,
          { allowFallback: false }
        );
        const parsed = parseJSONLoose(raw);
        const translated = String(parsed?.translation || raw || "").trim().slice(0, 500);
        if (!translated) throw new Error("Empty translation");
        setTranslations((current) => {
          const next = { ...current, [key]: translated };
          translationsRef.current = next;
          return next;
        });
      } catch {
        translationFailedRef.current.add(key);
        setTranslationError("翻译暂不可用，请检查首页的模型配置");
      } finally {
        translatingRef.current.delete(key);
        setTranslations((current) => ({ ...current }));
      }
    }
    translationRunningRef.current = false;
    if (translationOnRef.current && translationQueueRef.current.length) {
      drainTranslationQueue();
    }
  };

  // 翻译只保存在当前浏览器，不写入房间；队列逐句处理，避免同时打爆模型接口。
  useEffect(() => {
    if (!translationOn) return;
    const pending = merged.filter((line) => {
      const key = translationKey(line);
      return (
        line.text &&
        !translationsRef.current[key] &&
        !translatingRef.current.has(key) &&
        !translationFailedRef.current.has(key)
      );
    });
    if (pending.length) {
      pending.forEach((line) => {
        const key = translationKey(line);
        translatingRef.current.add(key);
        translationQueueRef.current.push({ line, key });
      });
      setTranslations((current) => ({ ...current }));
    }
    drainTranslationQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationOn, translationRetry, myLines, partnerLines, actIndex, profile.id, partner?.userId]);

  const toggleTranslation = () => {
    const next = !translationOn;
    translationFailedRef.current.clear();
    setTranslationOn(next);
    setTranslationError("");
    try {
      window.localStorage.setItem("dramaspeak:live-translation", next ? "on" : "off");
    } catch {}
  };

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
      ? {
          t: script.acts[0].t,
          d: script.acts[0].d,
          hook: script.hook,
          imageUrl: dynAct?.imageUrl || null,
        }
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
      <div className="rounded-2xl overflow-hidden" style={{ background: T.ink2, border: `1px solid ${T.line}` }}>
        <div
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: `1px solid ${T.line}` }}
        >
          <div className="min-w-0">
            <div className="text-sm font-medium">实时字幕</div>
            {translationError && translationOn && (
              <button
                className="text-xs mt-0.5 underline text-left"
                style={{ color: T.coral }}
                onClick={() => {
                  translationFailedRef.current.clear();
                  setTranslationError("");
                  setTranslationRetry((value) => value + 1);
                }}
              >
                {translationError} · 重试
              </button>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={translationOn}
            onClick={toggleTranslation}
            className="flex items-center gap-2 text-xs flex-shrink-0"
            style={{ color: translationOn ? T.spot : T.mut }}
          >
            中文翻译
            <span
              className="relative inline-flex w-9 h-5 rounded-full transition-colors"
              style={{ background: translationOn ? T.spot : T.line }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{
                  left: translationOn ? 18 : 2,
                  background: translationOn ? T.ink : T.mut,
                }}
              />
            </span>
          </button>
        </div>

        <div ref={scrollRef} className="p-4 h-64 sm:h-72 overflow-y-auto space-y-2">
          {merged.length === 0 && !interim && (
            <div className="text-sm text-center mt-14" style={{ color: T.faint }}>
              开口吧——你们的台词会实时出现在这里
              <div className="text-xs mt-1">（声音走微信语音，这里只做字幕）</div>
            </div>
          )}
          {merged.map((line, index) => {
            const key = translationKey(line);
            const translated = translations[key];
            const translating = translatingRef.current.has(key);
            return (
              <div key={index} className={`flex ${line.mine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed"
                  style={{
                    background: line.mine ? "rgba(233,180,76,0.13)" : T.panel,
                    border: `1px solid ${line.mine ? "rgba(233,180,76,0.4)" : T.line}`,
                  }}
                >
                  <div>
                    {line.text}
                    {line.manual && (
                      <span className="text-xs ml-1" style={{ color: T.faint }}>
                        ✎
                      </span>
                    )}
                  </div>
                  {translationOn && (translated || translating) && (
                    <div
                      className="text-xs mt-1.5 pt-1.5 leading-relaxed"
                      style={{ color: translated ? T.mut : T.faint, borderTop: `1px solid ${T.line}` }}
                    >
                      {translated || "翻译中…"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {interim && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm" style={{ color: T.faint }}>
                {interim}…
              </div>
            </div>
          )}
        </div>
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

// 图片生成：复用首页模型配置中的同一 Key；未配置或厂商不支持时降级为场景卡。
async function generateSceneImage(prompt) {
  try {
    if (typeof window.DUO_IMAGE_API === "function") {
      const url = await window.DUO_IMAGE_API(prompt);
      if (typeof url === "string" && url) return url;
    }
  } catch {}
  try {
    const res = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, config: getRequestModelConfig() }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.imageUrl === "string" && data.imageUrl) return data.imageUrl;
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

const GENRE_TAGS = ["职场", "谈判", "悬疑", "危机", "高管", "客户", "峰会", "商务社交"];
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
  return `You are a playwright designing playful, theatre-first, two-person English roleplay scenarios for Chinese B1-B2 learners. Each scenario is a roughly 25-minute mini drama with exactly one male protagonist and one female protagonist. The two players must WIN THROUGH TALKING — every concept needs verbal tension (information gaps, conflicting interests, time pressure, or secrets), a reveal or reversal, and a satisfying ending.

SETTING BOUNDARY (non-negotiable): Every scenario must happen in a real workplace or formal professional-social setting: office, client meeting, boardroom, industry conference, business dinner, investor meeting, trade-show backstage, or business travel. The drama must be plausible in a professional context and teach useful workplace/formal-social English. Do not use romance, weddings, school, casual friendship hangouts, family drama, or purely daily-life settings.

${src}
${avoid ? `Must be clearly different from these previous concepts: ${avoid}` : ""}

Give exactly 3 distinct story concepts. Make titles memorable, playful, and specific; avoid generic workplace debates. Make the roles' gender unambiguous from their names and professional identities. All text in Chinese except character names.
Respond ONLY with JSON, no markdown fences:
{"concepts":[{"title":"中文剧名(2-6字)","tagline":"一句话钩子(≤25字)","conflict":"核心冲突(≤30字)","roles":[{"name":"英文名","title":"中文身份(≤8字)"},{"name":"英文名","title":"中文身份(≤8字)"}]}]}`;
}

function buildDramaPrompt(seedDesc, spice, goals, revision) {
  const spiceRule = {
    mild: "hidden tasks should be achievable with straightforward but deliberate language moves",
    spicy: "hidden tasks must require indirect strategy (probing, steering, withholding) to achieve",
    drama: "hidden tasks should be ambitious and theatrical, plus playful bonus tasks",
  }[spice];
  return `You are a playwright-designer of playful, theatre-first, two-person English roleplay dramas for Chinese B1-B2 learners.

STORY BASIS: ${seedDesc}
LANGUAGE GOALS the pair wants to practice: ${goals.join(", ") || "general conversation"} — the plot MUST force these skills (e.g. if practicing polite refusal, the plot must contain a request that must be refused).
${revision ? `REVISION REQUEST from the creator (apply it): ${revision}` : ""}

DRAMA FORMAT (critical):
- Target performance time is about 25 minutes; set "minutes" to 25.
- Exactly two protagonists: Role A is male and Role B is female. Make their genders unmistakable through names, identities, and persona wording.
- Give the story a vivid premise, a twist/reversal, and a finale with a real choice. It should feel fun to perform, not like an English textbook debate.
- Use a memorable, specific title; avoid generic titles such as "The Debate" or "A Meeting".
- The setting MUST be a real workplace or formal professional-social setting: office, client meeting, boardroom, industry conference, business dinner, investor meeting, trade-show backstage, or business travel. The language must be useful for work or formal networking.
- Do not use romance, weddings, school, casual friendship hangouts, family drama, or purely daily-life settings.

HIDDEN TASK RULES (critical):
- Each role gets 1 main task + 1 bonus task, secret from the other player.
- Tasks must be achievable ONLY through language strategy (probing, persuading, withholding, steering) — never plot chores.
- Each main task needs a "judge" criterion checkable from a transcript.
- The two main tasks must create tension but NOT be mutually exclusive.
- Spice level: ${spiceRule}.
Self-check before answering: does every act force the pair to talk? Are tasks judgeable? If not, fix silently.

All text in Chinese except: "en" (English title), character names, "imagePrompt" (English).
Respond ONLY with JSON, no markdown fences:
{"title":"中文剧名","en":"English Title","genre":"题材(2-4字)","difficulty":2,"minutes":25,"logline":"一句话简介(≤40字)","world":"背景设定(≤80字)","relationship":"两人关系与此刻为何非谈不可(≤40字)","acts":[{"t":"第一幕 · 二字副标","d":"第一幕完整说明(≤50字)"},{"t":"第二幕 · 二字副标","teaser":"悬念一句(≤20字)"},{"t":"第三幕 · 二字副标","teaser":"悬念一句(≤20字)"}],"hook":"开场钩子:由谁以什么方式开场(≤30字)","imagePrompt":"one-sentence English scene image prompt","roles":{"A":{"name":"英文男名","gender":"男","title":"身份(≤8字)","persona":"男性，性格(≤25字)","stance":"立场(≤30字)","tasks":{"main":{"goal":"主任务(≤40字)","judge":"判定标准(≤25字)"},"bonus":{"goal":"彩蛋任务(≤30字)"}}},"B":{"name":"英文女名","gender":"女","title":"身份(≤8字)","persona":"女性，性格(≤25字)","stance":"立场(≤30字)","tasks":{"main":{"goal":"","judge":""},"bonus":{"goal":""}}}}}`;
}

function buildLangPrompt(core, goals) {
  return `You are an English curriculum designer for Chinese B1-B2 learners preparing a roleplay.

SCENARIO: ${core.en} — ${core.world}
ROLE A: ${core.roles.A.name}, ${core.roles.A.stance}
ROLE B: ${core.roles.B.name}, ${core.roles.B.stance}
LANGUAGE GOALS: ${goals.join(", ") || "general conversation"}

Build two genuinely different role-based prep packs. Requirements:
- p0shared: 5 must-use expressions both roles need in THIS scenario; short, natural, high-frequency.
- roleP0: 2 role-specific must-use expressions each, tied to their stance.
- rolePrep: create separate A and B packs. Each has p1 (3 upgrade pairs), p2 (3 idiomatic collocations/softeners), p3 (2 advanced lines), and quiz (3 speak-first self-tests). Every item must serve THAT role's private goal, strategy, and likely lines — do not mirror the other role's pack.
- "from" must be the typical direct-translation Chinglish a B1 speaker would actually say in that role's situation; "to" is the natural native version.
- Each quiz "situation" is in Chinese and role-specific; "reference" is the model answer; "tip" is one Chinese line on why it works.
All "zh"/"situation"/"tip" in Chinese; expressions in English.
Respond ONLY with JSON, no markdown fences:
{"p0shared":[{"en":"","zh":""}],"roleP0":{"A":[{"en":"","zh":""}],"B":[{"en":"","zh":""}]},"rolePrep":{"A":{"p1":[{"from":"","to":"","zh":""}],"p2":[{"en":"","zh":""}],"p3":[{"en":"","zh":""}],"quiz":[{"situation":"","reference":"","tip":""}]},"B":{"p1":[{"from":"","to":"","zh":""}],"p2":[{"en":"","zh":""}],"p3":[{"en":"","zh":""}],"quiz":[{"situation":"","reference":"","tip":""}]}}}`;
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
    minutes: core.minutes || 25,
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
    rolePrep: lang.rolePrep || null,
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
