
import React, { useEffect, useMemo, useState } from "react";

type Phase = "setup" | "reading" | "self" | "discussion" | "summary" | "debrief";
const sec = (m: number) => m * 60;
const fmt = (t: number) => {
  const m = Math.floor(t / 60).toString().padStart(2, "0");
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};
const defaultParticipants = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `同学${i + 1}`, id: i + 1 }));

const CASES = [
  {
    id: "glasses_online_offline",
    title: "眼镜公司：线上 vs 线下（太阳镜为主推）",
    prompt: "你所在的眼镜公司准备在夏季主推时尚太阳镜。请在【线上 vs 线下】中选择主渠道并论证分配比例（例如 80:20），给出投放节奏与KPI（CTR、CVR、ROI），以及线下试戴/合作门店的方案。",
    data: "给定数据：售价1500元，进货成本500元，预计销量3500件；大促到手价建议1399/1299两档。站内抽佣约10%，退换率2%–5%。目标：整体ROI≥3，CTR≥3%，CVR≥5%。",
    deliverables: [
      "一句话结论：线上为主、线下辅助（建议80:20）",
      "理由：触达速度、成本可控、内容转化；线下用于试戴背书",
      "价格与预算：按GMV的8%–10%投放，明确到手价与利润边界",
      "KPI：CTR/CVR/ROI目标",
      "周度节奏：素材→种草→承接→复盘",
    ],
  },
  {
    id: "selection_roi",
    title: "选品对比：机械表/太阳镜/智能眼镜",
    prompt: "在三类目中选一个作为主推，并用数据说明理由（利润、占用资金、ROI、风险）。",
    data: "题面参数：机械表：销量1200、售价5000、利润率40%、进货2000；太阳镜：销量3500、售价1500、利润率50%、进货500；智能眼镜：销量800、售价3000、利润率30%、进货1000。",
    deliverables: [
      "计算总利润、占用资金、ROI",
      "下结论并说明为什么不是另两个",
      "提出简要营销打法（人-货-场-钱）",
    ],
  },
  {
    id: "campaign_618",
    title: "618活动：价格阶梯与预算分配",
    prompt: "为夏季太阳镜制定618活动方案：给出价格阶梯、套装/加价购、预算分配（站内/站外/私域）、达人策略与KPI。",
    data: "到手价建议1399/1299；预算可按GMV的8%–10%投入；达人以中腰部为主+垂类KOL测试。目标ROI≥3。",
    deliverables: [
      "价格与权益组合",
      "渠道预算比例",
      "达人与内容方向",
      "KPI与复盘方法",
    ],
  },
] as const;
type CaseId = typeof CASES[number]["id"];

const GLOSSARY = [
  { term: "GMV", def: "成交总额：一段时间内的下单金额，总览生意规模。GMV = 单价 × 件数。" },
  { term: "CTR", def: "点击率：点击 ÷ 展示。用户看见后有多少人点进来。" },
  { term: "CVR", def: "转化率：成交 ÷ 点击。点进来后有多少人下单。" },
  { term: "ROI", def: "投产比：产出 ÷ 投入。可用GMV或利润口径，需注明。" },
  { term: "占用资金", def: "压在库存上的钱：预计销量 × 进货成本。" },
  { term: "资源坑位", def: "平台/渠道的固定展示位置与时段，可能需坑位费或抽佣。" },
  { term: "私域", def: "品牌可反复触达的用户池，如企业微信/社群/会员。" },
];

const ONE_MIN_SCRIPT = `我建议以【线上为主、线下辅助（80:20）】推进太阳镜。三点理由：第一，线上触达快、可按效果付费，目标CTR≥3%、CVR≥5%、整体ROI≥3；第二，线下主要承担试戴与背书，降低退换；第三，价格上标1500，大促到手1399/1299，预算按GMV的8%–10%投放。执行上，抖音/小红书种草，天猫/京东/自营承接转化，老客私域复购。`;

export default function App() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [selectedCaseId, setSelectedCaseId] = useState<CaseId>("glasses_online_offline");
  const [participants, setParticipants] = useState(defaultParticipants(6));
  const [readingSec, setReadingSec] = useState(sec(3));
  const [selfSec, setSelfSec] = useState(sec(6));
  const [discussionSec, setDiscussionSec] = useState(sec(20));
  const [summarySec, setSummarySec] = useState(sec(4));
  const [timeLeft, setTimeLeft] = useState(readingSec);
  const [running, setRunning] = useState(false);
  const [order, setOrder] = useState<number[]>([]);
  const [speakerIdx, setSpeakerIdx] = useState(0);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<string>("");

  type ScoreKey = "逻辑" | "数据" | "协作" | "引导" | "商业";
  const KEYS: ScoreKey[] = ["逻辑", "数据", "协作", "引导", "商业"];
  const [scores, setScores] = useState<Record<number, Record<ScoreKey, number>>>({});

  const currentCase = useMemo(() => CASES.find((c) => c.id === selectedCaseId)!, [selectedCaseId]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          nextPhase();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  useEffect(() => {
    if (phase === "reading") setTimeLeft(readingSec);
    if (phase === "self") setTimeLeft(selfSec);
    if (phase === "discussion") setTimeLeft(discussionSec);
    if (phase === "summary") setTimeLeft(summarySec);
  }, [phase, readingSec, selfSec, discussionSec, summarySec]);

  const start = () => {
    const ids = participants.map((p) => p.id);
    const shuffled = ids.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    setOrder(shuffled);
    setSpeakerIdx(0);
    assignRoles();
    setPhase("reading");
    setRunning(true);
  };

  const nextPhase = () => {
    setRunning(false);
    setTimeout(() => {
      setRunning(true);
      setTimeLeft(0);
    }, 50);
    setPhase((p) => {
      if (p === "reading") return "self";
      if (p === "self") return "discussion";
      if (p === "discussion") return "summary";
      if (p === "summary") return "debrief";
      return "debrief";
    });
  };

  const reset = () => {
    setPhase("setup");
    setRunning(false);
    setTimeLeft(readingSec);
    setOrder([]);
    setSpeakerIdx(0);
    setRoles({});
    setNotes("");
    setScores({});
  };

  const assignRoles = () => {
    const roleList = ["主持/Leader", "计时/Timekeeper", "记录/Scribe", "质疑/Devil's Advocate"];
    const shuffled = [...participants].map((p) => ({ ...p, r: Math.random() })).sort((a, b) => a.r - b.r);
    const m: Record<string, string> = {};
    shuffled.forEach((p, i) => (m[p.name] = roleList[i] || "成员"));
    setRoles(m);
  };

  const averageScore = (pid: number) => {
    const s = scores[pid] || ({} as Record<ScoreKey, number>);
    const vals = KEYS.map((k) => s[k] || 0).filter((x) => x > 0);
    if (!vals.length) return 0;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <div className="text-2xl">👥</div>
          <h1 className="text-2xl font-bold">群面模拟器｜电商运营（线上 vs 线下 & 选品ROI）</h1>
        </header>

        {phase === "setup" && (
          <SetupPanel
            participants={participants}
            setParticipants={setParticipants}
            selectedCaseId={selectedCaseId}
            setSelectedCaseId={setSelectedCaseId}
            readingSec={readingSec}
            setReadingSec={setReadingSec}
            selfSec={selfSec}
            setSelfSec={setSelfSec}
            discussionSec={discussionSec}
            setDiscussionSec={setDiscussionSec}
            summarySec={summarySec}
            setSummarySec={setSummarySec}
            start={start}
            assignRoles={assignRoles}
          />
        )}

        {phase !== "setup" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CaseCard currentCase={currentCase} />
              <TimerCard
                phase={phase}
                timeLeft={timeLeft}
                setTimeLeft={setTimeLeft}
                running={running}
                setRunning={setRunning}
                nextPhase={nextPhase}
                reset={reset}
              />
              <OrderCard
                order={order}
                participants={participants}
                speakerIdx={speakerIdx}
                setSpeakerIdx={setSpeakerIdx}
                phase={phase}
              />
              <RolesCard roles={roles} />
              <NotesCard notes={notes} setNotes={setNotes} />
              <ScriptCard />
              <GlossaryCard />
            </div>
            <div className="space-y-6">
              <ScoringCard
                participants={participants}
                scores={scores}
                setScores={setScores}
              />
              <div className="bg-neutral-800 rounded-2xl p-4 shadow">
                <button
                  onClick={() => {
                    const data = {
                      case: currentCase.title,
                      phase,
                      participants: participants.map((p) => ({
                        name: p.name,
                        role: roles[p.name] || "成员",
                        avg: averageScore(p.id),
                        scores: scores[p.id] || {},
                      })),
                      notes,
                      speakingOrder: order.map((id) => participants.find((p) => p.id === id)?.name),
                    };
                    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                    alert("已复制汇总到剪贴板！");
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-neutral-100 text-neutral-900 hover:bg-white transition"
                >
                  📋 复制汇总到剪贴板
                </button>
                <p className="text-neutral-300 text-sm mt-2">包含案例、角色、发言顺序、评分与你的笔记。</p>
              </div>
            </div>
          </div>
        )}

        {phase === "debrief" && (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-900/30 border border-emerald-700/40">
            <p className="text-emerald-200">✅ 已进入复盘：请根据评分与KPI达成度总结3点可改进项。</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SetupPanel({
  participants,
  setParticipants,
  selectedCaseId,
  setSelectedCaseId,
  readingSec,
  setReadingSec,
  selfSec,
  setSelfSec,
  discussionSec,
  setDiscussionSec,
  summarySec,
  setSummarySec,
  start,
  assignRoles,
}: any) {
  const [count, setCount] = useState(participants.length);
  useEffect(() => {
    setParticipants(defaultParticipants(count));
  }, [count]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-neutral-800 rounded-2xl p-5 shadow">
        <h2 className="text-lg font-semibold mb-3">📝 选择案例 & 参会信息</h2>
        <label className="block text-sm text-neutral-300 mb-2">案例</label>
        <select
          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 focus:outline-none"
          value={selectedCaseId}
          onChange={(e) => setSelectedCaseId(e.target.value as any)}
        >
          {CASES.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-neutral-900 rounded-xl p-3">
            <label className="text-sm text-neutral-300">人数</label>
            <div className="flex items-center gap-3 mt-2">
              <button className="p-2 bg-neutral-800 rounded-lg" onClick={() => setCount((v: number) => Math.max(3, v - 1))}>➖</button>
              <span className="text-xl font-semibold">{count}</span>
              <button className="p-2 bg-neutral-800 rounded-lg" onClick={() => setCount((v: number) => Math.min(12, v + 1))}>➕</button>
            </div>
          </div>
          <div className="bg-neutral-900 rounded-xl p-3">
            <label className="text-sm text-neutral-300">随机分配角色</label>
            <button onClick={assignRoles} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 text-neutral-900">🎲 随机</button>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-neutral-300 mb-2 block">成员名单（可改名）</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {participants.map((p: any, idx: number) => (
              <input
                key={p.id}
                value={p.name}
                onChange={(e) => {
                  const arr = [...participants];
                  arr[idx] = { ...arr[idx], name: e.target.value };
                  setParticipants(arr);
                }}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 focus:outline-none"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-neutral-800 rounded-2xl p-5 shadow">
        <h2 className="text-lg font-semibold mb-3">⏱️ 时间设置</h2>
        <TimeRow label="看题/阅读" value={readingSec} setValue={setReadingSec} />
        <TimeRow label="个人陈述" value={selfSec} setValue={setSelfSec} />
        <TimeRow label="自由讨论" value={discussionSec} setValue={setDiscussionSec} />
        <TimeRow label="总结陈述" value={summarySec} setValue={setSummarySec} />

        <button onClick={start} className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-400 text-neutral-900 font-semibold hover:bg-emerald-300 transition">
          ▶️ 开始模拟
        </button>
        <p className="text-neutral-300 text-sm mt-2">默认流程：看题→个人陈述→自由讨论→总结→复盘</p>
      </div>
    </div>
  );
}

function TimeRow({ label, value, setValue }: any) {
  const mins = Math.max(1, Math.round(value / 60));
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-neutral-700/60 last:border-0">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button className="p-2 bg-neutral-900 rounded-lg" onClick={() => setValue(sec(Math.max(1, mins - 1)))}>➖</button>
        <span className="w-12 text-center">{mins} 分</span>
        <button className="p-2 bg-neutral-900 rounded-lg" onClick={() => setValue(sec(Math.min(60, mins + 1)))}>➕</button>
      </div>
    </div>
  );
}

function CaseCard({ currentCase }: any) {
  return (
    <div className="bg-neutral-800 rounded-2xl p-5 shadow">
      <h2 className="text-lg font-semibold">📦 案例：{currentCase.title}</h2>
      <p className="text-neutral-200 mt-2">{currentCase.prompt}</p>
      <div className="mt-3 p-3 rounded-xl bg-neutral-900 border border-neutral-700">
        <p className="text-neutral-300 text-sm">{currentCase.data}</p>
      </div>
      <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-neutral-300">
        {currentCase.deliverables.map((d: string, i: number) => (
          <li key={i} className="flex items-start gap-2">✅ {d}</li>
        ))}
      </ul>
    </div>
  );
}

function TimerCard({ phase, timeLeft, setTimeLeft, running, setRunning, nextPhase, reset }: any) {
  const phaseName: Record<Phase, string> = {
    setup: "准备",
    reading: "看题/阅读",
    self: "个人陈述",
    discussion: "自由讨论",
    summary: "总结陈述",
    debrief: "复盘/结束",
  };
  return (
    <div className="bg-neutral-800 rounded-2xl p-5 shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">⏱️ {phaseName[phase]}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setRunning((v: boolean) => !v)} className="px-3 py-2 rounded-lg bg-neutral-100 text-neutral-900">{running ? "暂停" : "开始"}</button>
          <button onClick={nextPhase} className="px-3 py-2 rounded-lg bg-neutral-900 text-neutral-100 border border-neutral-700">下一阶段</button>
          <button onClick={reset} className="px-3 py-2 rounded-lg bg-neutral-900 text-neutral-100 border border-neutral-700">重置</button>
        </div>
      </div>
      <div className="text-6xl font-bold tracking-widest text-center mt-4">
        {fmt(timeLeft)}
      </div>
      <div className="text-center text-neutral-400 mt-2 text-sm">时间到将自动进入下一阶段</div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => setTimeLeft((t: number) => t + 60)} className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700">+1分</button>
        <button onClick={() => setTimeLeft((t: number) => Math.max(0, t - 60))} className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700">-1分</button>
      </div>
    </div>
  );
}

function OrderCard({ order, participants, speakerIdx, setSpeakerIdx, phase }: any) {
  const getName = (id: number) => participants.find((p: any) => p.id === id)?.name || "";
  return (
    <div className="bg-neutral-800 rounded-2xl p-5 shadow">
      <h2 className="text-lg font-semibold mb-2">👑 发言顺序</h2>
      {order.length === 0 ? (
        <p className="text-neutral-300 text-sm">开始后将自动生成发言顺序。</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {order.map((id: number, i: number) => (
            <span key={id} className={`px-3 py-1 rounded-full text-sm border ${i === speakerIdx ? "bg-emerald-400 text-neutral-900 border-emerald-300" : "bg-neutral-900 border-neutral-700"}`}>
              {i + 1}. {getName(id)}
            </span>
          ))}
        </div>
      )}
      {order.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => setSpeakerIdx((i: number) => Math.max(0, i - 1))} className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700">上一个</button>
          <button onClick={() => setSpeakerIdx((i: number) => Math.min(order.length - 1, i + 1))} className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700">下一个</button>
          {phase === "self" && <p className="text-neutral-400 text-sm">提示：个人陈述阶段按顺序依次发言。</p>}
        </div>
      )}
    </div>
  );
}

function RolesCard({ roles }: any) {
  const entries = Object.entries(roles);
  if (!entries.length) return (
    <div className="bg-neutral-800 rounded-2xl p-5 shadow"><h2 className="text-lg font-semibold">🎭 角色</h2><p className="text-neutral-300 text-sm mt-1">点击“随机”分配主持、计时、记录、质疑等角色。</p></div>
  );
  return (
    <div className="bg-neutral-800 rounded-2xl p-5 shadow">
      <h2 className="text-lg font-semibold mb-2">🎭 角色分配</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {entries.map(([name, role]) => (
          <div key={name} className="bg-neutral-900 rounded-xl px-3 py-2 border border-neutral-700 text-sm flex items-center justify-between"><span>{name}</span><span className="text-neutral-400">{role}</span></div>
        ))}
      </div>
    </div>
  );
}

function NotesCard({ notes, setNotes }: any) {
  return (
    <div className="bg-neutral-800 rounded-2xl p-5 shadow">
      <h2 className="text-lg font-semibold mb-2">📋 便签/要点</h2>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="记录亮点、反问、待定问题或下一步行动点…"
        className="w-full min-h-[120px] bg-neutral-900 border border-neutral-700 rounded-xl p-3 focus:outline-none"
      />
      <p className="text-neutral-400 text-xs mt-2">建议在总结前整理出：结论、2–3个数据点、落地动作与KPI。</p>
    </div>
  );
}

function ScoringCard({ participants, scores, setScores }: any) {
  const KEYS: Array<"逻辑" | "数据" | "协作" | "引导" | "商业"> = ["逻辑", "数据", "协作", "引导", "商业"];
  const set = (pid: number, key: string, val: number) => {
    setScores((prev: any) => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), [key]: val },
    }));
  };
  const avg = (pid: number) => {
    const obj = scores[pid] || {};
    const vals = KEYS.map((k) => obj[k] || 0).filter((x: number) => x > 0);
    if (!vals.length) return 0;
    return (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1);
  };
  return (
    <div className="bg-neutral-800 rounded-2xl p-5 shadow">
      <h2 className="text-lg font-semibold mb-2">⭐ 评分（1-5分）</h2>
      <div className="space-y-3 max-h-[540px] overflow-auto pr-1">
        {participants.map((p: any) => (
          <div key={p.id} className="bg-neutral-900 rounded-xl p-3 border border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{p.name}</span>
              <span className="text-neutral-400 text-sm">平均：{avg(p.id)}</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {KEYS.map((k) => (
                <div key={k} className="text-xs">
                  <div className="text-neutral-400 mb-1">{k}</div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => set(p.id, k, n)}
                        className={`w-8 h-8 rounded-lg border ${scores?.[p.id]?.[k] === n ? "bg-emerald-400 text-neutral-900 border-emerald-300" : "bg-neutral-800 border-neutral-700"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-neutral-400 text-xs mt-2">评分维度：逻辑结构、数据敏感度、协作推进、引导能力、商业判断。</p>
    </div>
  );
}

function GlossaryCard() {
  return (
    <div className="bg-neutral-800 rounded-2xl p-5 shadow">
      <h2 className="text-lg font-semibold mb-2">📚 术语小抄</h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        {GLOSSARY.map((g) => (
          <li key={g.term} className="bg-neutral-900 rounded-xl p-3 border border-neutral-700">
            <div className="font-medium">{g.term}</div>
            <div className="text-neutral-300">{g.def}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScriptCard() {
  return (
    <div className="bg-neutral-800 rounded-2xl p-5 shadow">
      <h2 className="text-lg font-semibold mb-2">🗣️ 1分钟口径（可直接复述）</h2>
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-sm whitespace-pre-wrap leading-relaxed">
        {ONE_MIN_SCRIPT}
      </div>
      <p className="text-neutral-400 text-xs mt-2">提示：总结时请做到“结论先行 + 2–3个关键数字 + 落地动作”。</p>
    </div>
  );
}
