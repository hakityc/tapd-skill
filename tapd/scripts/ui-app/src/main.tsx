import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Command,
  Copy,
  Cpu,
  ExternalLink,
  GitBranch,
  Layers3,
  LockKeyhole,
  Network,
  PlugZap,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import "./styles.css";

type Host = "codex" | "claude" | "cursor";
type Capability = { id: string; write: boolean };
type Connector = { id: string; node: number; capabilities: Capability[] };
type Connection = {
  name: string;
  connector: string;
  host: Host;
  server: string;
  transport: "stdio" | "streamable-http";
  endpoint?: string;
  state: "pending-host-reload" | "configured";
  allowWrites: boolean;
  capabilities: Capability[];
};
type Skill = { id: string; roots: string[] };
type Overview = {
  node: string;
  cli: string;
  skillDirectory: string;
  connectors: Connector[];
  connections: Connection[];
  skills: Skill[];
  hosts: Array<{ id: Host; connections: number }>;
};
type Sheet = { kind: "connect" } | { kind: "skill" } | { kind: "connection"; connection: Connection } | null;

const hostNames: Record<Host, string> = {
  codex: "Codex",
  claude: "Claude Code",
  cursor: "Cursor",
};
const hostIcons: Record<Host, LucideIcon> = {
  codex: Sparkles,
  claude: Bot,
  cursor: Command,
};

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function copy(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function Tag({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "mint" | "amber" }) {
  const colors = {
    slate: "border-white/10 bg-white/5 text-slate-300",
    mint: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] ${colors[tone]}`}>{children}</span>;
}

function Metric({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string | number; hint: string }) {
  return (
    <article className="deck-card p-4 sm:p-5">
      <div className="flex items-center justify-between text-slate-400"><span className="text-[10px] font-bold tracking-[0.16em]">{label}</span><Icon size={16} /></div>
      <strong className="mt-5 block font-display text-4xl tracking-[-0.07em] text-white">{value}</strong>
      <p className="mt-2 text-xs text-slate-400">{hint}</p>
    </article>
  );
}

function ConnectionCard({ connection, onSelect }: { connection: Connection; onSelect: () => void }) {
  const pending = connection.state === "pending-host-reload";
  return (
    <motion.button
      layout
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3 text-left transition hover:border-emerald-200/25 hover:bg-emerald-100/[0.045]"
    >
      <span className={`h-10 w-1 rounded-full ${pending ? "bg-amber-300" : "bg-emerald-300"}`} />
      <span className="min-w-0">
        <span className="flex items-center gap-2"><strong className="truncate text-sm text-white">{connection.name}</strong><ChevronRight className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-200" size={15} /></span>
        <span className="mt-1 block truncate text-xs text-slate-400">{connection.connector} · {hostNames[connection.host]} · {connection.transport}{connection.endpoint ? ` · ${connection.endpoint}` : ""}</span>
      </span>
      <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">
        <Tag tone={connection.allowWrites ? "mint" : "slate"}>{connection.allowWrites ? "工具可写" : "只读"}</Tag>
        <Tag tone={pending ? "amber" : "mint"}>{pending ? "待重载" : "已配置"}</Tag>
      </span>
    </motion.button>
  );
}

function BridgeDeck({ overview, onConnect, onOpenConnection }: { overview: Overview; onConnect: () => void; onOpenConnection: (connection: Connection) => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <section className="deck-card bridge-deck relative overflow-hidden p-4 sm:p-6">
      <div className="bridge-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative flex items-center justify-between gap-5"><div><p className="eyebrow">Connection graph</p><h2 className="mt-2 font-display text-2xl tracking-[-0.055em] text-white">连接拓扑</h2></div><Tag tone="mint">本机连接边界</Tag></div>
      <div className="relative mt-7 grid gap-4 lg:grid-cols-[minmax(180px,.8fr)_minmax(280px,1.35fr)_minmax(190px,.85fr)]">
        <RouteColumn title="Agent hosts">
          {overview.hosts.map((host) => {
            const Icon = hostIcons[host.id];
            return <RouteNode key={host.id} icon={Icon} title={hostNames[host.id]} detail={host.connections ? `${host.connections} 个 WorkBridge MCP` : "尚未绑定"} state={host.connections ? "live" : "idle"} />;
          })}
        </RouteColumn>
        <RouteColumn title="MCP connections" center>
          {overview.connections.length ? overview.connections.map((connection, index) => <RouteNode key={connection.name} icon={PlugZap} title={connection.name} detail={`${connection.connector} · ${connection.transport}`} state={connection.state === "configured" ? "live" : "wait"} delay={reduceMotion ? 0 : index * 0.05} onClick={() => onOpenConnection(connection)} />) : <button onClick={onConnect} className="route-node route-node-button"><span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-200/12 text-amber-200"><Plus size={16} /></span><span><strong>连接第一个 MCP</strong><small>让 Agent 发现它需要的能力</small></span></button>}
        </RouteColumn>
        <RouteColumn title="Skills">
          <RouteNode icon={Layers3} title="workbridge" detail={overview.skills.some((skill) => skill.id === "workbridge") ? "已被 Agent 发现" : "等待安装"} state={overview.skills.some((skill) => skill.id === "workbridge") ? "live" : "wait"} />
          <RouteNode icon={GitBranch} title="业务流程" detail="选择能力 → 计划 → 回读" state="idle" />
        </RouteColumn>
      </div>
    </section>
  );
}

function RouteColumn({ title, center, children }: { title: string; center?: boolean; children: React.ReactNode }) {
  return <div className={`relative z-10 flex flex-col gap-2 ${center ? "lg:justify-center" : ""}`}><p className="mb-1 text-[10px] font-bold tracking-[0.16em] text-slate-500">{title}</p>{children}</div>;
}

function RouteNode({ icon: Icon, title, detail, state, delay = 0, onClick }: { icon: LucideIcon; title: string; detail: string; state: "live" | "wait" | "idle"; delay?: number; onClick?: () => void }) {
  const content = <><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${state === "live" ? "bg-emerald-200/12 text-emerald-200" : state === "wait" ? "bg-amber-200/12 text-amber-200" : "bg-white/7 text-slate-300"}`}><Icon size={16} /></span><span className="min-w-0"><strong className="block truncate text-sm font-semibold text-white">{title}</strong><small className="block truncate text-[11px] text-slate-400">{detail}</small></span><i className={`ml-auto h-2 w-2 rounded-full ${state === "live" ? "bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,.08)]" : state === "wait" ? "bg-amber-300" : "bg-slate-600"}`} /></>;
  const common = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.28 } };
  return onClick ? <motion.button {...common} onClick={onClick} className="route-node route-node-button">{content}</motion.button> : <motion.div {...common} className="route-node">{content}</motion.div>;
}

function CommandBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="relative mt-5 rounded-xl border border-cyan-100/15 bg-[#06141c] p-3 pr-14 font-mono text-[11px] leading-5 text-cyan-50 break-all"><button onClick={async () => { await copy(value); setCopied(true); window.setTimeout(() => setCopied(false), 1200); }} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-emerald-200 px-2 py-1 text-[10px] font-bold text-emerald-950">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "已复制" : "复制"}</button>{value}</div>;
}

function SheetFrame({ title, caption, onClose, children }: { title: string; caption: string; onClose: () => void; children: React.ReactNode }) {
  return <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 34 }} className="fixed inset-y-0 right-0 z-30 w-full max-w-[490px] overflow-y-auto border-l border-white/10 bg-[#0b202b] p-6 shadow-[-24px_0_60px_rgba(0,0,0,.42)] sm:p-8" role="dialog" aria-modal="true" aria-label={title}>
    <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{caption}</p><h2 className="mt-2 font-display text-3xl tracking-[-0.07em] text-white">{title}</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/7" aria-label="关闭"><X size={17} /></button></div>
    {children}
  </motion.aside>;
}

function ConnectSheet({ overview, onClose }: { overview: Overview; onClose: () => void }) {
  const [provider, setProvider] = useState(overview.connectors[0]?.id || "tapd");
  const [host, setHost] = useState<Host>("codex");
  const [name, setName] = useState(`${overview.connectors[0]?.id || "tapd"}-work`);
  const [site, setSite] = useState("");
  const command = `${quote(overview.node)} ${quote(overview.cli)} connect ${provider} --host ${host} --connection ${quote(name || "<name>")}${provider === "discourse" && site ? ` --site ${quote(site)}` : ""}`;
  return <SheetFrame title="连接 MCP" caption="Safe local setup" onClose={onClose}>
    <p className="mt-6 text-sm leading-6 text-slate-400">在这里选择目标并生成命令。CLI 会完成依赖检查、隐藏输入、宿主配置和回读；浏览器不处理 token。</p>
    <Field label="连接器"><select value={provider} onChange={(event) => { const next = event.target.value; setProvider(next); setName(`${next}-work`); }}><>{overview.connectors.map((connector) => <option key={connector.id} value={connector.id}>{connector.id}</option>)}</></select></Field>
    <Field label="Agent 宿主"><select value={host} onChange={(event) => setHost(event.target.value as Host)}>{(Object.keys(hostNames) as Host[]).map((item) => <option key={item} value={item}>{hostNames[item]}</option>)}</select></Field>
    <Field label="连接名"><input value={name} onChange={(event) => setName(event.target.value)} pattern="[a-z0-9._-]+" /></Field>
    {provider === "discourse" && <Field label="Discourse 站点（可留空，由终端询问）"><input value={site} onChange={(event) => setSite(event.target.value)} placeholder="https://forum.example.com" /></Field>}
    <CommandBlock value={command} />
    <Checklist items={["TAPD 在终端隐藏输入 token；Discourse 进入官方浏览器授权。", "命令完成后重启相应 Agent。", "由 Agent 做一次只读调用，才报告连接就绪。"]} />
  </SheetFrame>;
}

function ConnectionSheet({ overview, connection, onClose }: { overview: Overview; connection: Connection; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [auth, setAuth] = useState("oauth");
  const [bearerEnv, setBearerEnv] = useState("");
  const command = `${quote(overview.node)} ${quote(overview.cli)} connection configure ${quote(connection.name)} --transport streamable-http --url ${quote(url || "https://mcp.example.com/mcp")} --auth ${auth}${auth === "bearer-env" && bearerEnv ? ` --bearer-env ${quote(bearerEnv)}` : ""}`;
  return <SheetFrame title={connection.name} caption="Connection details" onClose={onClose}>
    <div className="mt-6 flex flex-wrap gap-2"><Tag tone={connection.allowWrites ? "mint" : "slate"}>{connection.allowWrites ? "可写工具已注册" : "只读"}</Tag><Tag tone={connection.state === "configured" ? "mint" : "amber"}>{connection.state === "configured" ? "已配置" : "等待宿主重载"}</Tag></div>
    <h3 className="mt-8 text-sm font-semibold text-white">绑定能力</h3><div className="mt-3 flex flex-wrap gap-2">{connection.capabilities.map((capability) => <Tag key={capability.id} tone={capability.write ? "mint" : "slate"}>{capability.id}</Tag>)}</div>
    <div className="my-8 h-px bg-white/10" />
    <p className="eyebrow">Remote MCP</p><p className="mt-2 text-sm text-slate-400">切换传输不改变资源引用；CLI 会先探测新服务，再修改宿主配置。</p>
    <Field label="Streamable HTTP 地址"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://mcp.example.com/mcp" /></Field>
    <Field label="认证"><select value={auth} onChange={(event) => setAuth(event.target.value)}><option value="oauth">OAuth（推荐）</option><option value="none">无认证</option>{connection.host === "codex" && <option value="bearer-env">Codex 环境变量</option>}</select></Field>
    {auth === "bearer-env" && <Field label="环境变量名"><input value={bearerEnv} onChange={(event) => setBearerEnv(event.target.value)} placeholder="MCP_TOKEN" /></Field>}
    <CommandBlock value={command} />
  </SheetFrame>;
}

function SkillSheet({ overview, onClose }: { overview: Overview; onClose: () => void }) {
  const command = `mkdir -p "$HOME/.agents/skills" && ln -s ${quote(overview.skillDirectory)} "$HOME/.agents/skills/workbridge"`;
  return <SheetFrame title="安装 WorkBridge Skill" caption="Skill discovery" onClose={onClose}>
    <p className="mt-6 text-sm leading-6 text-slate-400">这条命令只创建本地符号链接。目标已存在时会失败，不覆盖已有 Skill。</p><CommandBlock value={command} /><Checklist items={["重启或 reload Agent。", "Agent 在下一轮读取 workbridge/SKILL.md。", "Skill 约束流程，平台权限仍归宿主和 MCP。"]} />
  </SheetFrame>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mt-5 block text-xs font-medium text-slate-400"><span>{label}</span><span className="mt-2 block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-white/10 [&_input]:bg-[#06151e] [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_input]:text-white [&_input]:outline-none [&_input:focus]:border-emerald-200/50 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-white/10 [&_select]:bg-[#06151e] [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_select]:text-white [&_select]:outline-none [&_select:focus]:border-emerald-200/50">{children}</span></label>;
}

function Checklist({ items }: { items: string[] }) {
  return <ul className="mt-6 grid gap-3 text-sm text-slate-400">{items.map((item) => <li key={item} className="flex gap-3"><ArrowRight size={15} className="mt-1 shrink-0 text-cyan-200" />{item}</li>)}</ul>;
}

function App() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState<"overview" | "connections" | "skills">("overview");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [skillQuery, setSkillQuery] = useState("");
  const reduceMotion = useReducedMotion();
  const load = async () => {
    setError("");
    try {
      const response = await fetch("/api/overview", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to read local status");
      setOverview(await response.json() as Overview);
    } catch {
      setError("无法读取本地 WorkBridge 状态。请确认控制台由 WorkBridge CLI 启动。");
    }
  };
  useEffect(() => { void load(); }, []);
  const skills = useMemo(() => overview?.skills.filter((skill) => skill.id.toLowerCase().includes(skillQuery.trim().toLowerCase())) || [], [overview, skillQuery]);
  if (!overview) return <div className="workbench-loading"><RefreshCw className={error ? "text-rose-500" : "animate-spin"} size={17} /><span>{error || "正在读取本地连接状态…"}</span></div>;
  const navigation = [{ id: "overview" as const, label: "概览", icon: Network }, { id: "connections" as const, label: "连接", icon: PlugZap }, { id: "skills" as const, label: "Skills", icon: Layers3 }];
  const connectionList = <div className="connection-list">{overview.connections.length ? overview.connections.map((connection) => <ConnectionCard key={connection.name} connection={connection} onSelect={() => setSheet({ kind: "connection", connection })} />) : <EmptyState icon={PlugZap} title="还没有连接" copy="先连接当前任务实际需要的服务。连接后，重启 Agent 并用一次只读操作确认。" action="新建连接" onAction={() => setSheet({ kind: "connect" })} />}</div>;
  const skillList = <div className="skill-list"><label className="skill-search"><Search size={15} /><input value={skillQuery} onChange={(event) => setSkillQuery(event.target.value)} placeholder="筛选 Skills" /></label><div>{skills.slice(0, 16).map((skill) => <div key={skill.id} className="skill-row"><code>{skill.id}</code><span>{skill.roots.join(" · ")}</span></div>)}{skills.length > 16 && <p className="more-skills">另有 {skills.length - 16} 个匹配项</p>}{!skills.length && <p className="more-skills">没有匹配的 Skill。</p>}</div></div>;
  return <div className="workbench">
    <aside className="workbench-sidebar">
      <div className="brand"><span className="bridge-mark"><span /></span><div><strong>WorkBridge</strong><p>LOCAL CONNECTIONS</p></div></div>
      <nav>{navigation.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setActive(item.id)} className={active === item.id ? "active" : ""}><Icon size={16} />{item.label}</button>; })}</nav>
      <div className="sidebar-note"><LockKeyhole size={14} /><p>凭据只由本地 CLI 读取。此页面不接收 token。</p></div>
    </aside>
    <main className="workbench-main">
      <header><div><p className="eyebrow">LOCAL WORKSPACE</p><h1>{active === "skills" ? "Skills" : "连接"}</h1></div><div className="header-actions"><button onClick={() => void load()} aria-label="刷新状态"><RefreshCw size={16} /></button>{active !== "skills" && <button className="primary" onClick={() => setSheet({ kind: "connect" })}><Plus size={16} />新建连接</button>}</div></header>
      {active === "overview" && <><section className="workbench-section"><SectionHeading title="当前连接" copy={overview.connections.length ? `${overview.connections.length} 个已登记` : "尚未登记"} />{connectionList}</section><section className="workbench-section"><SectionHeading title="可连接的服务" copy="选择服务后在终端完成认证" /><div className="connector-grid">{overview.connectors.map((connector) => <button key={connector.id} onClick={() => setSheet({ kind: "connect" })} className="connector-choice"><span>{connector.id.slice(0, 1).toUpperCase()}</span><div><strong>{connector.id}</strong><p>{connector.capabilities.map((capability) => capability.id).join(" · ")}</p></div><ChevronRight size={16} /></button>)}</div></section><section className="workbench-section workflow-note"><ShieldCheck size={18} /><p><b>连接完成后</b>重启 Agent，再执行一次只读查询。CLI 与 Agent 都确认后，才把连接视为可用。</p></section></>}
      {active === "connections" && <section className="workbench-section"><SectionHeading title="MCP 连接" copy="点开查看传输与权限" />{connectionList}</section>}
      {active === "skills" && <section className="workbench-section"><SectionHeading title="已发现的 Skills" copy="本机可被 Agent 读取" action="安装 WorkBridge" onAction={() => setSheet({ kind: "skill" })} />{skillList}</section>}
    </main>
    <AnimatePresence>{sheet && <><motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(null)} className="fixed inset-0 z-20 cursor-default bg-black/25" aria-label="关闭侧栏" />{sheet.kind === "connect" ? <ConnectSheet overview={overview} onClose={() => setSheet(null)} /> : sheet.kind === "skill" ? <SkillSheet overview={overview} onClose={() => setSheet(null)} /> : <ConnectionSheet overview={overview} connection={sheet.connection} onClose={() => setSheet(null)} />}</>}</AnimatePresence>
  </div>;
}

function SectionHeading({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) {
  return <div className="section-heading"><div><h2>{title}</h2><p>{copy}</p></div>{action && <button onClick={onAction}><ExternalLink size={13} />{action}</button>}</div>;
}

function EmptyState({ icon: Icon, title, copy, action, onAction }: { icon: LucideIcon; title: string; copy: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span><Icon size={19} /></span><div><h3>{title}</h3><p>{copy}</p><button onClick={onAction}><Plus size={14} />{action}</button></div></div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
