// Single source of truth for the booking price breakdown math.
// Used by the live preview (buildBreakdown) and the completed summary
// (breakdownFromBooking). All discount components clamp at 0 — the admin
// only ever lowers rates or raises free KM.

export type Breakdown = {
  days: number;
  defaultPricePerDay: number;
  defaultExtraKm: number;
  defaultPricePerKm: number;
  defaultExtraKmCharge: number;
  base: number;
  rateDiscount: number;
  kmRateDiscount: number;
  freeKmBonus: number;
  additionalDiscount: number;
  tripTotal: number;   // final amount excluding driver fee
  driverFee: number;
  grandTotal: number;  // tripTotal + driver fee
};

export type BreakdownInput = {
  days: number;
  totalKm: number;
  defaultPricePerDay: number;
  pricePerDay: number;
  defaultPricePerKm: number;
  pricePerKm: number;
  defaultFreeKm: number;
  freeKm: number;
  additionalDiscount: number;
  driverFee: number;
};

export function buildBreakdown(i: BreakdownInput): Breakdown {
  const defaultExtraKm = Math.max(0, i.totalKm - i.defaultFreeKm);
  const extraKm = Math.max(0, i.totalKm - i.freeKm);
  const defaultExtraKmCharge = defaultExtraKm * i.defaultPricePerKm;
  const base = i.days * i.defaultPricePerDay + defaultExtraKmCharge;

  const rateDiscount = Math.max(0, (i.defaultPricePerDay - i.pricePerDay) * i.days);
  const kmRateDiscount = Math.max(0, (i.defaultPricePerKm - i.pricePerKm) * extraKm);
  const freeKmBonus = Math.max(0, (i.freeKm - i.defaultFreeKm) * i.defaultPricePerKm);
  const totalDiscount = rateDiscount + kmRateDiscount + freeKmBonus + i.additionalDiscount;

  const tripTotal = Math.max(0, base - totalDiscount);
  return {
    days: i.days,
    defaultPricePerDay: i.defaultPricePerDay,
    defaultExtraKm,
    defaultPricePerKm: i.defaultPricePerKm,
    defaultExtraKmCharge,
    base,
    rateDiscount,
    kmRateDiscount,
    freeKmBonus,
    additionalDiscount: i.additionalDiscount,
    tripTotal,
    driverFee: i.driverFee,
    grandTotal: tripTotal + i.driverFee,
  };
}

function toDate(v: any): Date {
  if (!v) return new Date();
  if (typeof v === 'string') return new Date(v);
  if (v._seconds) return new Date(v._seconds * 1000);
  return new Date(v);
}

export function bookingDays(b: any): number {
  const start = toDate(b.startDate);
  const end = toDate(b.dueDate || b.endDate);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

// For a completed booking, use the STORED base_amount and final_amount as the
// authoritative totals (so the card always reconciles to what was billed) and
// derive the three discount lines for display.
export function breakdownFromBooking(b: any): Breakdown {
  const days = bookingDays(b);
  const pricePerKm = b.pricePerKm || 0;
  const defaultPricePerKm = b.defaultPricePerKm ?? pricePerKm;
  const pricePerDay = b.pricePerDay || 0;
  const defaultPricePerDay = b.defaultPricePerDay || pricePerDay;
  const freeKm = b.freeKm ?? 0;
  const defaultFreeKm = b.defaultFreeKm ?? freeKm;
  const totalKm = b.totalKm || 0;
  const extraKm = b.extraKm ?? Math.max(0, totalKm - freeKm);
  const defaultExtraKm = Math.max(0, totalKm - defaultFreeKm);

  const base = b.baseAmount || 0;
  const defaultExtraKmCharge = Math.max(0, base - days * defaultPricePerDay);
  const rateDiscount = Math.max(0, (defaultPricePerDay - pricePerDay) * days);
  const kmRateDiscount = Math.max(0, (defaultPricePerKm - pricePerKm) * extraKm);
  const freeKmBonus = Math.max(0, (freeKm - defaultFreeKm) * defaultPricePerKm);
  const additionalDiscount = b.additionalDiscount || 0;
  const driverFee = Number(b.driverFee) || 0;
  const grandTotal = b.finalAmount || 0;

  return {
    days,
    defaultPricePerDay,
    defaultExtraKm,
    defaultPricePerKm,
    defaultExtraKmCharge,
    base,
    rateDiscount,
    kmRateDiscount,
    freeKmBonus,
    additionalDiscount,
    tripTotal: Math.max(0, grandTotal - driverFee),
    driverFee,
    grandTotal,
  };
}
