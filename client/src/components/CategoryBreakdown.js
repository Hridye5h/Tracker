import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { formatMoney } from '../utils/format';
import { iconFor } from '../utils/categories';

// Where the money goes: horizontal bars per expense category, powered by the
// server-side aggregation pipeline (/transactions/summary).
export const CategoryBreakdown = () => {
  const { summary } = useContext(GlobalContext);

  // Transfers are money moved, not money spent — keep them out of the chart.
  const rows = (summary ? summary.byCategory : [])
    .filter((r) => r._id.type === 'expense' && r._id.category !== 'Transfer')
    .map((r) => ({ category: r._id.category, total: r.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  if (rows.length === 0) return null;

  const max = rows[0].total;

  return (
    <section className="card">
      <div className="card-head">
        <h3>Spending by category</h3>
      </div>
      <ul className="breakdown">
        {rows.map((r) => (
          <li key={r.category} className="breakdown-row">
            <div className="breakdown-top">
              <span className="breakdown-label">{iconFor(r.category)} {r.category}</span>
              <span className="breakdown-value">{formatMoney(r.total)}</span>
            </div>
            <div className="breakdown-track">
              <div className="breakdown-fill" style={{ width: `${Math.max(4, (r.total / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
