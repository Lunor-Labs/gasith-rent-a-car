const { useState: useStateV, useMemo: useMemoV } = React;

function VehicleSilhouette({ size = 84 }) {
  // Side-view car silhouette — designerly placeholder
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 200 100" fill="currentColor">
      <path d="M10 68c0-3 2-5 5-5h3l9-16a16 16 0 0 1 13-7h62a16 16 0 0 1 13 7l11 16 19 4a14 14 0 0 1 11 14v5c0 3-2 5-5 5h-11a16 16 0 0 0-31 0H77a16 16 0 0 0-31 0H15c-3 0-5-2-5-5V68zm45-21l-7 16h42V40H52a4 4 0 0 0-4 3l-3 4m51-7v23h36l-9-16a10 10 0 0 0-9-7h-18z"/>
      <ellipse cx="61" cy="80" rx="11" ry="11" fill="oklch(0 0 0 / 0.45)"/>
      <circle cx="61" cy="80" r="5" fill="oklch(1 0 0 / 0.5)"/>
      <ellipse cx="141" cy="80" rx="11" ry="11" fill="oklch(0 0 0 / 0.45)"/>
      <circle cx="141" cy="80" r="5" fill="oklch(1 0 0 / 0.5)"/>
    </svg>
  );
}

function statusLabel(s) {
  return s === "on-rent" ? "On rent" :
         s === "available" ? "Available" :
         s === "service" ? "In service" : "Overdue";
}

function Spec({ icon, value, sub }) {
  const Ico = Icons[icon];
  return (
    <div className="spec">
      <Ico className="ico" size={16}/>
      <div className="v">{value}{sub && <span className="sub"> {sub}</span>}</div>
    </div>
  );
}

function VehicleCard({ v }) {
  return (
    <div className="veh-card" style={{ "--veh-hue": v.hue }}>
      <div className="veh-image">
        <div className="veh-image-top">
          <span className="glass-chip">{v.category}</span>
          {v.featured
            ? <span className="featured-ribbon"><Icons.Star size={11}/>Featured</span>
            : <span className={`status-pill ${v.status}`}><span className="pip"/>{statusLabel(v.status)}</span>}
        </div>
        {v.image
          ? <img className="veh-photo" src={v.image} alt={`${v.make} ${v.model}`}/>
          : <div className="veh-silhouette"><VehicleSilhouette size={200}/></div>}
        {v.featured && (
          <div style={{ position: "absolute", left: 12, bottom: 12, zIndex: 2 }}>
            <span className={`status-pill ${v.status}`}><span className="pip"/>{statusLabel(v.status)}</span>
          </div>
        )}
      </div>

      <div className="veh-body">
        <div className="veh-head">
          <div className="veh-title-block">
            <div className="veh-title">{v.make} {v.model}</div>
            <div className="veh-trim">{v.trim}</div>
          </div>
          <span className="plate-tag mono">{v.plate}</span>
        </div>

        <div className="veh-specs">
          <Spec icon="Calendar" value={v.year}/>
          <Spec icon="Cog" value={v.transmission}/>
          <Spec icon="Fuel" value={v.fuel}/>
          <Spec icon="Seat" value={v.seats}/>
        </div>

        <div className="veh-price">
          <div className="primary">
            <span className="ccy">LKR</span>
            <span className="num">{AppData.fmtLkr(v.perDay)}</span>
            <span className="per">/ day</span>
          </div>
          <div className="secondary">
            <span className="ccy">LKR</span>
            <span>{v.perKm}</span>
            <span className="lab">/ km</span>
          </div>
        </div>

        <div className="veh-actions">
          <button className="btn btn-primary"><Icons.Pencil size={13}/>Manage</button>
          <button className="iconbtn-sm" title="Preview public listing"><Icons.Eye size={15}/></button>
          <button className="iconbtn-sm" title="Hide from site"><Icons.EyeOff size={15}/></button>
          <button className="iconbtn-sm" title="More"><Icons.More size={15}/></button>
        </div>

        <div className="veh-foot">
          <span className="odo">{(v.odometer / 1000).toFixed(1)}K km</span>
          <span className="dot"/>
          <span>Last serviced 6 weeks ago</span>
        </div>
      </div>
    </div>
  );
}

function VehicleRow({ v }) {
  return (
    <div className="veh-row" style={{ "--veh-hue": v.hue }}>
      <div className="veh-thumb">
        <Icons.CarSilhouette size={28}/>
      </div>
      <div className="veh-name-cell">
        <div className="name">
          {v.make} {v.model}
          {v.featured && <Icons.Star size={12} style={{ color: "var(--gold)" }}/>}
        </div>
        <div className="meta">{v.year} · {v.transmission} · {v.fuel} · {v.seats} seats</div>
      </div>
      <span className="plate-tag mono" style={{ justifySelf: "start" }}>{v.plate}</span>
      <span className={`status-pill ${v.status}`} style={{ justifySelf: "start" }}>
        <span className="pip"/>{statusLabel(v.status)}
      </span>
      <span className="rate">
        <span className="ccy">LKR</span>{AppData.fmtLkr(v.perDay)}
        <span className="sub">per day</span>
      </span>
      <span className="rate">
        {(v.odometer / 1000).toFixed(1)}K
        <span className="sub">km</span>
      </span>
      <div className="veh-row-actions">
        <button className="iconbtn-sm" title="Edit"><Icons.Pencil size={13}/></button>
        <button className="iconbtn-sm" title="View"><Icons.Eye size={13}/></button>
        <button className="iconbtn-sm danger" title="Delete"><Icons.Trash size={13}/></button>
      </div>
    </div>
  );
}

function VehiclesPage() {
  const [filter, setFilter] = useStateV("all");
  const [view, setView] = useStateV("grid");
  const [query, setQuery] = useStateV("");
  const [sort, setSort] = useStateV("featured");

  const all = AppData.vehicles;
  const counts = useMemoV(() => ({
    all: all.length,
    available: all.filter(v => v.status === "available").length,
    "on-rent": all.filter(v => v.status === "on-rent").length,
    service: all.filter(v => v.status === "service").length,
    overdue: all.filter(v => v.status === "overdue").length,
    featured: all.filter(v => v.featured).length,
  }), [all]);

  const filtered = useMemoV(() => {
    let r = all;
    if (filter !== "all") {
      r = filter === "featured" ? r.filter(v => v.featured) : r.filter(v => v.status === filter);
    }
    if (query) {
      const q = query.toLowerCase();
      r = r.filter(v =>
        `${v.make} ${v.model} ${v.plate}`.toLowerCase().includes(q));
    }
    if (sort === "featured") r = [...r].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    if (sort === "rate-high") r = [...r].sort((a, b) => b.perDay - a.perDay);
    if (sort === "rate-low") r = [...r].sort((a, b) => a.perDay - b.perDay);
    if (sort === "newest") r = [...r].sort((a, b) => b.year - a.year);
    return r;
  }, [all, filter, query, sort]);

  const chips = [
    { id: "all", label: "All" },
    { id: "available", label: "Available" },
    { id: "on-rent", label: "On rent" },
    { id: "service", label: "In service" },
    { id: "overdue", label: "Overdue" },
    { id: "featured", label: "Featured", icon: "Star" },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Vehicles</h1>
          <div className="page-sub">{counts.all} in fleet · {counts.available} available · {counts["on-rent"]} on rent</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost"><Icons.Filter size={13}/>More filters</button>
          <button className="btn btn-primary"><Icons.Plus size={14}/>Add Vehicle</button>
        </div>
      </div>

      <div className="vehicles-toolbar">
        <div className="filter-chips">
          {chips.map(c => {
            const Ico = c.icon ? Icons[c.icon] : null;
            return (
              <button key={c.id}
                className={`chip ${filter === c.id ? "active" : ""}`}
                onClick={() => setFilter(c.id)}>
                {Ico && <Ico size={12}/>}
                {c.label}
                <span className="count">{counts[c.id]}</span>
              </button>
            );
          })}
        </div>

        <div className="search" style={{ width: 240 }}>
          <Icons.Search size={14}/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search make, model, plate…"/>
        </div>

        <select className="btn btn-ghost" style={{ height: 34, padding: "0 10px", appearance: "none", paddingRight: 26 }}
          value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="featured">Sort: Featured first</option>
          <option value="rate-high">Sort: Rate (high → low)</option>
          <option value="rate-low">Sort: Rate (low → high)</option>
          <option value="newest">Sort: Newest year</option>
        </select>

        <div className="view-toggle">
          <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} title="Grid view">
            <Icons.Grid size={14}/>
          </button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="List view">
            <Icons.List size={14}/>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: "60px 20px", textAlign: "center",
          background: "var(--bg-1)",
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-lg)",
          color: "var(--fg-3)", fontSize: 13
        }}>
          No vehicles match your filters.
        </div>
      ) : view === "grid" ? (
        <div className="veh-grid">
          {filtered.map(v => <VehicleCard key={v.plate} v={v}/>)}
        </div>
      ) : (
        <div className="veh-list">
          <div className="veh-list-head">
            <span></span>
            <span>Vehicle</span>
            <span>Plate</span>
            <span>Status</span>
            <span style={{ textAlign: "left" }}>Rate</span>
            <span>Odometer</span>
            <span></span>
          </div>
          {filtered.map(v => <VehicleRow key={v.plate} v={v}/>)}
        </div>
      )}
    </>
  );
}

window.VehiclesPage = VehiclesPage;
