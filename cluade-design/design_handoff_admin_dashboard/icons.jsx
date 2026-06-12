// Lucide-style 1.5px stroke line icons
const Ico = ({ d, size = 16, fill = "none", children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    {...p}>
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  Dashboard: (p) => <Ico {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></Ico>,
  Car: (p) => <Ico {...p}><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><circle cx="7.5" cy="17" r="1.2"/><circle cx="16.5" cy="17" r="1.2"/></Ico>,
  Users: (p) => <Ico {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-2.8 3-4.5 5.5-4.5s4.9 1.7 5.5 4.5"/><circle cx="17" cy="8.5" r="2.5"/><path d="M16 14.5c2 0 4 1.2 4.5 3"/></Ico>,
  Booking: (p) => <Ico {...p}><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/><circle cx="12" cy="14" r="1.2" fill="currentColor"/></Ico>,
  Invoice: (p) => <Ico {...p}><path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4M9 13h6M9 17h4"/></Ico>,
  Reports: (p) => <Ico {...p}><path d="M3 20h18"/><path d="M6 17V11M10 17V8M14 17v-4M18 17V5"/></Ico>,
  Settings: (p) => <Ico {...p}><circle cx="12" cy="12" r="2.5"/><path d="M19.5 12a7.5 7.5 0 0 0-.1-1.3l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.3-1.3L14.3 3h-4l-.5 2.4a7.5 7.5 0 0 0-2.3 1.3l-2.3-.9-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2.6l-2 1.5 2 3.4 2.3-.9c.7.5 1.5 1 2.3 1.3l.5 2.4h4l.5-2.4a7.5 7.5 0 0 0 2.3-1.3l2.3.9 2-3.4-2-1.5c0-.4.1-.9.1-1.3z"/></Ico>,
  Search: (p) => <Ico {...p}><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></Ico>,
  Bell: (p) => <Ico {...p}><path d="M6 8a6 6 0 0 1 12 0v4l1.5 3h-15L6 12V8z"/><path d="M10 19a2 2 0 0 0 4 0"/></Ico>,
  Globe: (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.8 4 6 4 9s-1.5 6.2-4 9c-2.5-2.8-4-6-4-9s1.5-6.2 4-9z"/></Ico>,
  Plus: (p) => <Ico {...p}><path d="M12 5v14M5 12h14"/></Ico>,
  ExternalLink: (p) => <Ico {...p}><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></Ico>,
  ArrowUp: (p) => <Ico {...p}><path d="M12 19V5M5 12l7-7 7 7"/></Ico>,
  ArrowDown: (p) => <Ico {...p}><path d="M12 5v14M19 12l-7 7-7-7"/></Ico>,
  ArrowRight: (p) => <Ico {...p}><path d="M5 12h14M13 5l7 7-7 7"/></Ico>,
  Money: (p) => <Ico {...p}><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/></Ico>,
  KeyRound: (p) => <Ico {...p}><circle cx="8" cy="15" r="3.5"/><path d="M11 13l9-9M15.5 5.5l3 3M18 8l2-2"/></Ico>,
  Wrench: (p) => <Ico {...p}><path d="M14.7 6.3a4 4 0 0 1 5 5L17 14l-7 7-3-3 7-7-2.7-2.7z"/></Ico>,
  Check: (p) => <Ico {...p}><path d="M5 12l5 5L20 7"/></Ico>,
  Clock: (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ico>,
  More: (p) => <Ico {...p}><circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/></Ico>,
  Gauge: (p) => <Ico {...p}><path d="M12 14l4-4"/><circle cx="12" cy="14" r="8"/><path d="M5 14a7 7 0 0 1 14 0"/></Ico>,
  MapPin: (p) => <Ico {...p}><path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></Ico>,
  Fuel: (p) => <Ico {...p}><rect x="4" y="3" width="10" height="18" rx="1.5"/><path d="M4 10h10"/><path d="M14 8l3 2v8a2 2 0 0 0 2 2 2 2 0 0 0 2-2v-9l-3-3"/></Ico>,
  ChevronRight: (p) => <Ico {...p}><path d="M9 6l6 6-6 6"/></Ico>,
  Filter: (p) => <Ico {...p}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5z"/></Ico>,
  Calendar: (p) => <Ico {...p}><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/></Ico>,
  Sun: (p) => <Ico {...p}><circle cx="12" cy="12" r="3.8"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></Ico>,
  Moon: (p) => <Ico {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></Ico>,
  Star: (p) => <Ico {...p} fill="currentColor"><path d="M12 3.5l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z"/></Ico>,
  StarLine: (p) => <Ico {...p}><path d="M12 3.5l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z"/></Ico>,
  Eye: (p) => <Ico {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Ico>,
  EyeOff: (p) => <Ico {...p}><path d="M3 3l18 18"/><path d="M10.6 6.1c.4-.1.9-.1 1.4-.1 6.5 0 10 7 10 7a18 18 0 0 1-3 4M6.7 6.7C3.5 8.9 2 12 2 12s3.5 7 10 7c2 0 3.6-.6 5-1.4"/><path d="M9.5 9.5a3.5 3.5 0 0 0 5 5"/></Ico>,
  Trash: (p) => <Ico {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14M10 11v6M14 11v6"/></Ico>,
  Pencil: (p) => <Ico {...p}><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M14 6l4 4"/></Ico>,
  Grid: (p) => <Ico {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></Ico>,
  List: (p) => <Ico {...p}><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></Ico>,
  Sort: (p) => <Ico {...p}><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/></Ico>,
  Seat: (p) => <Ico {...p}><path d="M5 18h14"/><path d="M7 18V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10"/><path d="M9 11h6"/></Ico>,
  Cog: (p) => <Ico {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></Ico>,
  CarSilhouette: (p) => <Ico {...p} fill="currentColor" strokeWidth="0">
    <path d="M19.5 13.5h-15v-2l1.6-3.8A2 2 0 0 1 7.9 6.5h8.2a2 2 0 0 1 1.85 1.25l1.55 3.75v2zm-12.5 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm10 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
    <path d="M3 14h18v3a1 1 0 0 1-1 1h-1.5a2 2 0 0 0-4 0H10.5a2 2 0 0 0-4 0H5a1 1 0 0 1-1-1v-3z"/>
  </Ico>,
};

window.Icons = Icons;
