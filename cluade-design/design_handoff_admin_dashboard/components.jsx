const { useState } = React;

function Sparkline({ data, color = "var(--gold-2)" }) {
  const w = 120, h = 36;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg className="kpi-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function KpiCard({ k }) {
  const Icon = Icons[k.icon];
  const isUp = k.deltaDir === "up";
  const formatted =
    k.prefix === "LKR" ? AppData.fmtLkr(k.value) :
    k.suffix === "%" ? k.value : k.value.toLocaleString();
  return (
    <div className="kpi">
      <div className="kpi-head">
        <div className="kpi-ico"><Icon size={16} /></div>
        <div className="kpi-label">{k.label}</div>
      </div>
      <div className="kpi-value mono">
        {k.prefix && <span className="unit">{k.prefix}</span>}
        {formatted}
        {k.suffix && <span style={{color:"var(--fg-3)", fontSize:18, marginLeft:1}}>{k.suffix}</span>}
      </div>
      <div className="kpi-foot">
        <span className={`delta ${isUp ? "pos" : "neg"}`}>
          {isUp ? <Icons.ArrowUp size={11}/> : <Icons.ArrowDown size={11}/>}
          {k.delta}{k.deltaUnit === "" ? "" : "%"}
        </span>
        <span className="kpi-context">{k.context}</span>
      </div>
      <Sparkline data={k.spark} color={isUp ? "var(--pos)" : "var(--neg)"} />
    </div>
  );
}

function RevenueChart() {
  const [range, setRange] = useState("12m");
  const data = AppData.revenueData;
  const w = 880, h = 220, pad = { l: 44, r: 16, t: 16, b: 28 };
  const max = 3400;
  const xStep = (w - pad.l - pad.r) / (data.length - 1);
  const yScale = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
  const xPos = (i) => pad.l + i * xStep;

  const linePath = data.map((d, i) => `${i ? "L" : "M"}${xPos(i)},${yScale(d.revenue)}`).join(" ");
  const areaPath = `${linePath} L${xPos(data.length - 1)},${h - pad.b} L${pad.l},${h - pad.b} Z`;
  const targetPath = data.map((d, i) => `${i ? "L" : "M"}${xPos(i)},${yScale(d.target)}`).join(" ");

  const gridLines = [0, 1000, 2000, 3000];
  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Revenue Trend</div>
          <div className="card-sub">Last 12 months · vs target</div>
        </div>
        <div className="tabs">
          {["7d", "30d", "12m", "All"].map(r => (
            <button key={r} className={`tab ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>
      <div className="chart-stats">
        <div className="chart-stat-main mono">
          <span className="unit">LKR</span>{(total / 1000).toFixed(2)}M
        </div>
        <span className="delta pos"><Icons.ArrowUp size={11}/>18.6%</span>
        <span className="dim" style={{fontSize:12}}>vs prior 12m</span>
        <div className="chart-legend">
          <div className="legend-item"><span className="legend-dot" style={{background:"var(--gold)"}}/>Revenue</div>
          <div className="legend-item"><span className="legend-dot" style={{background:"var(--fg-4)", borderRadius:0, height:2, width:12}}/>Target</div>
        </div>
      </div>
      <div className="chart-wrap">
        <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="revG" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          {gridLines.map(g => (
            <g key={g}>
              <line x1={pad.l} x2={w - pad.r} y1={yScale(g)} y2={yScale(g)}
                stroke="var(--border-soft)" strokeDasharray="3 4"/>
              <text x={pad.l - 8} y={yScale(g) + 3} fontSize="10" fill="var(--fg-4)"
                textAnchor="end" fontFamily="Geist Mono">
                {g === 0 ? "0" : g + "K"}
              </text>
            </g>
          ))}
          <path d={areaPath} fill="url(#revG)"/>
          <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d={targetPath} fill="none" stroke="var(--fg-4)" strokeWidth="1.25" strokeDasharray="4 4" opacity="0.7"/>
          {data.map((d, i) => (
            <circle key={i} cx={xPos(i)} cy={yScale(d.revenue)} r={i === data.length - 1 ? 4 : 2.5}
              fill={i === data.length - 1 ? "var(--gold)" : "var(--bg-0)"} stroke="var(--gold)" strokeWidth="1.5"/>
          ))}
          {data.map((d, i) => (
            <text key={i} x={xPos(i)} y={h - 8} fontSize="10" fill="var(--fg-4)"
              textAnchor="middle" fontFamily="Geist Mono">{d.m}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

window.KpiCard = KpiCard;
window.RevenueChart = RevenueChart;
