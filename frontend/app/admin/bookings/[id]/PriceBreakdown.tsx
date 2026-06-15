import { Breakdown } from './pricing';

const lkr = (n: number) => `LKR ${Math.round(n).toLocaleString()}`;

const Row = ({ label, sub, value, color, muted }: {
  label: string; sub?: string; value: string; color?: string; muted?: boolean;
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
    <span style={{ color: muted ? 'var(--text-muted)' : 'inherit' }}>
      {label}
      {sub && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: 6 }}>{sub}</span>}
    </span>
    <span style={{ color }}>{value}</span>
  </div>
);

export default function PriceBreakdown({ b, isOutsourced, commissionAmount }: {
  b: Breakdown; isOutsourced?: boolean; commissionAmount?: number | null;
}) {
  const divider = { borderTop: '1px solid var(--border)', paddingTop: '0.45rem', marginTop: '0.2rem' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem' }}>
      <Row muted label="Daily charge" sub={`${b.days} day${b.days > 1 ? 's' : ''} × ${lkr(b.defaultPricePerDay)}`}
           value={lkr(b.days * b.defaultPricePerDay)} />
      {b.defaultExtraKmCharge > 0 && (
        <Row muted label="Extra KM charge" sub={`${b.defaultExtraKm.toLocaleString()} km × ${lkr(b.defaultPricePerKm)}`}
             value={lkr(b.defaultExtraKmCharge)} />
      )}
      <div style={divider}>
        <Row label="Base Amount" value={lkr(b.base)} />
      </div>
      {b.rateDiscount > 0 && (
        <Row label="Rate Discount" color="#22c55e" value={`− ${lkr(b.rateDiscount)}`} />
      )}
      {b.kmRateDiscount > 0 && (
        <Row label="KM Rate Discount" color="#22c55e" value={`− ${lkr(b.kmRateDiscount)}`} />
      )}
      {b.freeKmBonus > 0 && (
        <Row label="Free KM Bonus" color="#22c55e" value={`− ${lkr(b.freeKmBonus)}`} />
      )}
      {b.additionalDiscount > 0 && (
        <Row label="Additional Discount" color="#22c55e" value={`− ${lkr(b.additionalDiscount)}`} />
      )}
      <div style={{ ...divider, fontWeight: 700, fontSize: '1.05rem', color: 'var(--gold)' }}>
        <Row label="Trip Total" value={lkr(b.tripTotal)} />
      </div>
      {b.driverFee > 0 && (
        <Row muted label="Driver Service" value={`+ ${lkr(b.driverFee)}`} />
      )}
      {b.driverFee > 0 && (
        <div style={{ ...divider, fontWeight: 700, fontSize: '1.05rem', color: 'var(--gold)' }}>
          <Row label="Grand Total" value={lkr(b.grandTotal)} />
        </div>
      )}
      {isOutsourced && commissionAmount != null && (
        <>
          <div style={{ marginTop: '0.35rem' }}>
            <Row label="Commission" color="#ef4444" value={`− ${lkr(Number(commissionAmount))}`} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#22c55e' }}>
            <Row label="Net to Owner" value={lkr(Math.max(0, b.grandTotal - Number(commissionAmount)))} />
          </div>
        </>
      )}
    </div>
  );
}
