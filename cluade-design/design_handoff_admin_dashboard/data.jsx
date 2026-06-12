// Realistic Sri Lankan rent-a-car data
const fmtLkr = (n) => n.toLocaleString("en-LK");

const kpis = [
  {
    label: "Revenue (MTD)",
    value: 2847500,
    prefix: "LKR",
    delta: 12.4,
    deltaDir: "up",
    context: "vs LKR 2.53M last month",
    icon: "Money",
    spark: [22, 28, 25, 32, 30, 38, 42, 40, 45, 52, 48, 56],
  },
  {
    label: "Active Rentals",
    value: 18,
    delta: 3,
    deltaDir: "up",
    deltaUnit: "",
    context: "4 returns due today",
    icon: "KeyRound",
    spark: [12, 14, 13, 15, 16, 14, 18, 17, 18, 19, 18, 18],
  },
  {
    label: "Total Customers",
    value: 142,
    delta: 8.2,
    deltaDir: "up",
    context: "11 new this month",
    icon: "Users",
    spark: [80, 90, 98, 105, 110, 118, 122, 128, 132, 135, 138, 142],
  },
  {
    label: "Fleet Utilisation",
    value: 75,
    suffix: "%",
    delta: 2.1,
    deltaDir: "down",
    context: "18 of 24 vehicles on rent",
    icon: "Gauge",
    spark: [68, 70, 72, 78, 80, 76, 74, 78, 80, 77, 76, 75],
  },
];

// 12 months of revenue data (in 1000s of LKR)
const revenueData = [
  { m: "Jun", revenue: 1820, target: 2000 },
  { m: "Jul", revenue: 2150, target: 2100 },
  { m: "Aug", revenue: 2380, target: 2200 },
  { m: "Sep", revenue: 2090, target: 2300 },
  { m: "Oct", revenue: 2540, target: 2400 },
  { m: "Nov", revenue: 2720, target: 2500 },
  { m: "Dec", revenue: 3180, target: 2600 },
  { m: "Jan", revenue: 2840, target: 2700 },
  { m: "Feb", revenue: 2530, target: 2700 },
  { m: "Mar", revenue: 2680, target: 2800 },
  { m: "Apr", revenue: 2920, target: 2800 },
  { m: "May", revenue: 2847, target: 2900 },
];

const weekly = [
  { d: "Mon", bookings: 4, isToday: false },
  { d: "Tue", bookings: 6, isToday: false },
  { d: "Wed", bookings: 3, isToday: false },
  { d: "Thu", bookings: 7, isToday: false },
  { d: "Fri", bookings: 9, isToday: false },
  { d: "Sat", bookings: 11, isToday: false },
  { d: "Sun", bookings: 8, isToday: true },
];

const fleet = [
  { plate: "CAR-8421", name: "Toyota Aqua", year: "2019 · Hybrid", status: "on-rent", customer: "K. Perera", since: "May 12", rate: 6500 },
  { plate: "CAS-2118", name: "Suzuki WagonR", year: "2021 · Auto", status: "on-rent", customer: "M. Fernando", since: "May 14", rate: 5500 },
  { plate: "CBE-3344", name: "Honda Vezel", year: "2018 · Hybrid", status: "available", customer: "—", since: "—", rate: 9500 },
  { plate: "CAU-7790", name: "Toyota Premio", year: "2017 · Auto", status: "overdue", customer: "S. Jayasinghe", since: "May 9", rate: 8500 },
  { plate: "CAR-9012", name: "Suzuki Swift", year: "2020 · Auto", status: "on-rent", customer: "R. de Silva", since: "May 13", rate: 6000 },
  { plate: "CBA-1567", name: "Toyota Axio", year: "2018 · Hybrid", status: "service", customer: "—", since: "—", rate: 7500 },
];

// Detailed fleet for Vehicles page
const vehicles = [
  { plate: "CAR-8421", make: "Toyota", model: "Aqua", trim: "S Hybrid · 1.5L", year: 2019, category: "Hybrid", transmission: "Auto", fuel: "Hybrid", seats: 5, status: "on-rent", featured: true, perDay: 6500, perKm: 25, odometer: 84520, hue: 200 },
  { plate: "CBE-3344", make: "Honda", model: "Vezel", trim: "RS Sensing · Hybrid", year: 2018, category: "SUV", transmission: "Auto", fuel: "Hybrid", seats: 5, status: "available", featured: true, perDay: 9500, perKm: 35, odometer: 67890, hue: 25 },
  { plate: "CAS-2118", make: "Suzuki", model: "WagonR", trim: "Stingray · Auto", year: 2021, category: "Compact", transmission: "Auto", fuel: "Petrol", seats: 5, status: "on-rent", featured: false, perDay: 5500, perKm: 22, odometer: 32140, hue: 145 },
  { plate: "CAU-7790", make: "Toyota", model: "Premio", trim: "F-EX · 1.5L", year: 2017, category: "Sedan", transmission: "Auto", fuel: "Petrol", seats: 5, status: "overdue", featured: false, perDay: 8500, perKm: 30, odometer: 142300, hue: 0 },
  { plate: "CAR-9012", make: "Suzuki", model: "Swift", trim: "RS · 1.2L", year: 2020, category: "Compact", transmission: "Auto", fuel: "Petrol", seats: 5, status: "on-rent", featured: false, perDay: 6000, perKm: 24, odometer: 45670, hue: 50 },
  { plate: "CBA-1567", make: "Toyota", model: "Axio", trim: "G · Hybrid 1.5L", year: 2018, category: "Sedan", transmission: "Auto", fuel: "Hybrid", seats: 5, status: "service", featured: false, perDay: 7500, perKm: 28, odometer: 98430, hue: 220 },
  { plate: "CBM-4502", make: "Nissan", model: "Caravan", trim: "GX · Long Body", year: 2016, category: "Van", transmission: "Manual", fuel: "Diesel", seats: 12, status: "available", featured: true, perDay: 14000, perKm: 45, odometer: 215600, hue: 260 },
  { plate: "CAQ-6618", make: "Honda", model: "Civic", trim: "EX · 1.5L Turbo", year: 2020, category: "Sedan", transmission: "Auto", fuel: "Petrol", seats: 5, status: "available", featured: false, perDay: 11000, perKm: 38, odometer: 41200, hue: 330 },
];

const bookings = [
  { name: "Nadeesha Wijesinghe", initials: "NW", vehicle: "Toyota Aqua · 3 days", amount: 19500, status: "Confirmed", time: "10 min ago" },
  { name: "Roshan Bandara", initials: "RB", vehicle: "Honda Vezel · 7 days", amount: 66500, status: "Pending", time: "42 min ago" },
  { name: "Anushka Karunaratne", initials: "AK", vehicle: "Suzuki Swift · 2 days", amount: 12000, status: "Confirmed", time: "1h ago" },
  { name: "Dilshan Pereira", initials: "DP", vehicle: "Toyota Premio · 5 days", amount: 42500, status: "Confirmed", time: "3h ago" },
];

const utilisation = [
  { label: "On rent", value: 18, color: "var(--info)" },
  { label: "Available", value: 4, color: "var(--pos)" },
  { label: "In service", value: 1, color: "var(--warn)" },
  { label: "Overdue", value: 1, color: "var(--neg)" },
];

const tasks = [
  { title: "Review 3 new booking requests", meta: "Bookings · awaiting approval", tag: "urgent", tagLabel: "Urgent", done: false },
  { title: "Approve insurance renewal — Toyota Premio", meta: "Expires May 22", tag: "today", tagLabel: "Today", done: false },
  { title: "Update odometer readings for returned fleet", meta: "2 vehicles pending", tag: null, done: false },
  { title: "Send pending invoices via WhatsApp", meta: "4 invoices · LKR 87,500 total", tag: null, done: false },
  { title: "Schedule service for CBA-1567", meta: "Due in 1,200 km", tag: null, done: true },
];

window.AppData = { kpis, revenueData, weekly, fleet, vehicles, bookings, utilisation, tasks, fmtLkr };

/* ===== Reports data ===== */
window.AppData.reports = {
  period: "May 2026",
  summary: [
    { label: "Gross Revenue", value: 2847500, prefix: "LKR", delta: 12.4, deltaDir: "up", context: "vs LKR 2.53M prior period" },
    { label: "Net Profit", value: 1182400, prefix: "LKR", delta: 8.7, deltaDir: "up", context: "41.5% margin · +2.1pt" },
    { label: "Avg Booking Value", value: 28475, prefix: "LKR", delta: 4.2, deltaDir: "up", context: "across 100 bookings" },
    { label: "Fleet Utilisation", value: 75.2, suffix: "%", delta: 2.1, deltaDir: "down", context: "18 of 24 vehicles active" },
  ],
  byCategory: [
    { label: "Sedan",   value: 980000, color: "var(--gold)" },
    { label: "Hybrid",  value: 720000, color: "var(--info)" },
    { label: "SUV",     value: 615000, color: "var(--pos)" },
    { label: "Compact", value: 320000, color: "var(--warn)" },
    { label: "Van",     value: 212500, color: "var(--neg)" },
  ],
  topVehicles: [
    { plate: "CBE-3344", name: "Honda Vezel",   category: "SUV",     bookings: 14, days: 31, revenue: 294500, util: 100, hue: 25 },
    { plate: "CBM-4502", name: "Nissan Caravan",category: "Van",     bookings:  6, days: 22, revenue: 308000, util: 71,  hue: 260 },
    { plate: "CAQ-6618", name: "Honda Civic",   category: "Sedan",   bookings:  9, days: 24, revenue: 264000, util: 77,  hue: 330 },
    { plate: "CAR-8421", name: "Toyota Aqua",   category: "Hybrid",  bookings: 11, days: 28, revenue: 182000, util: 90,  hue: 200 },
    { plate: "CAU-7790", name: "Toyota Premio", category: "Sedan",   bookings:  8, days: 26, revenue: 221000, util: 84,  hue: 0 },
    { plate: "CBA-1567", name: "Toyota Axio",   category: "Sedan",   bookings:  7, days: 20, revenue: 150000, util: 65,  hue: 220 },
    { plate: "CAR-9012", name: "Suzuki Swift",  category: "Compact", bookings: 12, days: 26, revenue: 156000, util: 84,  hue: 50 },
    { plate: "CAS-2118", name: "Suzuki WagonR", category: "Compact", bookings:  9, days: 21, revenue: 115500, util: 68,  hue: 145 },
  ],
  sources: [
    { label: "Direct (Website)",  value: 42, color: "var(--gold)" },
    { label: "WhatsApp / Phone",  value: 31, color: "var(--info)" },
    { label: "Booking.com",       value: 16, color: "var(--pos)" },
    { label: "Walk-in",           value: 11, color: "var(--warn)" },
  ],
  weeklyTrend: [
    { w: "W10", rev: 540, bk: 18 }, { w: "W11", rev: 612, bk: 22 },
    { w: "W12", rev: 580, bk: 20 }, { w: "W13", rev: 690, bk: 24 },
    { w: "W14", rev: 720, bk: 26 }, { w: "W15", rev: 650, bk: 23 },
    { w: "W16", rev: 780, bk: 28 }, { w: "W17", rev: 820, bk: 29 },
    { w: "W18", rev: 760, bk: 27 }, { w: "W19", rev: 880, bk: 31 },
    { w: "W20", rev: 920, bk: 33 }, { w: "W21", rev: 847, bk: 30 },
  ],
  customers: {
    new: 11,
    returning: 31,
    total: 142,
    topSpenders: [
      { initials: "RB", name: "Roshan Bandara",      bookings: 4, spent: 187500 },
      { initials: "DP", name: "Dilshan Pereira",     bookings: 3, spent: 142000 },
      { initials: "NW", name: "Nadeesha Wijesinghe", bookings: 3, spent: 98500 },
      { initials: "AK", name: "Anushka Karunaratne", bookings: 2, spent: 64000 },
    ],
  },
  savedReports: [
    { name: "Monthly P&L Statement",         icon: "Money",    schedule: "1st of every month",     lastRun: "May 1" },
    { name: "Vehicle Performance · Q2",      icon: "Car",      schedule: "Weekly · Mondays 8 AM",  lastRun: "May 20" },
    { name: "Customer LTV Cohorts",          icon: "Users",    schedule: "Monthly · 15th",         lastRun: "May 15" },
    { name: "Maintenance & Fuel Costs",      icon: "Wrench",   schedule: "Manual",                 lastRun: "May 11" },
    { name: "Tax-ready Booking Ledger",      icon: "Invoice",  schedule: "Quarterly",              lastRun: "Mar 31" },
  ],
};
