export function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ₹12,345.50 — always two decimals, sign handled by the caller.
export function formatMoney(n) {
  const v = Math.abs(Number(n) || 0).toFixed(2);
  return `₹${numberWithCommas(v)}`;
}

// "10 Jun" / "10 Jun 2025" when not the current year.
export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-IN', opts);
}
