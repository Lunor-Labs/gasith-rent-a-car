const { useState: useStateB } = React;

function WeeklyBookings() {
  const data = AppData.weekly;
  const max = Math.max(...data.map(d => d.bookings));
  const total = data.reduce((s, d) => s + d.bookings, 0);
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Weekly Bookings</div>
          <div className="card-sub">Last 7 days</div>
        </div>
        <span className="delta pos"><Icons.ArrowUp size={11}/>22%</span>
      </div>
      <div className="chart-stats" style={{paddingBottom:8}}>
        <div className="chart-stat-main mono">{total}</div>
        <span className="dim" style={{fontSize:12}}>bookings this week</span>
      </div>
      <div className="card-body" style={{paddingTop:8}}>
        <div className="bars">
          {data.map((d) => (
            <div className="bar-col" key={d.d}>
              <div className={`bar ${d.isToday ? "" : "muted"}`}
                style={{ height: `${(d.bookings / max) * 150}px` }}
                title={`${d.d}: ${d.bookings}`}/>
              <div className="bar-label">{d.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FleetDonut() {
  const items = AppData.utilisation;
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = 52, cx = 60, cy = 60, c = 2 * Math.PI * r;
  let offset = 0;
  const segs = items.map((it, i) => {
    const frac = it.value / total;
    const dash = c * frac;
    const seg = { ...it, dash, offset, gap: c - dash };
    offset += dash;
    return seg;
  });
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Fleet Status</div>
          <div className="card-sub">24 vehicles total</div>
        </div>
        <button className="link">View all <Icons.ChevronRight size={12}/></button>
      </div>
      <div className="donut-wrap">
        <div style={{position:"relative", width:120, height:120, flex:"none"}}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{transform:"rotate(-90deg)"}}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-2)" strokeWidth="14"/>
            {segs.map((s, i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={s.color} strokeWidth="14"
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"/>
            ))}
          </svg>
          <div className="donut-center">
            <div>
              <div className="donut-pct">75%</div>
              <div className="donut-label">Utilised</div>
            </div>
          </div>
        </div>
        <div className="legend-stack">
          {items.map(it => (
            <div className="row" key={it.label}>
              <span className="swatch" style={{background:it.color}}/>
              {it.label}
              <b>{it.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FleetTable() {
  return (
    <div className="card" style={{overflow:"hidden"}}>
      <div className="card-head">
        <div>
          <div className="card-title">Fleet Activity</div>
          <div className="card-sub">Latest status across your vehicles</div>
        </div>
        <div style={{display:"flex", gap:8}}>
          <button className="btn btn-ghost"><Icons.Filter size={13}/>Filter</button>
          <button className="link">View all <Icons.ChevronRight size={12}/></button>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Status</th>
            <th>Customer</th>
            <th>Out since</th>
            <th style={{textAlign:"right"}}>Daily rate</th>
          </tr>
        </thead>
        <tbody>
          {AppData.fleet.map(v => (
            <tr key={v.plate}>
              <td>
                <div className="vehicle-cell">
                  <div>
                    <div className="vehicle-name">{v.name}</div>
                    <div className="vehicle-sub">{v.year}</div>
                  </div>
                  <span className="plate-tag mono">{v.plate}</span>
                </div>
              </td>
              <td>
                <span className={`status-pill ${v.status}`}>
                  <span className="pip"/>
                  {v.status === "on-rent" ? "On rent" :
                   v.status === "available" ? "Available" :
                   v.status === "service" ? "In service" : "Overdue"}
                </span>
              </td>
              <td>{v.customer}</td>
              <td className="mono dim">{v.since}</td>
              <td className="mono" style={{textAlign:"right"}}>
                <span className="dim" style={{fontSize:11, marginRight:3}}>LKR</span>
                {AppData.fmtLkr(v.rate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentBookings() {
  return (
    <div className="card" style={{overflow:"hidden"}}>
      <div className="card-head">
        <div>
          <div className="card-title">Recent Bookings</div>
          <div className="card-sub">Latest customer requests</div>
        </div>
        <button className="link">View all <Icons.ChevronRight size={12}/></button>
      </div>
      <div>
        {AppData.bookings.map(b => (
          <div className="list-row" key={b.name}>
            <div className="cust-av">{b.initials}</div>
            <div className="list-main">
              <div className="list-title">{b.name}</div>
              <div className="list-sub">
                <span>{b.vehicle}</span>
                <span style={{color:"var(--fg-4)"}}>·</span>
                <span style={{color: b.status === "Confirmed" ? "var(--pos)" : "var(--warn)"}}>
                  {b.status}
                </span>
              </div>
            </div>
            <div>
              <div className="list-amount"><span className="ccy">LKR</span>{AppData.fmtLkr(b.amount)}</div>
              <div className="list-amount-sub">{b.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickTasks() {
  const [items, setItems] = useStateB(AppData.tasks);
  const toggle = (i) => setItems(items.map((t, j) => j === i ? { ...t, done: !t.done } : t));
  return (
    <div className="card" style={{overflow:"hidden"}}>
      <div className="card-head">
        <div>
          <div className="card-title">Quick Tasks</div>
          <div className="card-sub">{items.filter(t => !t.done).length} pending</div>
        </div>
        <button className="link">Add task <Icons.Plus size={12}/></button>
      </div>
      <div>
        {items.map((t, i) => (
          <div className={`task ${t.done ? "done" : ""}`} key={i}>
            <div className={`checkbox ${t.done ? "checked" : ""}`} onClick={() => toggle(i)}>
              {t.done && <Icons.Check size={11}/>}
            </div>
            <div className="task-body">
              <div className="task-title">{t.title}</div>
              <div className="task-meta">
                <span>{t.meta}</span>
                {t.tag && <span className={`tag ${t.tag}`}>{t.tagLabel}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.WeeklyBookings = WeeklyBookings;
window.FleetDonut = FleetDonut;
window.FleetTable = FleetTable;
window.RecentBookings = RecentBookings;
window.QuickTasks = QuickTasks;
