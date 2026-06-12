const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "gold"
}/*EDITMODE-END*/;

const ACCENTS = {
  gold:    { name: "Champagne", dark: ["0.82 0.095 88", "0.72 0.10 85",  "0.55 0.085 85"], light: ["0.66 0.105 75", "0.58 0.115 72", "0.46 0.10 70"] },
  emerald: { name: "Emerald",   dark: ["0.80 0.13 160", "0.70 0.14 158", "0.52 0.12 158"], light: ["0.58 0.13 158", "0.50 0.14 158", "0.40 0.12 158"] },
  azure:   { name: "Azure",     dark: ["0.78 0.10 235", "0.68 0.12 235", "0.52 0.11 235"], light: ["0.55 0.14 240", "0.48 0.15 240", "0.40 0.13 240"] },
  violet:  { name: "Violet",    dark: ["0.78 0.11 295", "0.68 0.14 295", "0.52 0.13 295"], light: ["0.55 0.18 295", "0.48 0.20 295", "0.40 0.18 295"] },
};

function applyAccent(theme, accent) {
  const a = ACCENTS[accent] || ACCENTS.gold;
  const [g1, g2, g3] = theme === "light" ? a.light : a.dark;
  const root = document.documentElement;
  root.style.setProperty("--gold",   `oklch(${g1})`);
  root.style.setProperty("--gold-2", `oklch(${g2})`);
  root.style.setProperty("--gold-3", `oklch(${g3})`);
  root.style.setProperty("--gold-dim", theme === "light"
    ? `oklch(${g1} / 0.14)`
    : `oklch(${g3.split(" ").slice(0,3).join(" ")} / 0.35)`);
  // Ink color on top of accent: dark text for light accents, white for dark accents
  const L = parseFloat(g1.split(" ")[0]);
  root.style.setProperty("--gold-ink", L > 0.72 ? "oklch(0.18 0.01 80)" : "oklch(1 0 0)");
}

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "Dashboard" },
  { id: "vehicles", label: "Vehicles", icon: "Car", badge: "24" },
  { id: "customers", label: "Customers", icon: "Users", badge: "142" },
  { id: "bookings", label: "Bookings", icon: "Booking", badge: "18" },
  { id: "invoices", label: "Invoices", icon: "Invoice" },
  { id: "reports", label: "Reports", icon: "Reports" },
  { id: "settings", label: "Settings", icon: "Settings" },
];

function Sidebar({ active, onNav }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">G</div>
        <div>
          <div className="brand-name">Gasith</div>
          <div className="brand-sub">Rent a Car</div>
        </div>
      </div>
      <div className="nav-section">
        <div className="nav-label">Main</div>
        <div className="nav-list">
          {NAV.slice(0, 5).map(n => {
            const Ico = Icons[n.icon];
            return (
              <button key={n.id}
                className={`nav-item ${active === n.id ? "active" : ""}`}
                onClick={() => onNav(n.id)}>
                <span className="nav-ico"><Ico size={17}/></span>
                {n.label}
                {n.badge && <span className="nav-badge mono">{n.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="nav-section">
        <div className="nav-label">Workspace</div>
        <div className="nav-list">
          {NAV.slice(5).map(n => {
            const Ico = Icons[n.icon];
            return (
              <button key={n.id}
                className={`nav-item ${active === n.id ? "active" : ""}`}
                onClick={() => onNav(n.id)}>
                <span className="nav-ico"><Ico size={17}/></span>
                {n.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="sidebar-foot">
        <div className="avatar">IM</div>
        <div style={{flex:1, minWidth:0}}>
          <div className="user-name">Imdinesh M.</div>
          <div className="user-mail">imdineshsandaru@gmail.com</div>
        </div>
        <button className="iconbtn" style={{width:28, height:28}} title="Sign out">
          <Icons.ExternalLink size={13}/>
        </button>
      </div>
    </aside>
  );
}

function TopBar({ theme, onToggleTheme, crumb }) {
  return (
    <div className="topbar">
      <div className="crumb">
        <Icons.Dashboard size={13}/>
        <span>Pages</span>
        <span className="sep">/</span>
        <b>{crumb}</b>
      </div>
      <div className="topbar-spacer"/>
      <div className="search">
        <Icons.Search size={14}/>
        <input placeholder="Search vehicles, customers, bookings…"/>
        <span className="kbd">⌘K</span>
      </div>
      <button className="iconbtn" title={theme === "dark" ? "Switch to light" : "Switch to dark"} onClick={onToggleTheme}>
        {theme === "dark" ? <Icons.Sun size={16}/> : <Icons.Moon size={16}/>}
      </button>
      <button className="iconbtn" title="Notifications">
        <Icons.Bell size={16}/>
        <span className="dot"/>
      </button>
      <button className="iconbtn" title="Locale">
        <Icons.Globe size={16}/>
      </button>
    </div>
  );
}

function DashboardPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-sub">Welcome back, Imdinesh — here's your fleet at a glance.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost"><Icons.Calendar size={13}/>May 2026</button>
          <button className="btn btn-ghost"><Icons.ExternalLink size={13}/>View Site</button>
          <button className="btn btn-primary"><Icons.Plus size={14}/>New Booking</button>
        </div>
      </div>

      <div className="kpi-grid">
        {AppData.kpis.map(k => <KpiCard key={k.label} k={k}/>)}
      </div>

      <div className="row-2-1">
        <RevenueChart/>
        <WeeklyBookings/>
      </div>

      <div className="row-1-1-1">
        <FleetTable/>
        <RecentBookings/>
        <QuickTasks/>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 2fr", gap:14}}>
        <FleetDonut/>
        <ActivityFeed/>
      </div>
    </>
  );
}

function ActivityFeed() {
  const acts = [
    { ico: "KeyRound", title: "Toyota Aqua (CAR-8421) handed over", who: "K. Perera", time: "12 min ago" },
    { ico: "Money", title: "Payment received — LKR 42,500", who: "Dilshan Pereira · Invoice #1284", time: "1h ago" },
    { ico: "Booking", title: "New booking request — Honda Vezel × 7 days", who: "Roshan Bandara", time: "2h ago" },
    { ico: "Wrench", title: "Service scheduled — Toyota Axio (CBA-1567)", who: "Auto Service Lanka · May 18", time: "4h ago" },
    { ico: "Car", title: "Suzuki Swift returned with 1,240 km logged", who: "R. de Silva", time: "Yesterday" },
  ];
  return (
    <div className="card" style={{overflow:"hidden"}}>
      <div className="card-head">
        <div>
          <div className="card-title">Activity</div>
          <div className="card-sub">Across your fleet operations</div>
        </div>
        <button className="link">All activity <Icons.ChevronRight size={12}/></button>
      </div>
      <div style={{padding:"4px 0 12px"}}>
        {acts.map((a, i) => {
          const Ico = Icons[a.ico];
          return (
            <div className="activity-row" key={i}>
              <div className="act-ico"><Ico size={13}/></div>
              <div className="act-body">
                <div><b>{a.title}</b></div>
                <div className="act-time">{a.who} · {a.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyPage({ name, icon }) {
  const Ico = Icons[icon];
  return (
    <div style={{
      display:"grid", placeItems:"center",
      padding:"100px 20px", color:"var(--fg-3)"
    }}>
      <div style={{textAlign:"center", maxWidth:360}}>
        <div style={{
          width:48, height:48, borderRadius:12,
          background:"var(--bg-1)", border:"1px solid var(--border-soft)",
          display:"grid", placeItems:"center", margin:"0 auto 16px",
          color:"var(--gold)"
        }}>
          <Ico size={22}/>
        </div>
        <div style={{fontSize:16, fontWeight:600, color:"var(--fg)", marginBottom:6}}>
          {name}
        </div>
        <div style={{fontSize:13, color:"var(--fg-3)"}}>
          Placeholder route — the dashboard page is the focus of this redesign.
        </div>
      </div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [active, setActive] = useStateA("reports");
  const current = NAV.find(n => n.id === active);

  useEffectA(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
    applyAccent(t.theme, t.accent);
  }, [t.theme, t.accent]);

  return (
    <div className="app">
      <Sidebar active={active} onNav={setActive}/>
      <main className="main">
        <TopBar theme={t.theme} crumb={current.label} onToggleTheme={() => setTweak("theme", t.theme === "dark" ? "light" : "dark")}/>
        <div className="page">
          {active === "dashboard" ? <DashboardPage/> :
           active === "vehicles" ? <VehiclesPage/> :
           active === "reports" ? <ReportsPage/> :
           <EmptyPage name={current.label} icon={current.icon}/>}
        </div>
      </main>
      <TweaksPanel title="Tweaks">
        <TweakSection label="Appearance"/>
        <TweakRadio label="Theme" value={t.theme}
          options={["dark", "light"]}
          onChange={(v) => setTweak("theme", v)}/>
        <TweakSelect label="Accent" value={t.accent}
          options={Object.keys(ACCENTS)}
          onChange={(v) => setTweak("accent", v)}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
