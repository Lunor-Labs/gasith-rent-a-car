const { useState: useStateR } = React;
const R = () => window.AppData.reports;

/* ===== Summary card ===== */
function RepCard({ s }) {
  const up = s.deltaDir === "up";
  const formatted =
    s.prefix === "LKR" ? AppData.fmtLkr(s.value) :
    s.suffix === "%" ? s.value.toFixed(1) :
    s.value.toLocaleString();
  return (
    <div className="rep-card">
      <div className="lab">{s.label}</div>
      <div className="num">
        {s.prefix && <span className="ccy">{s.prefix}</span>}
        {formatted}
        {s.suffix && <span className="suf">{s.suffix}</span>}
      </div>
      <div className="ctx">
        <span className={`delta ${up ? "pos" : "neg"}`}>
          {up ? <Icons.ArrowUp size={11}/> : <Icons.ArrowDown size={11}/>}
          {s.delta}%
        </span>
        <span>{s.context}</span>
      </div>
    </div>
  );
}

/* ===== Stacked horizontal bar — revenue by category ===== */
function CategoryStack() {
  const data = R().byCategory;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Revenue by Category</div>
          <div className="card-sub">{R().period} · LKR {(total / 1_000_000).toFixed(2)}M total</div>
        </div>
        <button className="link">Drill down <Icons.ChevronRight size={12}/></button>
      </div>
      <div style={{padding: "0 20px 18px"}}>
        <div className="stack-bar">
          {data.map(d => {
            const pct = (d.value / total) * 100;
            return (
              <div key={d.label} className="seg" style={{ width: `${pct}%`, background: d.color }}>
                {pct >= 8 ? `${pct.toFixed(0)}%` : ""}
              </div>
            );
          })}
        </div>
        <div className="stack-legend">
          {data.map(d => {
            const pct = (d.value / total) * 100;
            return (
              <div className="row" key={d.label}>
                <span className="swatch" style={{ background: d.color }}/>
                <span>{d.label}</span>
                <span className="pct">{pct.toFixed(1)}%</span>
                <span className="amt"><span className="ccy">LKR</span>{AppData.fmtLkr(d.value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ===== Trend chart (bars + line) ===== */
function TrendChart() {
  const data = R().weeklyTrend;
  const W = 720, H = 240, P = { l: 36, r: 36, t: 18, b: 30 };
  const maxRev = 1000;
  const maxBk = 40;
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;
  const step = innerW / data.length;
  const barW = step * 0.55;
  const xCenter = (i) => P.l + step * i + step / 2;

  const linePath = data.map((d, i) =>
    `${i ? "L" : "M"}${xCenter(i)},${P.t + innerH - (d.bk / maxBk) * innerH}`
  ).join(" ");

  const grids = [0, 250, 500, 750, 1000];

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Revenue &amp; Bookings Trend</div>
          <div className="card-sub">Last 12 weeks · bars LKR (000s), line bookings</div>
        </div>
        <div className="chart-legend" style={{margin: 0}}>
          <span className="legend-item"><span className="legend-dot" style={{background: "var(--gold)"}}/>Revenue</span>
          <span className="legend-item"><span className="legend-dot" style={{background: "var(--info)", borderRadius: 999, width: 12, height: 2}}/>Bookings</span>
        </div>
      </div>
      <div style={{padding: "0 8px 12px"}}>
        <svg className="trend-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="trBar" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="var(--gold-3)" stopOpacity="0.65"/>
            </linearGradient>
          </defs>
          {grids.map(g => (
            <g key={g}>
              <line x1={P.l} x2={W - P.r}
                y1={P.t + innerH - (g / maxRev) * innerH}
                y2={P.t + innerH - (g / maxRev) * innerH}
                stroke="var(--border-soft)" strokeDasharray="3 4"/>
              <text x={P.l - 8} y={P.t + innerH - (g / maxRev) * innerH + 3}
                fontSize="10" fill="var(--fg-4)" textAnchor="end" fontFamily="Geist Mono">
                {g}K
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const h = (d.rev / maxRev) * innerH;
            const x = xCenter(i) - barW / 2;
            const y = P.t + innerH - h;
            return (
              <rect key={i} x={x} y={y} width={barW} height={h} rx="3"
                fill="url(#trBar)"/>
            );
          })}
          <path d={linePath} fill="none" stroke="var(--info)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
          {data.map((d, i) => (
            <circle key={i} cx={xCenter(i)}
              cy={P.t + innerH - (d.bk / maxBk) * innerH}
              r={i === data.length - 1 ? 4 : 2.5}
              fill={i === data.length - 1 ? "var(--info)" : "var(--bg-0)"}
              stroke="var(--info)" strokeWidth="1.5"/>
          ))}
          {data.map((d, i) => (
            <text key={i} x={xCenter(i)} y={H - 8}
              fontSize="10" fill="var(--fg-4)" textAnchor="middle" fontFamily="Geist Mono">
              {d.w}
            </text>
          ))}
          {/* Right axis for bookings */}
          {[0, 10, 20, 30, 40].map(b => (
            <text key={b} x={W - P.r + 8}
              y={P.t + innerH - (b / maxBk) * innerH + 3}
              fontSize="10" fill="var(--info)" opacity="0.7"
              textAnchor="start" fontFamily="Geist Mono">{b}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ===== Top vehicles ===== */
function TopVehicles() {
  const data = R().topVehicles;
  const max = Math.max(...data.map(d => d.revenue));
  return (
    <div className="card" style={{overflow: "hidden"}}>
      <div className="card-head">
        <div>
          <div className="card-title">Top Performing Vehicles</div>
          <div className="card-sub">Ranked by revenue · {R().period}</div>
        </div>
        <button className="link">Export <Icons.ExternalLink size={12}/></button>
      </div>
      <table className="top-vehicles">
        <thead>
          <tr>
            <th style={{width: 36}}>#</th>
            <th>Vehicle</th>
            <th style={{textAlign: "right"}}>Bookings</th>
            <th style={{textAlign: "right"}}>Days out</th>
            <th>Utilisation</th>
            <th style={{textAlign: "right"}}>Revenue</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.map((v, i) => {
            const w = (v.revenue / max) * 100;
            return (
              <tr key={v.plate}>
                <td>
                  <span className={`rank-pill ${i < 3 ? `medal-${i + 1}` : ""}`}>{i + 1}</span>
                </td>
                <td>
                  <div className="vname-cell">
                    <div className="vname-thumb" style={{ "--veh-hue": v.hue }}/>
                    <div>
                      <div style={{color: "var(--fg)", fontWeight: 500}}>{v.name}</div>
                      <div style={{fontSize: 11, color: "var(--fg-4)", marginTop: 2}}>
                        {v.category} · {v.plate}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="mono" style={{textAlign: "right"}}>{v.bookings}</td>
                <td className="mono dim" style={{textAlign: "right"}}>{v.days}</td>
                <td>
                  <span className={`util-bar ${v.util < 75 ? "low" : ""}`}>
                    <span style={{width: `${v.util}%`}}/>
                  </span>
                  <span className="mono" style={{fontSize: 12, color: "var(--fg-3)"}}>{v.util}%</span>
                </td>
                <td>
                  <div style={{display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4}}>
                    <span className="mono" style={{color: "var(--fg)", fontSize: 13}}>
                      <span style={{color: "var(--fg-4)", fontSize: 10.5, marginRight: 3}}>LKR</span>
                      {AppData.fmtLkr(v.revenue)}
                    </span>
                    <span className="rev-bar"><span style={{width: `${w}%`}}/></span>
                  </div>
                </td>
                <td>
                  <button className="iconbtn-sm" title="View details"><Icons.ChevronRight size={14}/></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ===== Sources donut ===== */
function SourcesDonut() {
  const data = R().sources;
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 52, cx = 60, cy = 60, c = 2 * Math.PI * r;
  let off = 0;
  const segs = data.map(d => {
    const frac = d.value / total;
    const dash = c * frac;
    const seg = { ...d, dash, off };
    off += dash;
    return seg;
  });
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Booking Sources</div>
          <div className="card-sub">Last 30 days</div>
        </div>
      </div>
      <div className="donut-block">
        <div style={{position: "relative", width: 120, height: 120, flex: "none"}}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{transform: "rotate(-90deg)"}}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-2)" strokeWidth="14"/>
            {segs.map((s, i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={s.color} strokeWidth="14"
                strokeDasharray={`${s.dash} ${c - s.dash}`}
                strokeDashoffset={-s.off}/>
            ))}
          </svg>
          <div className="donut-center">
            <div>
              <div className="donut-pct">{total}</div>
              <div className="donut-label">Bookings</div>
            </div>
          </div>
        </div>
        <div className="legend-stack">
          {data.map(d => (
            <div className="row" key={d.label}>
              <span className="swatch" style={{background: d.color}}/>
              {d.label}
              <b>{d.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== Customer mix ===== */
function CustomerMix() {
  const c = R().customers;
  const newPct = (c.new / (c.new + c.returning) * 100).toFixed(0);
  return (
    <div className="card" style={{overflow: "hidden"}}>
      <div className="card-head">
        <div>
          <div className="card-title">Customer Mix</div>
          <div className="card-sub">{c.total} total customers</div>
        </div>
        <button className="link">View segments <Icons.ChevronRight size={12}/></button>
      </div>
      <div className="cust-split">
        <div className="b">
          <div className="lab">New</div>
          <div className="num">{c.new}<span className="pct">+{newPct}%</span></div>
        </div>
        <div className="b">
          <div className="lab">Returning</div>
          <div className="num">{c.returning}<span className="pct" style={{color: "var(--gold)"}}>22% rate</span></div>
        </div>
      </div>
      <div style={{padding: "0 20px 10px"}}>
        <div style={{fontSize: 11, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500}}>
          Top spenders this month
        </div>
      </div>
      <div>
        {c.topSpenders.map(s => (
          <div className="top-spender" key={s.initials}>
            <div className="cust-av">{s.initials}</div>
            <div>
              <div className="nm">{s.name}</div>
              <div className="sub">{s.bookings} bookings</div>
            </div>
            <div className="amt">
              <span className="ccy">LKR</span>{AppData.fmtLkr(s.spent)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Saved reports ===== */
function SavedReports() {
  const data = R().savedReports;
  return (
    <div>
      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12}}>
        <div>
          <div style={{fontSize: 14, fontWeight: 600, color: "var(--fg)"}}>Saved Reports</div>
          <div style={{fontSize: 12, color: "var(--fg-4)", marginTop: 2}}>
            Scheduled and on-demand reports
          </div>
        </div>
        <button className="btn btn-ghost"><Icons.Plus size={13}/>New report</button>
      </div>
      <div className="saved-grid">
        {data.map(r => {
          const Ico = Icons[r.icon];
          return (
            <div className="saved-card" key={r.name}>
              <div className="top">
                <div className="ico"><Ico size={15}/></div>
                <div style={{minWidth: 0, flex: 1}}>
                  <div className="nm">{r.name}</div>
                  <div className="meta">
                    <Icons.Clock size={11}/>{r.schedule}
                  </div>
                </div>
              </div>
              <div style={{fontSize: 11.5, color: "var(--fg-4)"}}>
                Last run · <span className="mono" style={{color: "var(--fg-3)"}}>{r.lastRun}</span>
              </div>
              <div className="acts">
                <button className="btn"><Icons.ArrowDown size={12}/>Download</button>
                <button className="iconbtn-sm" title="Run now"><Icons.ArrowRight size={13}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== Page ===== */
function ReportsPage() {
  const [granularity, setGranularity] = useStateR("Month");
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <div className="page-sub">Performance, revenue, and operations · {R().period}</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost"><Icons.Filter size={13}/>Filters</button>
          <button className="btn btn-ghost"><Icons.ArrowDown size={13}/>Export PDF</button>
          <button className="btn btn-primary"><Icons.Plus size={14}/>New Report</button>
        </div>
      </div>

      <div className="rep-toolbar">
        <div className="period-picker">
          <span className="lbl">Period</span>
          <button className="nav"><Icons.ChevronRight size={12} style={{transform: "rotate(180deg)"}}/></button>
          <span className="val">{R().period}</span>
          <button className="nav"><Icons.ChevronRight size={12}/></button>
        </div>
        <div className="granularity-tabs">
          {["Day", "Week", "Month", "Quarter", "Year"].map(g => (
            <button key={g} className={granularity === g ? "active" : ""} onClick={() => setGranularity(g)}>{g}</button>
          ))}
        </div>
        <span style={{marginLeft: "auto", fontSize: 11.5, color: "var(--fg-4)"}}>
          Updated <span className="mono">2 min ago</span>
        </span>
      </div>

      <div className="rep-summary">
        {R().summary.map(s => <RepCard key={s.label} s={s}/>)}
      </div>

      <div className="rep-grid-main">
        <TrendChart/>
        <CategoryStack/>
      </div>

      <div className="rep-grid-2">
        <TopVehicles/>
        <div style={{display: "flex", flexDirection: "column", gap: 14}}>
          <SourcesDonut/>
        </div>
      </div>

      <CustomerMix/>

      <SavedReports/>
    </>
  );
}

window.ReportsPage = ReportsPage;
