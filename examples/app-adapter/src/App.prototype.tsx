import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import pawSyncLogo from "../resources/pawsync_white.png";
import { deviceApi, type DeviceSchedule, type DeviceStatus } from "./deviceApi";

type Screen =
  | "splash"
  | "login"
  | "signup"
  | "dashboard"
  | "schedule"
  | "monitor"
  | "history"
  | "notifications"
  | "profile";

type IconName =
  | "home"
  | "calendar"
  | "chart"
  | "history"
  | "user"
  | "bell"
  | "wifi"
  | "chip"
  | "sensor"
  | "bowl"
  | "plus"
  | "chevron"
  | "search"
  | "sliders"
  | "check"
  | "settings"
  | "pet"
  | "lock"
  | "mail"
  | "logout"
  | "trash"
  | "minus";

const petPhoto =
  "https://images.unsplash.com/photo-1693615775129-f2004d6e3e0b?crop=faces&cs=tinysrgb&fit=crop&fm=jpg&h=300&q=85&w=300";

const icons: Record<IconName, ReactNode> = {
  home: <><path d="M3 10.8 12 3l9 7.8v8.4a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 19.2Z" /><path d="M9 21v-7h6v7" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V2" /><path d="M2 19h20" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></>,
  wifi: <><path d="M4.8 9.8a11 11 0 0 1 14.4 0M7.8 13a6.4 6.4 0 0 1 8.4 0M10.6 16.3a2.2 2.2 0 0 1 2.8 0" /><circle cx="12" cy="19" r=".7" fill="currentColor" stroke="none" /></>,
  chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
  sensor: <><path d="M12 4v9M8.5 6.5a5 5 0 1 0 7 0M6 4a8 8 0 1 0 12 0" /><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" /></>,
  bowl: <><path d="M3 11h18l-2.2 7.2A2.5 2.5 0 0 1 16.4 20H7.6a2.5 2.5 0 0 1-2.4-1.8Z" /><path d="M8 7c0-1 1-2 2-2M13 7c0-1 1-2 2-2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  pet: <><circle cx="8" cy="8" r="2" /><circle cx="16" cy="8" r="2" /><circle cx="5" cy="13" r="2" /><circle cx="19" cy="13" r="2" /><path d="M8 18c0-3 2-5 4-5s4 2 4 5c0 2-1.8 3-4 3s-4-1-4-3Z" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
  logout: <><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M15 8l4 4-4 4M19 12H9" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
  minus: <path d="M5 12h14" />,
};

function Icon({ name, size = "medium" }: { name: IconName; size?: "small" | "medium" | "large" }) {
  return <svg className={`icon icon-${size}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

function BrandMark({ splash = false }: { splash?: boolean }) {
  return <div className={`brand-mark ${splash ? "splash-mark" : ""}`}>
    <img src={pawSyncLogo} alt="PawSync" />
  </div>;
}

function Tap({
  children,
  className = "",
  onTap,
  label,
}: {
  children: ReactNode;
  className?: string;
  onTap?: () => void;
  label?: string;
}) {
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === "Enter" || event.key === " ") && onTap) {
      event.preventDefault();
      onTap();
    }
  };
  return <div className={`tap ${className}`} role="button" tabIndex={0} onClick={onTap} onKeyDown={keyDown} aria-label={label}>{children}</div>;
}

function StatusBar() {
  return <div className="status-bar"><span>9:41</span><div className="dynamic-island" aria-hidden="true"><i /></div><div className="status-icons"><Icon name="wifi" size="small" /><span className="battery"><i /></span></div></div>;
}

function Header({ title, eyebrow, onBell }: { title: string; eyebrow?: string; onBell?: () => void }) {
  return <div className="header"><div><div className="eyebrow">{eyebrow}</div><div className="page-title">{title}</div></div>{onBell && <Tap className="icon-button bell-button" onTap={onBell} label="Open notifications"><Icon name="bell" /><span className="notification-dot" /></Tap>}</div>;
}

function BottomNav({ active, setScreen }: { active: Screen; setScreen: (screen: Screen) => void }) {
  const items: { screen: Screen; icon: IconName; label: string }[] = [
    { screen: "dashboard", icon: "home", label: "Home" },
    { screen: "schedule", icon: "calendar", label: "Schedule" },
    { screen: "monitor", icon: "chart", label: "Monitor" },
    { screen: "history", icon: "history", label: "History" },
    { screen: "profile", icon: "user", label: "Profile" },
  ];
  return <div className="bottom-nav glass">{items.map((item) => <Tap key={item.screen} className={`nav-item ${active === item.screen ? "active" : ""}`} onTap={() => setScreen(item.screen)} label={item.label}><span className="nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span></Tap>)}</div>;
}

function ScreenShell({ children, screen, setScreen, noNav = false }: { children: ReactNode; screen: Screen; setScreen: (screen: Screen) => void; noNav?: boolean }) {
  return <div className="phone"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><StatusBar /><main className={`screen-content ${noNav ? "no-nav" : ""}`}>{children}</main>{!noNav && <><BottomNav active={screen} setScreen={setScreen} /><div className="home-indicator" aria-hidden="true" /></>}</div>;
}

function Login({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return <ScreenShell screen="login" setScreen={() => {}} noNav><div className="login-screen"><BrandMark /><div className="login-copy"><div className="login-title">Welcome Back</div><div className="subtitle">Sign in to care for Milo from anywhere.</div></div><div className="login-card glass"><div className="field"><Icon name="mail" /><div className="field-copy"><span>Email</span><div contentEditable suppressContentEditableWarning role="textbox" aria-label="Email address">alex@pawsync.com</div></div></div><div className="field"><Icon name="lock" /><div className="field-copy"><span>Password</span><div contentEditable suppressContentEditableWarning role="textbox" aria-label="Password">••••••••••</div></div></div><Tap className="forgot-link">Forgot Password?</Tap><Tap className="primary-button" onTap={onLogin}>Sign In</Tap><div className="signup-copy">New to PawSync? <Tap className="inline-link" onTap={onSignup}>Create Account</Tap></div></div><div className="login-footer">Private, secure, and made for better care.</div></div></ScreenShell>;
}

function Signup({ onBack, onCreate }: { onBack: () => void; onCreate: () => void }) {
  return <ScreenShell screen="signup" setScreen={() => {}} noNav><div className="login-screen signup-screen"><BrandMark /><div className="login-copy"><div className="login-title">Create Account</div><div className="subtitle">Start caring for your pet in sync.</div></div><div className="login-card glass"><div className="field"><Icon name="user" /><div className="field-copy"><span>Full name</span><div contentEditable suppressContentEditableWarning role="textbox" aria-label="Full name">Alex Morgan</div></div></div><div className="field"><Icon name="mail" /><div className="field-copy"><span>Email</span><div contentEditable suppressContentEditableWarning role="textbox" aria-label="Email address">alex@pawsync.com</div></div></div><div className="field"><Icon name="lock" /><div className="field-copy"><span>Password</span><div contentEditable suppressContentEditableWarning role="textbox" aria-label="Password">••••••••••</div></div></div><Tap className="primary-button" onTap={onCreate}>Create Account</Tap><div className="signup-copy">Already have an account? <Tap className="inline-link" onTap={onBack}>Sign In</Tap></div></div><div className="login-footer">Private, secure, and made for better care.</div></div></ScreenShell>;
}

function Splash() {
  return <ScreenShell screen="splash" setScreen={() => {}} noNav><div className="splash-screen"><div className="splash-orb"><BrandMark splash /></div><div className="splash-name">PawSync</div><div className="splash-tagline">Care, perfectly in sync.</div><div className="splash-loader"><i /></div></div></ScreenShell>;
}

function Dashboard({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const [fed, setFed] = useState(false);
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    try { setStatus(await deviceApi.getStatus()); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to reach feeder"); }
  };
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 5000); return () => window.clearInterval(timer); }, []);
  const doFeed = async () => {
    setBusy(true);
    try { await deviceApi.feed(80); setFed(true); await refresh(); window.setTimeout(() => setFed(false), 2500); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Feeding failed"); }
    finally { setBusy(false); }
  };
  const percent = status?.foodLevelPercent ?? 0;
  const last = status?.lastFeeding;
  return <><Header eyebrow="GOOD MORNING" title="Alex" onBell={() => setScreen("notifications")} /><div className="pet-card glass"><img src={petPhoto} alt="Milo the golden retriever" /><div className="pet-info"><div className="pet-name">Milo</div><div className="pet-meta">Golden Retriever · 3 years</div></div><div className="online-pill"><span style={{ backgroundColor: status?.online ? undefined : "#f87171" }} />{status?.online ? "Online" : status ? "Offline" : "Checking"}</div></div>{status?.simulation && <div className="muted">Demo device · values are simulated</div>}{error && <div className="muted" role="status">{error}</div>}<div className="hero-card glass"><div className="hero-top"><div><div className="label">FOOD REMAINING</div><div className="hero-value">{Math.round(percent)}<span>%</span></div><div className="muted">{status ? `${status.foodRemainingGrams}g remaining` : "Waiting for feeder"}</div></div><div className="progress-ring"><svg viewBox="0 0 112 112"><circle className="ring-track" cx="56" cy="56" r="48" /><circle className="ring-value" cx="56" cy="56" r="48" style={{ strokeDashoffset: `${301 - 301 * percent / 100}px` }} /></svg><Icon name="bowl" size="large" /></div></div><div className="hero-divider" /><div className="feeding-row"><div><div className="label">NEXT FEEDING</div><div className="feeding-time">18:00 <span>scheduled</span></div></div><div className="amount-pill">80g</div></div></div><Tap className={`feed-button ${fed ? "fed" : ""}`} onTap={() => void doFeed()}><span className="feed-icon"><Icon name={fed ? "check" : "bowl"} size="large" /></span><span><strong>{fed ? "Feeding complete" : busy ? "Sending command…" : "Feed Now"}</strong><small>{fed ? "80g recorded" : "Request 80g from feeder"}</small></span></Tap><div className="section-heading"><span>At a glance</span><span>{status?.mode ?? "Connecting"}</span></div><div className="system-grid friendly-grid"><div className="device-status-card glass"><div className="system-icon"><Icon name="bowl" /></div><div><div className="system-label">Device Status</div><div className="friendly-status"><i />{status?.online ? "Online" : "Offline"}</div><div className="system-detail">{status?.deviceName ?? "PawSync Feeder"}</div></div></div><Tap className="system-card glass" onTap={() => setScreen("schedule")}><div className="system-icon purple"><Icon name="calendar" /></div><div className="system-label">Schedule</div><div className="system-value">{status?.schedulesEnabled ?? "—"} meals</div><div className="system-detail">Open schedule</div></Tap></div><div className="analytics-card glass"><div className="card-head"><div><div className="card-title">Weekly feeding</div><div className="muted">Connect history feed for analytics</div></div></div><div className="bar-chart">{[58,72,65,88,76,62,84].map((height, index) => <div className="bar-column" key={index}><div className={`bar bar-${index}`}><i /></div><span>{["M","T","W","T","F","S","S"][index]}</span></div>)}</div></div><div className="last-feed glass"><span className="mini-icon"><Icon name="history" /></span><div><div className="card-title">Last feeding</div><div className="muted">{last ? `${new Date(last.timestamp * 1000).toLocaleString()} · ${last.source}` : "No feeding recorded"}</div></div><strong>{last ? `${last.grams}g` : "—"}</strong></div></>;
}

function Schedule() {
  const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [schedules, setSchedules] = useState<DeviceSchedule[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void deviceApi.getSchedules().then(setSchedules).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load schedule")); }, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAmount, setNewAmount] = useState(60);
  const [newTime, setNewTime] = useState("20:30");
  const [newDays, setNewDays] = useState<string[]>([...dayOptions]);
  const total = schedules.filter((item) => item.enabled).reduce((sum, item) => sum + item.grams, 0);
  const addSchedule = () => {
    setAddModalOpen(true);
  };
  const confirmAddSchedule = () => {
    const id = crypto.randomUUID();
    const next = [...schedules, { id, name: "New meal", time: newTime, grams: newAmount, days: newDays, enabled: true }];
    setSchedules(next);
    void deviceApi.replaceSchedules(next).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not save schedule"));
    setEditingId(id);
    setAddModalOpen(false);
  };
  const getDayLabel = (days: string[]) => {
    if (days.length === 7) return "Every day";
    if (days.length === 0) return "No days selected";
    const selected = dayOptions.map((day) => days.includes(day));
    const first = selected.findIndex(Boolean);
    const last = selected.lastIndexOf(true);
    if (last - first + 1 === days.length && days.length >= 2) return `${dayOptions[first]} - ${dayOptions[last]}`;
    return dayOptions.filter((day) => days.includes(day)).join(", ");
  };
  const formatTimeInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length < 4) return digits;
    const hours = Math.min(23, Number(digits.slice(0, 2)) || 0).toString().padStart(2, "0");
    const minutes = Math.min(59, Number(digits.slice(2)) || 0).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  return <><Header eyebrow="AUTOMATION" title="Feeding schedule" />{error && <div role="status" className="muted">{error}</div>}<div className="schedule-summary glass"><div className="summary-icon"><Icon name="calendar" size="large" /></div><div><div className="card-title">{schedules.length} meals scheduled</div><div className="muted">{total}g total per day</div></div><Tap className="round-add" onTap={addSchedule} label="Add schedule"><Icon name="plus" /></Tap></div><div className="schedule-list">{schedules.map((item) => { const isEditing = editingId === item.id; const dayLabel = getDayLabel(item.days); const save = () => { void deviceApi.replaceSchedules(schedules).then(() => setError("")).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not save schedule")); setEditingId(null); }; const remove = () => { const next = schedules.filter((schedule) => schedule.id !== item.id); setSchedules(next); void deviceApi.replaceSchedules(next).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not delete schedule")); setEditingId(null); }; return <div className={`schedule-item glass ${isEditing ? "editing" : ""}`} key={item.id}><div className="schedule-card"><div className="schedule-time"><strong>{item.time}</strong><span>{Number(item.time.slice(0, 2)) < 12 ? "AM" : "PM"}</span></div><div className="schedule-copy"><div className="card-title">{item.name}</div><div className="muted">{item.grams}g · {dayLabel}</div><Tap className={`manage-button ${isEditing ? "active" : ""}`} onTap={() => setEditingId(isEditing ? null : item.id)} label={`${isEditing ? "Close" : "Open"} ${item.name} editor`}><Icon name="sliders" size="small" /></Tap></div><Tap className={`toggle ${item.enabled ? "on" : ""}`} onTap={() => { const next = schedules.map((schedule) => schedule.id === item.id ? { ...schedule, enabled: !schedule.enabled } : schedule); setSchedules(next); void deviceApi.replaceSchedules(next).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not update schedule")); }} label={`${item.enabled ? "Disable" : "Enable"} ${item.name}`}><i /></Tap></div>{isEditing && <div className="schedule-editor"><div className="editor-label">Feeding time</div><input className="time-input" type="text" inputMode="numeric" placeholder="20:30" value={item.time} onChange={(event) => setSchedules((items) => items.map((entry) => entry.id === item.id ? { ...entry, time: formatTimeInput(event.target.value) } : entry))} /><div className="editor-label">Portion size</div><div className="amount-stepper"><Tap className="stepper-button" onTap={() => setSchedules((items) => items.map((entry) => entry.id === item.id ? { ...entry, grams: Math.max(10, entry.grams - 10) } : entry))} label="Reduce portion"><Icon name="minus" /></Tap><div><strong>{item.grams}</strong><span>grams</span></div><Tap className="stepper-button" onTap={() => setSchedules((items) => items.map((entry) => entry.id === item.id ? { ...entry, grams: Math.min(250, entry.grams + 10) } : entry))} label="Increase portion"><Icon name="plus" /></Tap></div><div className="editor-label">Feeding days</div><div className="schedule-days">{dayOptions.map((day) => <Tap key={day} className={`schedule-day ${item.days.includes(day) ? "selected" : ""}`} onTap={() => setSchedules((items) => items.map((entry) => entry.id === item.id ? { ...entry, days: entry.days.includes(day) ? entry.days.filter((value) => value !== day) : dayOptions.filter((value) => [...entry.days, day].includes(value)) } : entry))} label={`${item.days.includes(day) ? "Remove" : "Add"} ${day}`}><span>{day.slice(0, 1)}</span><small>{day}</small></Tap>)}</div><Tap className="save-button schedule-save" onTap={save}><Icon name="check" />Save</Tap><Tap className="delete-schedule" onTap={remove}><Icon name="trash" />Delete schedule</Tap></div>}</div>; })}</div>{schedules.length === 0 && <div className="schedule-empty glass"><span className="mini-icon"><Icon name="calendar" /></span><div className="card-title">No feeding schedules</div><div className="muted">Add a meal to keep Milo’s routine on track.</div><Tap className="primary-button compact-button" onTap={addSchedule}><Icon name="plus" />Add schedule</Tap></div>}{addModalOpen && <div className="modal-backdrop"><div className="add-modal glass"><div className="modal-heading"><div><div className="eyebrow">NEW MEAL</div><div className="modal-title">Add feeding schedule</div></div><Tap className="modal-close" onTap={() => setAddModalOpen(false)} label="Close"><Icon name="plus" /></Tap></div><div className="editor-label">Feeding time</div><input className="time-input" type="text" inputMode="numeric" placeholder="20:30" value={newTime} onChange={(event) => setNewTime(formatTimeInput(event.target.value))} /><div className="editor-label">Portion size</div><div className="amount-stepper modal-amount"><Tap className="stepper-button" onTap={() => setNewAmount(Math.max(10, newAmount - 10))} label="Reduce amount"><Icon name="minus" /></Tap><div><strong>{newAmount}</strong><span>grams</span></div><Tap className="stepper-button" onTap={() => setNewAmount(Math.min(250, newAmount + 10))} label="Increase amount"><Icon name="plus" /></Tap></div><div className="editor-label">Feeding days</div><div className="schedule-days modal-days">{dayOptions.map((day) => <Tap key={day} className={`schedule-day ${newDays.includes(day) ? "selected" : ""}`} onTap={() => setNewDays(newDays.includes(day) ? newDays.filter((item) => item !== day) : [...newDays, day])} label={`${newDays.includes(day) ? "Remove" : "Add"} ${day}`}><span>{day.slice(0, 1)}</span><small>{day}</small></Tap>)}</div><div className="modal-actions"><Tap className="secondary-button" onTap={() => setAddModalOpen(false)}>Cancel</Tap><Tap className="save-button" onTap={confirmAddSchedule}><Icon name="check" />Save</Tap></div></div></div>}</>;
}

function Monitor() {
  return <><Header eyebrow="FOOD LEVEL" title="Food monitoring" /><div className="level-card glass"><div className="large-ring"><svg viewBox="0 0 210 210"><defs><linearGradient id="levelGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#65a9ff" /><stop offset="1" stopColor="#326fe9" /></linearGradient></defs><circle className="ring-track" cx="105" cy="105" r="84" /><circle className="ring-value" cx="105" cy="105" r="84" /></svg><div className="ring-content"><Icon name="bowl" size="large" /><strong>78<span>%</span></strong><small>FULL</small></div></div><div className="tank-status"><span className="pulse-dot" /><div><div className="card-title">Food level is good</div><div className="muted">About 6 days of food remaining</div></div></div></div><div className="section-heading"><span>Usage this week</span><span>1.65 kg total</span></div><div className="usage-card glass"><div className="usage-chart"><svg viewBox="0 0 340 150" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#438bff" stopOpacity=".28" /><stop offset="1" stopColor="#438bff" stopOpacity="0" /></linearGradient></defs><path className="area" d="M0 120 C35 110 40 70 75 82 S120 112 145 72 190 38 220 68 250 108 275 78 320 28 340 42 L340 150 0 150Z" /><path className="line" d="M0 120 C35 110 40 70 75 82 S120 112 145 72 190 38 220 68 250 108 275 78 320 28 340 42" /></svg><div className="chart-grid"><i /><i /><i /></div></div><div className="chart-labels">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => <span key={day}>{day}</span>)}</div></div><div className="section-heading"><span>Device</span><span>Updated now</span></div><div className="simple-device-card glass"><span className="mini-icon"><Icon name="bowl" /></span><div><div className="card-title">Device Status</div><div className="friendly-status"><i />Online</div></div></div></>;
}

function History() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Automatic" | "Manual">("All");
  const [dateFilter, setDateFilter] = useState<"All" | "Today" | "Yesterday">("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const records = [
    { id: 1, time: "12:00", title: "Lunch served", amount: 70, type: "Automatic", day: "Today", date: "June 16" },
    { id: 2, time: "07:31", title: "Breakfast served", amount: 80, type: "Automatic", day: "Today", date: "June 16" },
    { id: 3, time: "19:42", title: "Extra portion", amount: 35, type: "Manual", day: "Yesterday", date: "June 15" },
    { id: 4, time: "18:00", title: "Dinner served", amount: 80, type: "Automatic", day: "Yesterday", date: "June 15" },
    { id: 5, time: "12:00", title: "Lunch served", amount: 70, type: "Automatic", day: "Yesterday", date: "June 15" },
    { id: 6, time: "07:29", title: "Breakfast served", amount: 80, type: "Automatic", day: "Saturday", date: "June 14" },
    { id: 7, time: "18:02", title: "Dinner served", amount: 80, type: "Automatic", day: "Friday", date: "June 13" },
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRecords = records.filter((record) => {
    const matchesQuery = !normalizedQuery || `${record.title} ${record.type} ${record.amount}g ${record.day}`.toLowerCase().includes(normalizedQuery);
    const matchesType = typeFilter === "All" || record.type === typeFilter;
    const matchesDate = dateFilter === "All" || record.day === dateFilter;
    return matchesQuery && matchesType && matchesDate;
  });
  const filteredAmount = filteredRecords.reduce((sum, record) => sum + record.amount, 0);
  const activeFilterCount = Number(typeFilter !== "All") + Number(dateFilter !== "All");
  const resetFilters = () => {
    setTypeFilter("All");
    setDateFilter("All");
  };
  const clearAll = () => {
    resetFilters();
    setQuery("");
  };
  return <><Header eyebrow="ACTIVITY" title="Feeding history" /><div className="filter-row"><label className="search-box glass"><Icon name="search" /><input className="history-search-input" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} aria-label="Search feeding history" placeholder="Search records" /></label><Tap className={`filter-button glass ${filtersOpen || activeFilterCount ? "active" : ""}`} onTap={() => setFiltersOpen(!filtersOpen)} label="Filter history"><Icon name="sliders" />{activeFilterCount > 0 && <span>{activeFilterCount}</span>}</Tap></div>{filtersOpen && <div className="history-filters glass"><div className="filter-heading"><div><div className="card-title">Filter history</div><div className="muted">Show only the records you need</div></div>{activeFilterCount > 0 && <Tap className="text-action" onTap={resetFilters}>Reset</Tap>}</div><div className="filter-label">Feeding type</div><div className="filter-options">{(["All", "Automatic", "Manual"] as const).map((type) => <Tap key={type} className={`filter-chip ${typeFilter === type ? "selected" : ""}`} onTap={() => setTypeFilter(type)}>{type}</Tap>)}</div><div className="filter-label">Date</div><div className="filter-options">{(["All", "Today", "Yesterday"] as const).map((date) => <Tap key={date} className={`filter-chip ${dateFilter === date ? "selected" : ""}`} onTap={() => setDateFilter(date)}>{date === "All" ? "Any date" : date}</Tap>)}</div><Tap className="apply-filter" onTap={() => setFiltersOpen(false)}>Show {filteredRecords.length} records</Tap></div>}<div className="history-summary glass"><div><strong>{filteredAmount}</strong><span>grams shown</span></div><i /><div><strong>{filteredRecords.length}</strong><span>feedings</span></div><i /><div><strong>{filteredRecords.filter((record) => record.type === "Manual").length}</strong><span>manual</span></div></div>{filteredRecords.length > 0 ? <div className="timeline">{filteredRecords.map((record, index) => { const showDay = index === 0 || filteredRecords[index - 1].day !== record.day; return <div className="timeline-group" key={record.id}>{showDay && <div className="timeline-day">{record.day}<span>{record.date}</span></div>}<div className="timeline-item"><div className="timeline-time">{record.time}</div><div className="timeline-marker"><i />{index < filteredRecords.length - 1 && <span />}</div><div className="timeline-card glass"><div><div className="card-title">{record.title}</div><div className={`tag ${record.type === "Manual" ? "manual" : ""}`}>{record.type}</div></div><strong>{record.amount}g</strong></div></div></div>; })}</div> : <div className="history-empty glass"><span className="mini-icon"><Icon name="search" /></span><div className="card-title">No matching feedings</div><div className="muted">Try another search or reset your filters.</div><Tap className="text-action" onTap={clearAll}>Clear search & filters</Tap></div>}<div className="empty-note">{filteredRecords.length} feeding events shown · Synced securely</div></>;
}

function Notifications() {
  const alerts = [
    { icon: "bowl" as IconName, color: "amber", title: "Food is running low", copy: "The tank is at 18%. Consider refilling it soon.", time: "2m ago", unread: true },
    { icon: "check" as IconName, color: "blue", title: "Feeding completed", copy: "Milo's lunch was served successfully — 70g.", time: "2h ago", unread: true },
    { icon: "wifi" as IconName, color: "red", title: "Feeder was offline", copy: "PawSync Feeder disconnected for 3 minutes.", time: "Yesterday", unread: false },
    { icon: "check" as IconName, color: "green", title: "Device is ready", copy: "Your PawSync Feeder is online and ready for Milo.", time: "Mon", unread: false },
  ];
  return <><Header eyebrow="PAWSYNC" title="Notifications" /><div className="notification-toolbar"><span>2 unread</span><Tap className="text-action">Mark all as read</Tap></div><div className="notification-list">{alerts.map((alert) => <div className={`notification-card glass ${alert.unread ? "unread" : ""}`} key={alert.title}><span className={`alert-icon ${alert.color}`}><Icon name={alert.icon} /></span><div className="alert-copy"><div className="card-title">{alert.title}</div><div className="muted">{alert.copy}</div><span>{alert.time}</span></div>{alert.unread && <i className="unread-dot" />}</div>)}</div><div className="notification-empty glass"><span className="mini-icon"><Icon name="bell" /></span><div><div className="card-title">You’re all caught up</div><div className="muted">We’ll keep an eye on Milo’s feeder.</div></div></div></>;
}

function Profile({ onLogout }: { onLogout: () => void }) {
  const [pet, setPet] = useState({ name: "Milo", breed: "Golden Retriever", weight: "26.4", age: "3" });
  const [petDraft, setPetDraft] = useState(pet);
  const [owner, setOwner] = useState({ name: "Alex Morgan", email: "alex@pawsync.com", phone: "+66 81 234 5678" });
  const [ownerDraft, setOwnerDraft] = useState(owner);
  const [profileEditor, setProfileEditor] = useState<"pet" | "owner" | null>(null);
  const [settingsPanel, setSettingsPanel] = useState<"device" | "notifications" | "preferences" | null>(null);
  const [deviceOnline, setDeviceOnline] = useState(true);
  const [deviceName, setDeviceName] = useState("PawSync Feeder");
  const [deviceLocation, setDeviceLocation] = useState("Kitchen");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [portion, setPortion] = useState(80);
  const [unit, setUnit] = useState<"grams" | "ounces">("grams");
  const initials = owner.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const openPetEditor = () => {
    setPetDraft(pet);
    setProfileEditor(profileEditor === "pet" ? null : "pet");
  };
  const openOwnerEditor = () => {
    setOwnerDraft(owner);
    setProfileEditor(profileEditor === "owner" ? null : "owner");
  };
  return <><Header eyebrow="ACCOUNT" title="Profile" /><div className="profile-card glass"><img src={petPhoto} alt={`${pet.name} the ${pet.breed}`} /><div><div className="profile-name">{pet.name}</div><div className="muted">{pet.breed} · {pet.weight} kg</div><Tap className="text-action" onTap={openPetEditor}>{profileEditor === "pet" ? "Close editor" : "Edit pet profile"}</Tap></div></div>{profileEditor === "pet" && <div className="profile-editor glass"><div className="editor-title"><span className="mini-icon"><Icon name="pet" /></span><div><div className="card-title">Edit pet profile</div><div className="muted">Keep {pet.name}’s information up to date</div></div></div><EditableField label="Pet name" value={petDraft.name} onChange={(value) => setPetDraft({ ...petDraft, name: value })} /><EditableField label="Breed" value={petDraft.breed} onChange={(value) => setPetDraft({ ...petDraft, breed: value })} /><div className="editor-field-grid"><EditableField label="Weight (kg)" value={petDraft.weight} onChange={(value) => setPetDraft({ ...petDraft, weight: value })} /><EditableField label="Age (years)" value={petDraft.age} onChange={(value) => setPetDraft({ ...petDraft, age: value })} /></div><div className="editor-actions"><Tap className="secondary-button" onTap={() => setProfileEditor(null)}>Cancel</Tap><Tap className="save-button" onTap={() => { setPet(petDraft); setProfileEditor(null); }}><Icon name="check" />Save changes</Tap></div></div>}<div className="section-heading"><span>Owner</span><span /></div><Tap className="owner-card glass" onTap={openOwnerEditor} label="Edit owner profile"><div className="avatar">{initials}</div><div><div className="card-title">{owner.name}</div><div className="muted">{owner.email}</div></div><Icon name="chevron" /></Tap>{profileEditor === "owner" && <div className="profile-editor glass"><div className="editor-title"><span className="mini-icon"><Icon name="user" /></span><div><div className="card-title">Owner information</div><div className="muted">Used for account and feeder alerts</div></div></div><EditableField label="Full name" value={ownerDraft.name} onChange={(value) => setOwnerDraft({ ...ownerDraft, name: value })} /><EditableField label="Email" value={ownerDraft.email} onChange={(value) => setOwnerDraft({ ...ownerDraft, email: value })} /><EditableField label="Phone" value={ownerDraft.phone} onChange={(value) => setOwnerDraft({ ...ownerDraft, phone: value })} /><div className="editor-actions"><Tap className="secondary-button" onTap={() => setProfileEditor(null)}>Cancel</Tap><Tap className="save-button" onTap={() => { setOwner(ownerDraft); setProfileEditor(null); }}><Icon name="check" />Save changes</Tap></div></div>}<div className="section-heading"><span>Device & settings</span><span /></div><div className="settings-card glass"><SettingsRow icon="bowl" title={deviceName} detail={`${deviceOnline ? "Online" : "Offline"} · ${deviceLocation}`} onTap={() => setSettingsPanel(settingsPanel === "device" ? null : "device")} /><SettingsRow icon="bell" title="Notifications" detail={notificationsEnabled ? "All alerts enabled" : "Alerts paused"} onTap={() => setSettingsPanel(settingsPanel === "notifications" ? null : "notifications")} /><SettingsRow icon="settings" title="Preferences" detail={`${portion} ${unit} per serving`} onTap={() => setSettingsPanel(settingsPanel === "preferences" ? null : "preferences")} last /></div>{settingsPanel === "device" && <div className="profile-editor settings-editor glass"><div className="editor-title"><span className="mini-icon"><Icon name="bowl" /></span><div><div className="card-title">Device settings</div><div className="muted">Manage your connected feeder</div></div></div><EditableField label="Device name" value={deviceName} onChange={setDeviceName} /><EditableField label="Location" value={deviceLocation} onChange={setDeviceLocation} /><div className="setting-control"><div><div className="card-title">Device status</div><div className="muted">{deviceOnline ? "Online and ready to feed" : "Device is currently offline"}</div></div><Tap className={`toggle ${deviceOnline ? "on" : ""}`} onTap={() => setDeviceOnline(!deviceOnline)} label="Toggle device status"><i /></Tap></div><Tap className="save-button full-button" onTap={() => setSettingsPanel(null)}><Icon name="check" />Done</Tap></div>}{settingsPanel === "notifications" && <div className="profile-editor settings-editor glass"><div className="editor-title"><span className="mini-icon"><Icon name="bell" /></span><div><div className="card-title">Notifications</div><div className="muted">Choose which alerts you receive</div></div></div><div className="setting-control"><div><div className="card-title">PawSync alerts</div><div className="muted">Feeding, low food, and device updates</div></div><Tap className={`toggle ${notificationsEnabled ? "on" : ""}`} onTap={() => setNotificationsEnabled(!notificationsEnabled)} label="Toggle notifications"><i /></Tap></div><Tap className="save-button full-button" onTap={() => setSettingsPanel(null)}><Icon name="check" />Done</Tap></div>}{settingsPanel === "preferences" && <div className="profile-editor settings-editor glass"><div className="editor-title"><span className="mini-icon"><Icon name="settings" /></span><div><div className="card-title">Feeding preferences</div><div className="muted">Set your default serving</div></div></div><div className="editor-label">Default portion</div><div className="amount-stepper"><Tap className="stepper-button" onTap={() => setPortion(Math.max(10, portion - 10))} label="Reduce portion"><Icon name="minus" /></Tap><div><strong>{portion}</strong><span>{unit}</span></div><Tap className="stepper-button" onTap={() => setPortion(Math.min(250, portion + 10))} label="Increase portion"><Icon name="plus" /></Tap></div><div className="editor-label">Measurement unit</div><div className="unit-options"><Tap className={`filter-chip ${unit === "grams" ? "selected" : ""}`} onTap={() => setUnit("grams")}>Grams</Tap><Tap className={`filter-chip ${unit === "ounces" ? "selected" : ""}`} onTap={() => setUnit("ounces")}>Ounces</Tap></div><Tap className="save-button full-button" onTap={() => setSettingsPanel(null)}><Icon name="check" />Done</Tap></div>}<Tap className="logout-button glass" onTap={onLogout}><Icon name="logout" />Log out</Tap><div className="version">PawSync 1.0</div></>;
}

function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="editable-field"><span>{label}</span><div contentEditable suppressContentEditableWarning role="textbox" aria-label={label} onInput={(event) => onChange(event.currentTarget.textContent ?? "")}>{value}</div></div>;
}

function SettingsRow({ icon, title, detail, last, onTap }: { icon: IconName; title: string; detail: string; last?: boolean; onTap?: () => void }) {
  return <Tap className={`settings-row ${last ? "last" : ""}`} onTap={onTap}><span className="mini-icon"><Icon name={icon} /></span><div><div className="card-title">{title}</div><div className="muted">{detail}</div></div><Icon name="chevron" size="small" /></Tap>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  useEffect(() => {
    if (screen !== "splash") return;
    const timer = window.setTimeout(() => setScreen("login"), 1500);
    return () => window.clearTimeout(timer);
  }, [screen]);
  let content: ReactNode;
  if (screen === "splash") return <div className="app-shell"><Splash /></div>;
  if (screen === "login") return <div className="app-shell"><Login onLogin={() => setScreen("dashboard")} onSignup={() => setScreen("signup")} /></div>;
  if (screen === "signup") return <div className="app-shell"><Signup onBack={() => setScreen("login")} onCreate={() => setScreen("dashboard")} /></div>;
  if (screen === "dashboard") content = <Dashboard setScreen={setScreen} />;
  else if (screen === "schedule") content = <Schedule />;
  else if (screen === "monitor") content = <Monitor />;
  else if (screen === "history") content = <History />;
  else if (screen === "notifications") content = <Notifications />;
  else content = <Profile onLogout={() => setScreen("login")} />;
  return <div className="app-shell"><ScreenShell screen={screen} setScreen={setScreen}>{content}</ScreenShell></div>;
}









